// src/app/api/whatsapp/baileys/route.ts
// يستقبل الرسايل الواردة من خدمة المارد (Baileys على Railway).
//
// ⚠️ كل نداء هنا متحقق من توقيعه الفعلي في lib/whatsapp.ts و lib/anthropic.ts

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin, supabaseUntyped } from '@/lib/supabase'
import {
  upsertConversation,
  logInboundMessage,
  sendText,
  getConversationHistory,
  normalizePhone,
} from '@/lib/whatsapp'
import { anthropic, CLAUDE_MODEL, parseJsonResponse } from '@/lib/anthropic'
import { MARID_TOOLS, runMaridTool, MADMONA_LINKS, recordLead } from '@/lib/marid-tools'
import {
  ADMIN_TOOLS,
  runAdminTool,
  isAdmin,
  logDirective,
  ADMIN_PROMPT,
} from '@/lib/marid-admin'
import { CUSTOMER_CONCIERGE_PROMPT } from '@/lib/agent-prompts/customer-concierge'
import { getNumberConfig, numberPromptSection } from '@/lib/wa-number-config'

export const runtime = 'nodejs'
export const maxDuration = 60

interface BaileysMedia {
  mimetype: string
  filename: string | null
  seconds: number | null
  is_voice_note: boolean
  size_bytes: number
  data_base64: string
}

interface BaileysPayload {
  /** رقم المارد اللي الرسالة جت عليه — الرد لازم يخرج من نفس الرقم */
  session_id?: string
  reply_jid?: string
  is_lid?: boolean
  from: string
  name?: string | null
  message_id: string
  timestamp: number
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  text: string
  is_group?: boolean
  group_jid?: string | null
  media?: BaileysMedia | null
}

interface ConciergeReply {
  reply?: string
  intent_detected?: string
  needs_human_handoff?: boolean
  next_action?: string
  should_track_as_lead?: boolean
}

// ── تفريغ الصوت (Claude مابيسمعش — لازم مزود خارجي) ──────────────────────
async function transcribeAudio(media: BaileysMedia): Promise<string | null> {
  const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  if (!key) return null

  const isGroq = !!process.env.GROQ_API_KEY
  const url = isGroq
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions'

  try {
    const form = new FormData()
    const bytes = Buffer.from(media.data_base64, 'base64')
    form.append('file', new Blob([bytes], { type: media.mimetype || 'audio/ogg' }), 'voice.ogg')
    form.append('model', isGroq ? 'whisper-large-v3-turbo' : 'whisper-1')
    form.append('language', 'ar')

    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
    if (!res.ok) {
      console.error('[transcribe]', res.status, await res.text())
      return null
    }
    return ((await res.json())?.text as string) || null
  } catch (err) {
    console.error('[transcribe]', err instanceof Error ? err.message : err)
    return null
  }
}

// ── نداء Claude مع صور/PDF ────────────────────────────────────────────────
// callClaude بتاخد نص بس، فالحالة دي بننادي العميل مباشرة.
async function callClaudeWithMedia(
  systemPrompt: string,
  userText: string,
  blocks: Array<Record<string, unknown>>
): Promise<string> {
  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: [...blocks, { type: 'text', text: userText }] as never }],
  })
  const first = res.content[0]
  return first && first.type === 'text' ? first.text : ''
}

