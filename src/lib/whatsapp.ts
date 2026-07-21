// src/lib/whatsapp.ts
// WhatsApp Cloud API client + conversation tracking
//
// Setup (one-time):
//   1. Get Phone Number ID from Meta Business Suite
//   2. Get System User Access Token (permanent) from Meta
//   3. Set env vars: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
//   4. Set webhook verify token: WHATSAPP_VERIFY_TOKEN (any random string you choose)
//   5. Configure webhook in Meta dashboard pointing to /api/whatsapp/webhook

import { supabase as supabaseAdmin, supabaseUntyped } from './supabase'

const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WA_API_VERSION = process.env.WHATSAPP_API_VERSION ?? 'v21.0'

const WA_BASE = `https://graph.facebook.com/${WA_API_VERSION}`

// خدمة المارد (Baileys على Railway) — القناة الأساسية للإرسال
const WA_SERVICE_URL = process.env.WA_SERVICE_URL
const WA_SERVICE_SECRET = process.env.WA_SERVICE_SECRET ?? ''

export function isWhatsAppConfigured(): boolean {
  return !!(WA_PHONE_ID && WA_TOKEN)
}

// ============================================================================
// Types
// ============================================================================

export interface WhatsAppSendResult {
  ok: boolean
  wa_message_id?: string
  error?: string
}

export interface SendTextParams {
  to: string // Phone number with country code, no + (e.g., "201002229982")
  /**
   * الـ JID الأصلي للمحادثة (`xxx@s.whatsapp.net` أو `xxx@lid`).
   * لما يبقى موجود بيتقدّم على `to` — لأن واتساب بيبعت مُعرّف مخفي (LID)
   * بدل الرقم، ومفيش طريقة نرجّع منه رقم حقيقي. الرد لازم يروح لنفس الـ JID.
   */
  jid?: string
  body: string
  conversationId?: string
  agentName?: string
  /**
   * رقم المارد اللي هيخرج منه الرد (`201002229982` مثلًا).
   * لو فاضي، الخدمة بتاخد أول رقم متصل — وده غلط لما يبقى
   * عندنا أكتر من رقم: العميل ممكن يجيله رد من رقم ماكلّمهوش.
   */
  session?: string
  aiGenerated?: boolean
}

export interface SendTemplateParams {
  to: string
  templateName: string
  languageCode?: string
  components?: TemplateComponent[]
  conversationId?: string
  agentName?: string
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters?: Array<{ type: 'text'; text: string }>
  sub_type?: 'quick_reply' | 'url'
  index?: string
}

// ============================================================================
// Phone normalization
// ============================================================================

/**
 * هل ده مُعرّف مخفي (LID) مش رقم تليفون؟
 *
 * واتساب بيدّي بعض المستخدمين مُعرّف زي `23889212117111` بدل رقمهم.
 * ١٤ خانة فأكتر من غير كود دولة معروف = مش رقم.
 * الإرسال لواحد زي ده بيتقبل من Baileys ويدّي ID والرسالة بتضيع.
 */
export function looksLikeLid(raw: string): boolean {
  const d = (raw || '').replace(/\D/g, '')
  if (d.length < 14) return false
  const knownCodes = ['20', '966', '971', '973', '974', '965', '962', '961', '963', '964', '1', '44', '49', '33', '39', '34', '90', '7', '212', '213', '216', '218', '249', '252', '967', '968', '970', '91', '92', '86']
  return !knownCodes.some((c) => d.startsWith(c) && d.length <= 13)
}

/**
 * Normalize Egyptian phone numbers to WhatsApp format.
 * "01002229982" -> "201002229982"
 * "+201002229982" -> "201002229982"
 * "201002229982" -> "201002229982"
 */
export function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  // Egyptian local number starting with 0
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '20' + digits.slice(1)
  }
  // Already has country code
  if (digits.startsWith('20') && digits.length === 12) {
    return digits
  }
  // Otherwise return as-is (international)
  return digits
}

// ============================================================================
// Send text message
// ============================================================================