// ── حفظ الميديا في الستوريدج ─────────────────────────────────────────────
//
// كنا بنبعت الملف لـClaude **وبنرميه**. النتيجة: صفر ملفات محفوظة،
// والمسودات بتتعمل من غير صور — والداتابيز بترفض نشر إعلان من غير صورة.
// فكل اللي بيبعتوا صور منتجاتهم كان شغلهم بيضيع.
//
// النظام القديم كان بيحفظ (whatsapp-webhook:401-474) وضاع في الترحيل.
//
// بيرجّع الرابط العام، ولو فشل بيرجّع null — الحفظ مايوقفش الرد أبدًا.
async function saveMedia(
  media: BaileysMedia,
  type: string,
  phone: string
): Promise<string | null> {
  try {
    const bucket =
      type === 'image' ? 'content-images' : type === 'video' ? 'project-media' : 'project-media'

    const ext =
      (media.filename?.split('.').pop() || '').toLowerCase() ||
      (media.mimetype.split('/')[1] || 'bin').split(';')[0]

    const safePhone = (phone || 'unknown').replace(/\D/g, '') || 'unknown'
    const path = `wa/${safePhone}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`

    const { error } = await supabaseUntyped.storage
      .from(bucket)
      .upload(path, Buffer.from(media.data_base64, 'base64'), {
        contentType: media.mimetype || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      console.error('[save-media]', error.message)
      return null
    }

    const { data } = supabaseUntyped.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch (err) {
    console.error('[save-media]', err instanceof Error ? err.message : err)
    return null
  }
}

// ── اللينكات الممغنطة ────────────────────────────────────────────────────
//
// أي لينك مضمونة في الرد بيتحوّل لـ /l/<token> يدخّل العميل تلقائي.
// من غيرها العميل بيوصل لصفحة الحجز وهو مش مسجّل دخول، فيسيبها —
// وده كان بيلغي أوردرات فعليًا.
//
// النظام القديم كان بيعمل ده (whatsapp-webhook:295-323) وضاع في الترحيل.
//
// ⚠️ لو التحويل فشل، بنرجّع اللينك العادي. الرد لازم يوصل.
const SITE_HOST = 'www.madmonacairo.com'

async function magnetizeLinks(text: string, phone: string): Promise<string> {
  if (!phone || !text.includes(SITE_HOST)) return text

  // مانحوّلش صفحات الدخول والتسجيل — دي المفروض تفضل زي ما هي
  const SKIP = ['/auth/', '/l/', '/supplier/login']

  const all: string[] = text.match(/https?:\/\/[^\s)]+/g) ?? []
  const urls = all.filter(
    (u, i) => all.indexOf(u) === i && u.includes(SITE_HOST) && !SKIP.some((s) => u.includes(s))
  )
  if (!urls.length) return text

  let out = text
  for (const url of urls.slice(0, 3)) {
    try {
      const nextPath = new URL(url).pathname + new URL(url).search
      const { data, error } = await supabaseUntyped
        .from('wa_login_tokens')
        .insert({
          phone,
          next_path: nextPath,
          expires_at: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          max_uses: 5,
        })
        .select('token')
        .maybeSingle()

      if (error || !data?.token) continue
      out = out.split(url).join(`https://${SITE_HOST}/l/${data.token}`)
    } catch {
      // اللينك يفضل زي ما هو
    }
  }
  return out
}

// ── نداء المارد بالأدوات ─────────────────────────────────────────────────
//
// المارد بيقدر يسأل الداتابيز قبل ما يرد: يبحث في الكتالوج، يشوف المتكلّم
// مين، يجيب حجوزاته، يسجّل إعلان جديد. بندوّر الحلقة لحد ما يخلص أدوات.
//
// ليه حد أقصى ٤ لفّات: الرد على الواتساب لازم يوصل في أقل من دقيقة،
// وكل لفّة نداء API كامل. أربعة كفاية لأصعب سؤال، وبتمنع الدوران اللانهائي.
async function callMaridWithTools(opts: {
  systemPrompt: string
  userMessage: string
  mediaBlocks: Array<Record<string, unknown>>
  senderPhone: string
  senderName: string | null
  savedMediaUrl?: string | null
  admin?: boolean
}): Promise<string> {
  // الأدمن محتاج لفّات أكتر — أوامره بتحتاج فحص وتنفيذ ومراجعة
  const MAX_TURNS = opts.admin ? 6 : 4
  const tools = opts.admin ? [...MARID_TOOLS, ...ADMIN_TOOLS] : MARID_TOOLS

  const system = `${opts.systemPrompt}${opts.admin ? ADMIN_PROMPT : ''}

═══════════════════════════════════════════════════════════
النهاردة
═══════════════════════════════════════════════════════════
${new Date().toLocaleString('ar-EG', {
  timeZone: 'Africa/Cairo',
  dateStyle: 'full',
  timeStyle: 'short',
})}
(بتوقيت القاهرة · ISO: ${new Date().toISOString()})

⛔ ماتسألش العميل عن التاريخ أو الساعة — إنت عارفهم.
«بكرة» و«بعد بكرة» و«الأسبوع الجاي» احسبهم بنفسك من التاريخ ده.

═══════════════════════════════════════════════════════════
معلومات المتكلّم دلوقتي
═══════════════════════════════════════════════════════════
رقمه: ${opts.senderPhone}${opts.senderName ? `\nاسمه: ${opts.senderName}` : ''}

استخدم الرقم ده مباشرة في الأدوات — ماتسألهوش عليه.
${opts.savedMediaUrl ? `\n📎 الملف اللي بعته اتحفظ هنا:\n${opts.savedMediaUrl}\nلو هتسجّل إعلان أو مشروع، مرّر الرابط ده في image_urls كصورة.\n\n🧾 لو الصورة فيها منيو أو قائمة أسعار: اقرا كل صنف وسعره من الصورة نفسها (إنت شايفها)، وسجّلهم بـ create_listing_draft صنف صنف — كل صنف باسمه وسعره اللي في الصورة، مش صورة واحدة بلا تفاصيل. الأسعار اللي في الصورة هي المصدر، متخترعش.\n` : ''}

═══════════════════════════════════════════════════════════
عندك أدوات — استخدمها
═══════════════════════════════════════════════════════════
• أي سؤال عن حاجة معينة → search_catalog قبل ما ترد
• «عندكم إيه؟» → list_categories
• **أول حاجة دايمًا: who_is_this** — ابعتله الرقم *والاسم*.
  لو رجّعلك تاريخ سابق، اقراه كويس وكمّل من حيث انتهيتوا.
  الناس بتزعل جدًا لما تسأل عن حاجة شرحوها قبل كده.
• «فين حجزي؟» → get_my_orders
• عايز يضيف منتج/خدمة → اجمع البيانات ثم create_listing_draft
• «كودي» أو «شير واكسب» أو عايز يرشّح صحابه → get_referral_code
• عايز يشتغل معانا أو بعت سيرة ذاتية → record_job_application
• أي كلام عن **أوردر** (قبول/رفض/إلغاء/استفسار) → manage_order
  الأداة بتتأكد من الصلاحية بنفسها. ماتأكّدش على حاجة قبل ما ترجّع ok.
• أي كلام عن **ميعاد** (حجز/إلغاء/استفسار) → manage_meeting
  ⛔ ممنوع تقول ميعاد من دماغك ولا توعد بحاجة مش مسجّلة
• **search_catalog مارجّعش حاجة مناسبة** → نادِ record_unmet_demand
  **فورًا وقبل ما ترد**. ماتستأذنش وماتقولش «تحب أسجّلهولك؟» —
  سجّله وبعدين قول للعميل إنك سجّلته وهترجعله.
  الطلب اللي مايتسجّلش بيضيع للأبد.

⚠️ ممنوع تخترع إعلان أو سعر أو لينك. لو الأداة مارجعتش حاجة،
قول للعميل بصراحة إن ده مش متاح — ده أحسن ألف مرة من معلومة غلط.

الروابط الرسمية:
${Object.entries(MADMONA_LINKS)
  .map(([k, v]) => `  ${k.replace(/_/g, ' ')}: ${v}`)
  .join('\n')}`

  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
    {
      role: 'user',
      content:
        opts.mediaBlocks.length > 0
          ? [...opts.mediaBlocks, { type: 'text', text: opts.userMessage }]
          : opts.userMessage,
    },
  ]

  // ⚠️ لو الميديا مش مقروءة (صورة تالفة، صيغة غريبة، ملف كبير)، Claude
  // بيرمي 400 والطلب كله بيقع — والعميل مايوصلوش رد خالص.
  // الحل: نشيل الميديا ونكمّل بالنص. رد ناقص أحسن ألف مرة من سكوت.
  let droppedMedia = false

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let res
    try {
      res = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system,
        tools: tools as never,
        messages: messages as never,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isMediaIssue = /image|document|media|Could not process/i.test(msg)

      if (isMediaIssue && !droppedMedia && opts.mediaBlocks.length > 0) {
        console.warn('[marid] الميديا مش مقروءة — بنكمّل من غيرها:', msg.slice(0, 120))
        droppedMedia = true
        messages[0] = {
          role: 'user',
          content:
            `${opts.userMessage}\n\n(العميل بعت ملف مش قادر أفتحه — ` +
            `قوله كده بصراحة واطلب منه يبعت التفاصيل مكتوبة أو يبعت الملف تاني.)`,
        }
        continue
      }
      throw err
    }

    const toolUses = res.content.filter((c) => c.type === 'tool_use')

    if (!toolUses.length) {
      const textPart = res.content.find((c) => c.type === 'text')
      return textPart && textPart.type === 'text' ? textPart.text : ''
    }

    messages.push({ role: 'assistant', content: res.content })

    const results = []
    for (const tu of toolUses) {
      if (tu.type !== 'tool_use') continue
      const isAdminTool = ADMIN_TOOLS.some((t) => t.name === tu.name)

      // 📸 لو العميل بعت صورة والمارد بيسجّل إعلان، نحقن الرابط المحفوظ في الأداة
      //    كضمان (حتى لو المارد نسي يمرّره في image_urls) — عشان الإعلان ينزل
      //    الماركتبليس مش يعلق كمسودة بلا صورة.
      let toolInput = tu.input as Record<string, unknown>
      if (tu.name === 'create_listing_draft' && opts.savedMediaUrl) {
        const existing = Array.isArray(toolInput.image_urls) ? (toolInput.image_urls as string[]) : []
        if (!existing.length) toolInput = { ...toolInput, image_urls: [opts.savedMediaUrl] }
      }

      const out = isAdminTool
        ? await runAdminTool(tu.name, toolInput)
        : await runMaridTool(tu.name, toolInput)
      console.log('[marid-tool]', tu.name, JSON.stringify(out).slice(0, 160))
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(out),
      })
    }
    messages.push({ role: 'user', content: results })
  }

  // خلصت اللفّات ولسه بيطلب أدوات — نطلب رد نهائي من غير أدوات
  const final = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: `${system}\n\nخلاص كفاية أدوات — رد على العميل دلوقتي باللي عندك.`,
    messages: messages as never,
  })
  const t = final.content.find((c) => c.type === 'text')
  return t && t.type === 'text' ? t.text : ''
}