export async function sendText(params: SendTextParams): Promise<WhatsAppSendResult> {
  // ⚠️ الـ JID له أولوية على الرقم.
  // واتساب بيبعت مُعرّف مخفي (`xxxx@lid`) بدل الرقم الحقيقي، ومفيش طريقة
  // نرجّع منه رقم. لو حاولنا نعيد التركيب بنبعت لرقم مش موجود — الرسالة
  // بتتقبل وبتاخد ID وبتروح في الفراغ. فلما يبقى عندنا JID، نستخدمه زي ما هو.
  let jid = params.jid?.includes('@') ? params.jid : undefined
  let to = normalizePhone(params.to)
  if (!to && !jid) {
    return { ok: false, error: 'Invalid phone number' }
  }

  // 🔑 حل الـ LID لرقم حقيقي (٢١ يوليو ٢٠٢٦):
  // Baileys مابيوصّلش بثقة للـ `xxxx@lid` المجرّد — بيقبل الرسالة ويدّي ID
  // والرسالة تروح في الفراغ (ده سبب إن الردود بتتسجّل «اتبعت» وموبايل العميل
  // مايوصلوش حاجة). لكن واتساب بيشاركنا الرقم الحقيقي وبنخزّنه في `wa_lid_map`،
  // فلو معانا الرقم الحقيقي نبعت عليه بدل الـ LID.
  const lidDigits = jid?.endsWith('@lid')
    ? jid.split('@')[0]
    : looksLikeLid(to)
      ? to
      : null
  if (lidDigits) {
    const { data: mapped } = await supabaseUntyped
      .from('wa_lid_map')
      .select('phone')
      .eq('lid', lidDigits)
      .maybeSingle()
    const realPhone = (mapped as { phone?: string } | null)?.phone
    if (realPhone) {
      to = normalizePhone(realPhone)
      jid = `${to}@s.whatsapp.net`
    }
  }

  // لو لسه مُعرّف مخفي ومعندناش JID جاهز (رسالة إحنا بادئينها —
  // جماعية، إشعار حجز) ومفيش رقم حقيقي في الماب — ندوّر على الـ JID المحفوظ.
  // من غير الخطوة دي الرسالة هتتبعت لرقم مش موجود وتضيع بصمت.
  if (!jid && looksLikeLid(to)) {
    const { data: conv } = await supabaseUntyped
      .from('whatsapp_conversations')
      .select('metadata')
      .eq('contact_phone', params.to)
      .maybeSingle()

    const saved = (conv?.metadata as { wa_jid?: string } | null)?.wa_jid
    if (saved?.includes('@')) {
      jid = saved
    } else {
      return {
        ok: false,
        error: `مُعرّف مخفي من غير JID محفوظ (${to}) — مش هينفع نبعتله من غير ما يكلّمنا الأول`,
      }
    }
  }

  // ── 🚨 وضع «رد بس» ─────────────────────────────────────────────────────
  // ٢٠ يوليو ٢٠٢٦: واتساب حط بلوك على الرقم — **بدء محادثات جديدة بس**،
  // والرد شغّال عادي. السبب: ٥٠ جروب و٣٥ رسالة استلام في يوم واحد.
  //
  // الحارس ده بيمنع أي رسالة لحد ماكلّمناش قبل كده. الرد على اللي
  // بيكلّمنا مالوش أي قيد.
  //
  // ⚠️ ده مش إجراء مؤقت لليومين دول — ده اللي كان المفروض يكون
  //    موجود من الأول. الرقم بيتوقف من الرسايل الباردة، مش من الردود.
  if (process.env.MARID_REPLY_ONLY === '1') {
    const contactKey = params.to || jid?.split('@')[0] || ''
    const isGroup = jid?.endsWith('@g.us')

    if (!isGroup && contactKey) {
      // ⚠️ الرقم الواحد ممكن يكون ليه أكتر من صف محادثة — لقينا رقم
      //    عنده ١٥ صف. `maybeSingle()` بتفشل مع التكرار وبترجّع فاضي،
      //    فالحارس كان بيمنع الرد على ناس كلّمونا فعلاً.
      //    بناخد كل الصفوف وندوّر في أي واحد فيهم.
      // ⚠️ الرقم بيتخزّن بأكتر من صيغة: `+201067122107` و`201067122107`
      //    و`01067122107`. الحارس كان بيقارن بصيغة واحدة، فكان بيقول
      //    «ماكلّمناش» على ناس كلّمونا فعلاً ويمنع الرد عليهم.
      const digits = contactKey.replace(/\D/g, '')
      const forms = [
        params.to,
        contactKey,
        `+${digits}`,
        digits,
        digits.startsWith('20') ? `0${digits.slice(2)}` : `20${digits.replace(/^0/, '')}`,
      ].filter((v, i, a) => v && a.indexOf(v) === i)

      const { data: convs } = await supabaseUntyped
        .from('whatsapp_conversations')
        .select('id')
        .in('contact_phone', forms)
        .limit(30)

      const ids = ((convs ?? []) as { id: string }[]).map((c) => c.id)
      let heTalkedToUs = false

      if (ids.length) {
        const { data: inbound } = await supabaseUntyped
          .from('whatsapp_messages')
          .select('id')
          .in('conversation_id', ids)
          .eq('direction', 'inbound')
          .limit(1)

        heTalkedToUs = Array.isArray(inbound) && inbound.length > 0
      }

      if (!heTalkedToUs) {
        return {
          ok: false,
          error: `وضع «رد بس» — ${contactKey} ماكلّمناش قبل كده، فمش هنبدأ معاه [صيغ:${forms.join('|')} صفوف:${ids.length}]`,
        }
      }
    }
  }

  // ── المسار الأساسي: خدمة المارد (Baileys على Railway) ──────────────────
  // الرقم بيفضل شغال على الموبايل، والخدمة متربطة كجهاز مرتبط.
  if (WA_SERVICE_URL) {
    try {
      const res = await fetch(`${WA_SERVICE_URL.replace(/\/$/, '')}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-madmona-secret': WA_SERVICE_SECRET,
        },
        // 📞 الرد بيخرج من نفس الرقم اللي العميل كلّمه.
        //    من غير `session` الخدمة بتاخد أول رقم متصل — يعني اللي
        //    كلّم الرقم التاني ممكن يجيله رد من الأول، ويوصله كرسالة
        //    من مجهول. ده نفس نمط البدء البارد اللي بيوقّف الأرقام.
        body: JSON.stringify({ to, jid, text: params.body, session: params.session }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.ok) {
        const errMsg = data?.error ?? `HTTP ${res.status}`
        await logOutboundMessage({
          conversationId: params.conversationId,
          to,
          body: params.body,
          agentName: params.agentName,
          aiGenerated: params.aiGenerated ?? false,
          status: 'failed',
          errorMessage: errMsg,
        })
        return { ok: false, error: errMsg }
      }

      await logOutboundMessage({
        conversationId: params.conversationId,
        to,
        body: params.body,
        agentName: params.agentName,
        aiGenerated: params.aiGenerated ?? false,
        status: 'sent',
        wa_message_id: data.wa_message_id,
      })
      return { ok: true, wa_message_id: data.wa_message_id }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      return { ok: false, error: `wa-service: ${msg}` }
    }
  }

  // ── مسار احتياطي: Cloud API (لو رجع يشتغل يوم من الأيام) ───────────────
  if (!isWhatsAppConfigured()) {
    return { ok: false, error: 'مفيش قناة إرسال متظبطة (WA_SERVICE_URL أو WHATSAPP_* مطلوبين)' }
  }

  try {
    const res = await fetch(`${WA_BASE}/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: params.body, preview_url: true },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      const errMsg = data?.error?.message ?? `HTTP ${res.status}`
      await logOutboundMessage({
        conversationId: params.conversationId,
        to,
        body: params.body,
        agentName: params.agentName,
        aiGenerated: params.aiGenerated ?? false,
        status: 'failed',
        errorMessage: errMsg,
        errorCode: data?.error?.code?.toString(),
      })
      return { ok: false, error: errMsg }
    }

    const wa_message_id = data?.messages?.[0]?.id

    await logOutboundMessage({
      conversationId: params.conversationId,
      to,
      body: params.body,
      agentName: params.agentName,
      aiGenerated: params.aiGenerated ?? false,
      status: 'sent',
      wa_message_id,
    })

    return { ok: true, wa_message_id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return { ok: false, error: msg }
  }
}

// ============================================================================
// Send template message (required for first message > 24h since last user reply)
// ============================================================================

export async function sendTemplate(params: SendTemplateParams): Promise<WhatsAppSendResult> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, error: 'WhatsApp not configured' }
  }

  const to = normalizePhone(params.to)
  if (!to) return { ok: false, error: 'Invalid phone number' }

  try {
    const res = await fetch(`${WA_BASE}/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: params.languageCode ?? 'ar' },
          components: params.components ?? [],
        },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      const errMsg = data?.error?.message ?? `HTTP ${res.status}`
      return { ok: false, error: errMsg }
    }

    const wa_message_id = data?.messages?.[0]?.id

    // Build a readable preview body for logging
    const paramsText = (params.components ?? [])
      .flatMap((c) => c.parameters?.map((p) => p.text) ?? [])
      .join(' | ')
    const previewBody = `[template:${params.templateName}] ${paramsText}`

    await logOutboundMessage({
      conversationId: params.conversationId,
      to,
      body: previewBody,
      agentName: params.agentName,
      aiGenerated: false,
      status: 'sent',
      wa_message_id,
      messageType: 'template',
      templateName: params.templateName,
      templateParams: params.components,
    })

    return { ok: true, wa_message_id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return { ok: false, error: msg }
  }
}

// ============================================================================
// Conversation helpers
// ============================================================================

export async function upsertConversation(args: {
  phone: string
  name?: string
  contactType?: 'supplier_lead' | 'customer_lead' | 'existing_supplier' | 'existing_customer' | 'unknown'
  supplierId?: string
  profileId?: string
  agentName?: string
}): Promise<string | null> {
  const phone = normalizePhone(args.phone)
  if (!phone) return null

  const { data, error } = await supabaseAdmin.rpc('whatsapp_upsert_conversation', {
    p_phone: phone,
    p_name: args.name ?? null,
    p_contact_type: args.contactType ?? 'unknown',
    p_supplier_id: args.supplierId ?? null,
    p_profile_id: args.profileId ?? null,
    p_agent_name: args.agentName ?? null,
  })

  if (error) {
    console.error('upsertConversation error:', error.message)
    return null
  }

  return data as string
}

interface LogOutboundParams {
  conversationId?: string
  to: string
  body: string
  agentName?: string
  aiGenerated: boolean
  status: 'sent' | 'failed'
  wa_message_id?: string
  errorCode?: string
  errorMessage?: string
  messageType?: string
  templateName?: string
  templateParams?: unknown
}

async function logOutboundMessage(params: LogOutboundParams): Promise<void> {
  try {
    let conversationId = params.conversationId
    if (!conversationId) {
      conversationId = (await upsertConversation({
        phone: params.to,
        agentName: params.agentName,
      })) ?? undefined
    }
    if (!conversationId) return

    const now = new Date().toISOString()

    await supabaseAdmin.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      wa_message_id: params.wa_message_id ?? null,
      body: params.body,
      message_type: params.messageType ?? 'text',
      template_name: params.templateName ?? null,
      template_params: params.templateParams ?? null,
      status: params.status,
      status_updated_at: now,
      error_code: params.errorCode ?? null,
      error_message: params.errorMessage ?? null,
      ai_generated: params.aiGenerated,
      agent_name: params.agentName ?? null,
    } as never)

    if (params.status === 'sent') {
      await supabaseAdmin
        .from('whatsapp_conversations')
        .update({
          last_message_at: now,
          last_message_direction: 'outbound',
          last_outbound_at: now,
          message_count: 1, // will be wrong, but it's a tracking signal
        } as never)
        .eq('id', conversationId)
    }
  } catch (err) {
    console.warn('logOutboundMessage failed:', err)
  }
}

export async function logInboundMessage(args: {
  conversationId: string
  wa_message_id: string
  body: string
  messageType?: string
}): Promise<void> {
  const now = new Date().toISOString()

  await supabaseAdmin.from('whatsapp_messages').insert({
    conversation_id: args.conversationId,
    direction: 'inbound',
    wa_message_id: args.wa_message_id,
    body: args.body,
    message_type: args.messageType ?? 'text',
    status: 'delivered',
    status_updated_at: now,
    ai_generated: false,
  } as never)

  await supabaseAdmin
    .from('whatsapp_conversations')
    .update({
      last_message_at: now,
      last_message_direction: 'inbound',
      last_inbound_at: now,
    } as never)
    .eq('id', args.conversationId)
}

// ============================================================================
// Conversation history loader (for AI context)
// ============================================================================

export async function getConversationHistory(
  conversationId: string,
  limit = 20
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('direction, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  type Row = { direction: string; body: string; created_at: string }
  const rows = ((data ?? []) as Row[]).reverse()

  return rows.map((r) => ({
    role: r.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
    content: r.body,
  }))
}