export async function POST(request: NextRequest) {
  // بنقبل السرّين الداخليين — نفس حدود الثقة (الاتنين على السيرفر بس).
  // WA_SERVICE_SECRET هو اللي Railway بيبعت بيه.
  // EDGE_GATEWAY_SECRET بيدّينا مسار اختبار بدل ما نستنى رسالة حقيقية
  // عشان نتأكد إن التعديل شغال — التخمين بيضيّع وقت.
  const secret = request.headers.get('x-madmona-secret')?.trim()
  const accepted = [process.env.WA_SERVICE_SECRET, process.env.EDGE_GATEWAY_SECRET]
    .map((s) => s?.trim())
    .filter(Boolean)

  if (!accepted.length || !secret || !accepted.includes(secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: BaileysPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  // ── ربط مُعرّف مخفي برقم حقيقي ──────────────────────────────────────
  // واتساب بيبعت الربط ده بنفسه (chats.phoneNumberShare / Contact.lid).
  // ده المصدر الرسمي — أدق بكتير من التخمين بالاسم.
  if ((body as { kind?: string }).kind === 'lid_map') {
    const m = body as unknown as { lid?: string; phone?: string; sessionId?: string }
    if (m.lid && m.phone) {
      await supabaseUntyped.from('wa_lid_map').upsert(
        {
          lid: m.lid,
          phone: normalizePhone(m.phone),
          session_id: m.sessionId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lid' }
      )
      console.log('[lid-map]', m.lid, '→', m.phone)
    }
    return NextResponse.json({ ok: true, kind: 'lid_map' })
  }

  const phone = normalizePhone(body.from)

  // ⚠️ الـ JID الأصلي — ده اللي بنرد عليه.
  // واتساب بيبعت مُعرّف مخفي (`xxx@lid`) بدل الرقم لبعض المستخدمين.
  // لو رجّعنا تركيب رقم من الـ LID بنبعت لرقم مش موجود والرسالة بتضيع.
  const replyJid = body.reply_jid || undefined
  if (!phone && !replyJid) return NextResponse.json({ ok: true, skipped: 'invalid_sender' })

  try {
    // ── ٠ق) مفتاح الطوارئ ──────────────────────────────────────────────
    // إيقاف كامل للرد. **ماينفعش يتشغّل إلا في حالة قصوى** —
    // العميل بيستنى رد ومش بيوصله حاجة.
    //
    // ٢٠ يوليو: شغّلته لما فكرنا إن الرقم متوقف تمامًا. طلع البلوك على
    // **بدء المحادثات بس** والرد شغّال — فالإيقاف الشامل كان ضرر
    // زيادة. الحارس الصح هو MARID_REPLY_ONLY في مسار الإرسال:
    // بيرد على اللي بيكلّمنا، وبيمنع البدء مع اللي ماكلّمناش.
    const sendPaused = process.env.MARID_SEND_PAUSED === '1'
    if (sendPaused && body.text) {
      const cid = await upsertConversation({
        phone,
        name: body.name ?? undefined,
        agentName: 'المارد',
      })
      if (cid) {
        await logInboundMessage({
          conversationId: cid,
          wa_message_id: body.message_id,
          body: body.text || `[${body.type}]`,
          messageType: body.type,
        })
      }
      return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'send_paused' })
    }

    // ── ٠ص) فلتر الضوضاء ───────────────────────────────────────────────
    // رقم واحد (LID) بعت ~١٨٠ رسالة فاضية في ساعتين — كل دقيقة تقريبًا.
    // مالهاش نص ولا ميديا: إشعارات حالة أو أحداث بروتوكول، مش كلام بني آدم.
    //
    // المارد ماكانش بيرد عليها (فيه حارس تحت)، بس كانت بتتسجّل كلها
    // في الداتابيز وبتستهلك استدعاء كامل للويبهوك. بنرميها من الأول.
    //
    // ⚠️ الشرط: **مفيش نص ومفيش ميديا**. أي رسالة فيها صورة أو صوت
    //    أو مستند لازم تعدّي حتى لو نصها فاضي — دي رسالة حقيقية.
    {
      const hasText = typeof body.text === 'string' && body.text.trim().length > 0
      const hasMedia = !!body.media
      const isMediaType = ['image', 'video', 'audio', 'document', 'sticker'].includes(
        String(body.type || ''),
      )
      if (!hasText && !hasMedia && !isMediaType) {
        return NextResponse.json({ ok: true, skipped: 'empty', replied: false })
      }
    }

    // ── ٠أ) منع الرد المكرر ─────────────────────────────────────────────
    // Baileys بيعيد تسليم نفس الرسالة أحيانًا (إعادة اتصال، مزامنة أجهزة).
    // شوفنا ده فعليًا يوم ٢٠ يوليو: رد واحد اتبعت مرتين بفارق ثانية.
    // معرّف الرسالة من واتساب ثابت، فبنستخدمه كحارس.
    if (body.message_id) {
      const { data: seen } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('id')
        .eq('wa_message_id', body.message_id)
        .limit(1)
        .maybeSingle()

      if (seen) {
        return NextResponse.json({ ok: true, skipped: 'duplicate', replied: false })
      }
    }

    // ── ٠) كود تسجيل الدخول MADxxxxx ────────────────────────────────────
    const loginCode = (body.text || '').toUpperCase().match(/\bMAD[A-Z0-9]{5}\b/)?.[0]
    if (loginCode) {
      const { data: rowRaw } = await supabaseAdmin
        .from('wa_inbound_verifications')
        .select('id, verified, expires_at')
        .eq('code', loginCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const row = rowRaw as { id: string; verified: boolean; expires_at: string } | null

      if (!row) {
        await sendText({ to: phone, jid: replyJid, session: body.session_id, body: 'الكود ده مش موجود. ارجع للموقع واطلب كود جديد 🙏' })
        return NextResponse.json({ ok: true, login: 'unknown_code' })
      }
      if (new Date(row.expires_at) < new Date()) {
        await sendText({ to: phone, jid: replyJid, session: body.session_id, body: 'الكود ده انتهت صلاحيته. اطلب كود جديد من الموقع 🙏' })
        return NextResponse.json({ ok: true, login: 'expired' })
      }

      await supabaseAdmin
        .from('wa_inbound_verifications')
        .update({ verified: true, verified_phone: phone, verified_at: new Date().toISOString() } as never)
        .eq('id', row.id)

      await sendText({ to: phone, jid: replyJid, session: body.session_id, body: '✅ تم التأكيد! ارجع للموقع، هتلاقي نفسك دخلت.' })
      return NextResponse.json({ ok: true, login: 'verified' })
    }

    // ── ١) المحادثة ─────────────────────────────────────────────────────
    const conversationId = await upsertConversation({
      phone,
      name: body.name ?? undefined,
      agentName: 'المارد',
    })
    if (!conversationId) {
      return NextResponse.json({ ok: false, error: 'upsert_failed' }, { status: 500 })
    }

    // 📞 نربط المحادثة بالرقم اللي جت عليه — عشان أي إرسال لاحق
    //    (تذكير ميعاد، لينك استلام، تحويل لجروب) يعرف يخرج من
    //    نفس الرقم. العميل لازم يشوف رد من اللي كلّمه هو.
    //
    // ⚠️ بنحدّثها في *كل* رسالة واردة — مش بس لما تكون فاضية.
    // سامي كلّمنا قبل كده على الرقم القديم، وبعدين بعت على الجديد،
    // والصف كان لسة شايل الرقم القديم (المفصول) فالرد راح في الفراغ.
    // اللي بيحدّد الرقم هو آخر رسالة جت، مش أول واحدة.
    if (body.session_id) {
      await supabaseUntyped
        .from('whatsapp_conversations')
        .update({ session_id: body.session_id })
        .eq('id', conversationId)
    }

    // ── ١·٥) تسجيل مضمون للرسالة الواردة ────────────────────────────────
    // القاعدة (طلب محمد ٢٢ يوليو): «كل رسالة تتسجّل حتى لو الرد واحد».
    //
    // بنسجّلها **دلوقتي** — قبل حارس اللوب، ومعالجة الميديا (رفع + تفريغ)،
    // وانتظار الدفعة (٧ث)، والرد الذكي. كل دول ممكن يفشلوا أو ياخدوا وقت
    // طويل يوصل لـ timeout الدالة (٦٠ث)، وقبل التعديل ده كانت الرسالة
    // بتتسجّل بعدهم — يعني أي فشل قبل خطوة ٣ كان بيبلع الرسالة بصمت،
    // وحارس اللوب كان بيرجع من غير ما يسجّلها خالص.
    //
    // upsert idempotent (قيد فريد على wa_message_id) — فلو اتسجّلت تاني
    // تحت (تخصيب ميديا في خطوة ٣) بتحدّث نفس الصف مش بتتكرّر.
    const inboundLogged = await logInboundMessage({
      conversationId,
      wa_message_id: body.message_id,
      body: body.text || `[${body.type}]`,
      messageType: body.type,
    })
    if (!inboundLogged) {
      // ماقدرناش نسجّلها — ده عطل داتابيز حقيقي (نادر، لأن الـupsert بيبلع
      // التعارضات). نبلّغ في اللوج بوضوح بدل ما تضيع الرسالة في صمت.
      console.error('[baileys] فشل تسجيل رسالة واردة', body.message_id, phone || replyJid)
    }

    // ── ٠ج) المحادثة موقوفة؟ ────────────────────────────────────────────
    // لو الأدمن أوقف المحادثة، المارد يسكت خالص. النظام القديم كان
    // بيعمل كده وضاع في الترحيل — فأي محادثة محمد أوقفها كان المارد
    // بيرجع يرد فيها من ورا ظهره.
    {
      const { data: conv } = await supabaseUntyped
        .from('whatsapp_conversations')
        .select('status')
        .eq('id', conversationId)
        .maybeSingle()

      if (conv?.status === 'paused' || conv?.status === 'blocked') {
        // الرسالة اتسجّلت فوق (خطوة ١·٥) — بنكتفي بإننا مانردّش
        return NextResponse.json({ ok: true, logged: true, replied: false, reason: conv.status })
      }
    }

    // ── ٠ه) إعداد الرقم — سياق/تشغيل مستقل لكل رقم ───────────────────────
    // كل رقم (session_id) ممكن يكون ليه سياق خاص (persona) بيتحقن في برومبت
    // الدماغ، أو يتقفل بالكامل (enabled=false). القراءة آمنة: أي عطل → الافتراضي
    // (شغّال، بلا سياق إضافي) عشان الإعداد مايوقفش الرد أبدًا.
    // الأدمن مستثنى من الإيقاف — محمد لازم يقدر يوصل من أي رقم.
    const numberCfg = await getNumberConfig(body.session_id)
    if (!numberCfg.enabled && !isAdmin(phone)) {
      // الرسالة اتسجّلت فوق (خطوة ١·٥) — الرقم متوقّف فبنكتفي بإننا مانردّش
      return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'number_disabled' })
    }

    // ── ٠د) حارس اللوب ──────────────────────────────────────────────────
    // لو المارد بعت أكتر من الحد في ساعة على نفس المحادثة، يبقى فيه
    // دوران — بيوقف المحادثة وينبّه بدل ما يفضل يبعت.
    // الرقم اللي بيبعت كتير في وقت قصير بيتقفل من واتساب.
    // الأدمن مستثنى — محمد ممكن يبعت ٢٠ أمر ورا بعض وده طبيعي
    const LOOP_LIMIT = Number(process.env.MARID_LOOP_LIMIT || 12)
    if (!isAdmin(phone)) {
      const hourAgo = new Date(Date.now() - 3600_000).toISOString()
      const { count } = await supabaseUntyped
        .from('whatsapp_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('direction', 'outbound')
        .gte('created_at', hourAgo)

      if ((count ?? 0) >= LOOP_LIMIT) {
        await supabaseUntyped
          .from('whatsapp_conversations')
          .update({ status: 'paused' })
          .eq('id', conversationId)

        console.error('[loop-guard] وقفت المحادثة', conversationId, 'بعد', count, 'رسالة')

        // تنبيه محمد — السكوت هنا أخطر من العطل
        const owner = process.env.OWNER_PHONE || '201002229982'
        await sendText({
          to: owner,
          body:
            `⚠️ *حارس اللوب*\n\n` +
            `وقفت محادثة ${phone || replyJid} تلقائيًا — المارد بعت ${count} رسالة في ساعة.\n\n` +
            `شوف المحادثة، ولو تمام شيل الإيقاف من لوحة الأدمن.`,
        }).catch(() => {})

        return NextResponse.json({ ok: true, replied: false, reason: 'loop_guard' })
      }
    }

    // ── ٠ب) رد واحد للدفعة الواحدة ──────────────────────────────────────
    // الناس بتبعت كذا حاجة ورا بعض (٤ صور + وصف). لو ردّينا على كل
    // واحدة، بيوصله ٤ رسايل شبه متطابقة في دقيقة — وده بيطفّش.
    //
    // شفنا ده فعليًا يوم ٢٠ يوليو مع مورد بعت صور مشروعه.
    // النظام القديم كان فيه القاعدة دي واتفقدت في الترحيل.
    //
    // ⚠️ ده الحارس الحقيقي. النسختين اللي قبله فشلوا:
    //
    // (١) منع أي رد خلال ٤٥ث من آخر رد → منع ردود حقيقية على عملاء
    //     ردّوا بسرعة.
    // (٢) مقارنة وقت الرسالة بوقت آخر رد → فشل لما ٤ رسايل وصلوا في
    //     ثانية واحدة: اتفتحت ٤ عمليات **بالتوازي**، وكل واحدة شافت
    //     إن مفيش رد قبلها، فكلهم ردّوا. أربع رسايل في ٢١ ثانية،
    //     وأول رد تجاهل المنيو اللي وصل بعده بنص ثانية.
    //
    // الحل (زي النظام القديم): **استنى الأول، وبعدين اتأكد**.
    // بنستنى شوية، وبعدين نشوف: فيه رسالة أحدث مني وصلت؟
    //   • أيوة → اسكت. العملية بتاعتها هي اللي هترد وهتشوف كلامي في التاريخ.
    //   • لأ   → أنا آخر واحد في الدفعة → أرد، والرد يغطّي الدفعة كلها.
    //
    // الانتظار بيحل سباق التوازي لأن الفحص بيحصل **بعده** مش قبله.
    // ⚠️ الانتظار نفسه مكانه **بعد** ما الرسالة تتسجّل في الداتابيز
    //    (تحت، بعد `logInboundMessage`). لو استنينا قبل التسجيل،
    //    كل عملية بتدوّر على إخواتها وماتلاقيش حاجة — وده بالظبط
    //    اللي خلّى أول محاولة تفشل وترد أربع مرات تاني.

    {
      const { data: lastOut } = await supabaseUntyped
        .from('whatsapp_messages')
        .select('created_at')
        .eq('conversation_id', conversationId)
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // وقت الرسالة من واتساب نفسه (ثواني) — أدق من وقت وصولها لينا
      const msgAt = body.timestamp ? body.timestamp * 1000 : Date.now()
      const lastOutAt = lastOut?.created_at ? new Date(lastOut.created_at).getTime() : 0

      // هامش ثانيتين: الرسايل اللي في نفس الدفعة بتوصل بفروق أجزاء من الثانية
      const alreadyCovered = lastOutAt > 0 && msgAt < lastOutAt + 2000

      if (alreadyCovered) {
        // اتسجّلت فوق (خطوة ١·٥) — دي في نافذة ٢ث بعد آخر رد فمانردّش تاني
        return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'debounced' })
      }
    }

    // لو الراسل بمُعرّف مخفي — نحفظ الـ JID بتاعه.
    // ده الفرصة الوحيدة: مفيش طريقة نوصله بعد كده غير بالـ JID ده،
    // فلو ماحفظناهوش دلوقتي، أي رسالة إحنا نبدأها ليه هتضيع.
    if (body.is_lid && replyJid) {
      // ندمج مش نستبدل — العمود فيه مفاتيح تانية (زي supplier_kind)
      const { data: existing } = await supabaseUntyped
        .from('whatsapp_conversations')
        .select('metadata')
        .eq('id', conversationId)
        .maybeSingle()

      const merged = {
        ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
        wa_jid: replyJid,
        is_lid: true,
      }

      await supabaseUntyped
        .from('whatsapp_conversations')
        .update({ metadata: merged })
        .eq('id', conversationId)
    }

    // ── ١ب) ليد سخن ─────────────────────────────────────────────────────
    // رقم إحنا كلّمناه قبل كده (حملة أو تواصل) ورد علينا = فرصة حقيقية.
    // القديم كان بينبّه محمد فورًا وضاع في الترحيل.
    // بنبعت التنبيه مرة واحدة كل ٢٤ ساعة عشان مانغرقهوش.
    void (async () => {
      try {
        const { data: conv } = await supabaseUntyped
          .from('whatsapp_conversations')
          .select('message_count, contact_name, metadata')
          .eq('id', conversationId)
          .maybeSingle()

        // أول رد منه بعد ما إحنا بدأنا؟
        const meta = (conv?.metadata as Record<string, unknown> | null) ?? {}
        if (meta.hot_lead_alerted) return
        if ((conv?.message_count ?? 0) > 6) return

        const { data: firstMsg } = await supabaseUntyped
          .from('whatsapp_messages')
          .select('direction')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        // لو أول رسالة في المحادثة كانت مننا → يبقى إحنا اللي بدأنا
        if (firstMsg?.direction !== 'outbound') return

        await supabaseUntyped
          .from('whatsapp_conversations')
          .update({ metadata: { ...meta, hot_lead_alerted: true } })
          .eq('id', conversationId)

        const owner = process.env.OWNER_PHONE || '201002229982'
        await sendText({
          to: owner,
          body:
            `🔥 *ليد سخن*\n\n` +
            `${conv?.contact_name || phone} رد على المارد.\n\n` +
            `«${(body.text || `[${body.type}]`).slice(0, 150)}»\n\n` +
            `المحادثة: ${MADMONA_LINKS.لوحة_المورد.replace('/supplier/dashboard', '/admin/wa-review')}`,
        })
      } catch {
        // التنبيه مايوقفش الرد أبدًا
      }
    })()

    // ── ١أ) الأدمن ──────────────────────────────────────────────────────
    // كل أمر من محمد بيتسجّل **قبل** أي معالجة.
    // حتى لو المارد فهم غلط أو التنفيذ وقع، الأمر محفوظ في
    // admin_directives ومحمد يقدر يراجع. مفيش أمر بيضيع.
    const senderIsAdmin = isAdmin(phone)
    if (senderIsAdmin && (body.text || '').trim()) {
      void logDirective(phone, body.text, body.type)
    }

    // ── ١ج) تسجيل الليد ─────────────────────────────────────────────────
    // كل رقم بيكلّمنا = عميل محتمل. القديم كان بيسجّله ويقيّمه وضاع.
    // بيشتغل في الخلفية — مايوقفش الرد.
    void recordLead({
      phone,
      name: body.name,
      isSupplier: false, // بيتحدّث لو who_is_this طلّعه مورد
      intent: null,
    })

    // ── ٢) فهم المحتوى ──────────────────────────────────────────────────
    let userText = body.text || ''
    const mediaBlocks: Array<Record<string, unknown>> = []
    let savedMediaUrl: string | null = null

    if (body.media) {
      const mt = body.media.mimetype || ''

      // نحفظ الأول — الملف بيضيع لو ماحفظناهوش دلوقتي
      savedMediaUrl = await saveMedia(body.media, body.type, phone)

      if (body.type === 'audio') {
        const transcript = await transcribeAudio(body.media)
        userText = transcript || body.text || '[رسالة صوتية — مش قادر أفرّغها دلوقتي]'
      } else if (body.type === 'image' && mt.startsWith('image/')) {
        mediaBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: body.media.data_base64 } })
        if (!userText.trim()) userText = 'العميل بعت الصورة دي — شوفها ورد عليه.'
      } else if (mt === 'application/pdf') {
        mediaBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: body.media.data_base64 } })
        if (!userText.trim()) userText = 'العميل بعت الملف ده — اقراه ورد عليه.'
      } else {
        userText = body.text || `[${body.type} — ${body.media.filename || mt}]`
      }
    }

    // ── ٣) التسجيل ──────────────────────────────────────────────────────
    //
    // ⚠️ اللي بنخزّنه هنا هو ذاكرة المارد للرسايل الجاية.
    // لو خزّنّا «العميل بعت الملف ده»، الرسالة اللي بعدها مش هيبقى
    // عارف الملف كان فيه إيه — وده اللي خلّاه يسأل عبده أسئلة بديهية
    // عن ملف «Pharmacy 154m» كان قدامه.
    //
    // فبنخزّن اسم الملف والتعليق — على الأقل يفضل فيه دلالة.
    // الرسالة النصية اتسجّلت خام في خطوة ١·٥ فوق. هنا بنخصّب الميديا بس:
    // دلوقتي بقى عندنا الرابط المحفوظ والتفريغ، فبنحدّث نفس الصف (upsert
    // على wa_message_id) بالنسخة الغنية عشان ذاكرة المارد للرسايل الجاية
    // تبقى فيها الدلالة. (ON CONFLICT DO UPDATE مابيعيدش تفجير تريجرات
    // الـINSERT، فمفيش تصنيف/مطابقة مكرّرة.)
    if (body.media) {
      const logBody = [
        body.type === 'audio'
          ? '[صوت]'
          : body.type === 'image'
          ? '[صورة]'
          : body.type === 'video'
          ? '[فيديو]'
          : `[ملف: ${body.media.filename || body.media.mimetype}]`,
        userText.startsWith('العميل بعت') ? '' : userText,
        savedMediaUrl ?? '',
      ]
        .filter(Boolean)
        .join(' ')

      await logInboundMessage({
        conversationId,
        wa_message_id: body.message_id,
        body: logBody,
        messageType: body.type,
      })
    }

    // ── جمع الدفعة ────────────────────────────────────────────────────
    // دلوقتي بس — بعد ما الرسالة اتسجّلت — نقدر نستنى ونشوف إخواتها.
    //
    // الناس بتبعت على دفعات: سلام، وبعده المنيو، وبعده الأسعار، وبعده
    // السؤال. لو كل رسالة ردّت لوحدها، بيطلع أربع ردود وأولهم أعمى
    // عن اللي جه بعده. ده اللي حصل مع Yuri Sushi: أربع ردود في ٢١ث،
    // وأول واحد قال «أقدر أساعدك في إيه» والمنيو كان واصل قبله بنص ثانية.
    //
    // بنستنى شوية وبعدين نشوف: فيه رسالة أحدث **منّي أنا** (مش من
    // وقت عشوائي)؟
    //   • أيوة → أسكت، هي اللي هترد وهتشوف كلامي في التاريخ
    //   • لأ   → أنا آخر واحد في الدفعة → أرد رد واحد يغطّيها كلها
    //
    // ⚠️ المقارنة لازم تكون بوقت رسالتي أنا. لو قارنّا بنافذة زمنية،
    //    كل واحد هيلاقي إخواته جوّه النافذة وهيسكت — ومحدش يرد خالص.
    //    بوقتي أنا، بالظبط **واحد** هو اللي مالقاش حد أحدث منه.
    //
    // والفحص **بعد** الانتظار مش قبله — وده اللي بيحل سباق التوازي.
    {
      const BATCH_WAIT_MS = Number(process.env.MARID_BATCH_WAIT_MS || 7000)

      const { data: mine } = await supabaseUntyped
        .from('whatsapp_messages')
        .select('created_at')
        .eq('conversation_id', conversationId)
        .eq('wa_message_id', body.message_id)
        .maybeSingle()

      if (mine?.created_at) {
        await new Promise((r) => setTimeout(r, BATCH_WAIT_MS))

        const { data: newer } = await supabaseUntyped
          .from('whatsapp_messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('direction', 'inbound')
          .gt('created_at', mine.created_at)
          .limit(1)
          .maybeSingle()

        if (newer) {
          return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'batched' })
        }
      }
    }

    if (!userText.trim() && mediaBlocks.length === 0) {
      return NextResponse.json({ ok: true, logged: true, replied: false })
    }

    // ── ٤) الرد الذكي ───────────────────────────────────────────────────
    // getConversationHistory بترجع {role, content} جاهزة — بنحوّلها نص
    // لأن callClaude بتاخد رسالة واحدة بس.
    // ٢٤ رسالة زي النظام القديم — ١٢ كانت بتقطع سياق المحادثات الطويلة
    const history = await getConversationHistory(conversationId, 24)
    const historyText = history
      .slice(0, -1) // آخر واحدة هي الرسالة الحالية
      .map((h) => `${h.role === 'user' ? 'العميل' : 'المارد'}: ${h.content}`)
      .join('\n')

    const userMessage = historyText
      ? `سياق المحادثة السابقة:\n${historyText}\n\n---\nرسالة العميل الحالية:\n${userText}`
      : userText

    const raw = await callMaridWithTools({
      // البرومبت الأساسي + سياق الرقم (لو موجود) — كل رقم بشخصيته/سياقه
      systemPrompt: CUSTOMER_CONCIERGE_PROMPT + numberPromptSection(numberCfg),
      userMessage,
      mediaBlocks,
      senderPhone: phone,
      senderName: body.name ?? null,
      savedMediaUrl,
      admin: senderIsAdmin,
    })

    // البرومبت بيطلب JSON — بنفك بأمان ولو فشل نستخدم النص كما هو
    let parsed: ConciergeReply = {}
    try {
      parsed = parseJsonResponse<ConciergeReply>(raw)
    } catch {
      parsed = { reply: raw }
    }

    // إنقاذ الرد: لو الـJSON اتقطع، بنستخرج النص الخام بدل ما نسكت.
    // السكوت أوحش حاجة — العميل بيفتكر إننا مش موجودين.
    let reply = (parsed.reply || '').trim()
    if (!reply && raw.trim().length > 15) {
      reply = raw.trim().replace(/^\s*\{[\s\S]*?"reply"\s*:\s*"/, '').replace(/"[\s\S]*$/, '')
      if (reply.length < 15) reply = raw.trim().slice(0, 900)
    }

    if (!reply) {
      // آخر خط دفاع — بلاغ لمحمد بدل ما العميل يتساب في السكوت
      console.error('[empty-reply]', conversationId, raw.slice(0, 120))
      return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'empty_reply' })
    }

    // ── تنسيق واتساب ─────────────────────────────────────────────────
    // واتساب بيعمل عريض بنجمة واحدة `*كده*`. النموذج بيكتب `**كده**`
    // (تنسيق ماركداون)، فالعميل بيشوف النجوم حرفيًا على الشاشة —
    // وده شكل مكسور بيوحي إن اللي بيرد آلة. بنصلّحه قبل الإرسال
    // بدل ما نعتمد على إن النموذج يفتكر.
    reply = reply
      .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '*$1*')
      .replace(/\*\*([\s\S]+?)\*\*/g, '*$1*')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // 💬 دعوة لإكمال المحادثة على شات مضمونة — قناة مملوكة وتوصيلها مضمون
    //    (رقم الواتساب ممكن يكون متحفّظ فمش كل رسالة بتوصّل). اللينك بيتمغنط
    //    تحت لـ /l/<token> فبيسجّل دخول العميل بضغطة واحدة ويفتحله الشات بهويته.
    reply += `\n\nلو حابب تكمّل كلامك مع المارد ادخل من هنا 👇\nhttps://${SITE_HOST}/chat/marid`

    // اللينكات تتمغنط قبل الإرسال — العميل يدخل بضغطة واحدة
    reply = await magnetizeLinks(reply, phone)

    const sent = await sendText({
      to: phone,
      jid: replyJid,
      // 📞 الرد يخرج من نفس الرقم اللي الرسالة جت عليه.
      //    من غير كده اللي كلّم الرقم التاني ممكن يجيله رد من الأول.
      session: body.session_id,
      body: reply,
      conversationId,
      agentName: 'المارد',
      aiGenerated: true,
    })

    return NextResponse.json({
      ok: true,
      logged: true,
      replied: sent.ok,
      intent: parsed.intent_detected,
      handoff: parsed.needs_human_handoff ?? false,
      error: sent.error,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[baileys webhook]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'madmona baileys webhook' })
}
