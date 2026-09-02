// شات مضمونة — نفس مخ المارد، رد مباشر بدون واتساب. بيدعم نص + صور + صوت + ملفات.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped } from '@/lib/supabase'
import { WEB_MARID_SESSION, WEB_MARID_NAME } from '@/lib/whatsapp'
import { getNumberConfig, numberPromptSection } from '@/lib/wa-number-config'
import { parseJsonResponse } from '@/lib/anthropic'
import { callMaridWithTools } from '@/lib/marid-brain'
import { processIncomingMedia, type MediaInput } from '@/lib/marid-media'
import { CUSTOMER_CONCIERGE_PROMPT } from '@/lib/agent-prompts/customer-concierge'
// 💰 (١٦ أغسطس ٢٠٢٦) أرقام العمولة بتتحقن من الداتابيز وقت الرد — مش مكتوبة في البرومبت.
import { withLiveCommission } from '@/lib/commission'
import { isAdmin } from '@/lib/marid-admin'
import { notifyAdminsMaridReply } from '@/lib/admin-notify'
import { createClient } from '@supabase/supabase-js'
import { phoneToEmail } from '@/lib/auth-helpers'

export const runtime = 'nodejs'
export const maxDuration = 60

function normalizeEg(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  if (d.length === 10) d = '20' + d
  return d
}

// إنشاء أكونت مضمونة للعميل بالرقم (نفس مسار /api/auth/wa — best-effort).
async function ensureAccount(phone20: string, fullName: string | null) {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const local = '0' + phone20.slice(2)
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .or(`phone.eq.${local},phone.eq.${phone20}`)
      .limit(1)
      .maybeSingle()
    const exId = (existing as { id?: string } | null)?.id
    if (exId) {
      if (fullName) await admin.from('profiles').update({ full_name: fullName } as never).eq('id', exId)
      return
    }
    const email = phoneToEmail(phone20)
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      // 🔒 (٢٨/٨) الصيغة الدولية في كل حتة — الصيغة المحلية كانت بتعمل
    //    حساب تاني لنفس الشخص لو سجّل عادي بعد كده.
    user_metadata: { phone: phone20, full_name: fullName || undefined, via: 'chat' },
    })
    let userId = created?.user?.id
    if (error && /already|exists/i.test(error.message)) {
      const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      userId = link?.user?.id
    } else if (error) {
      return
    }
    if (!userId) return
    await admin
      .from('profiles')
      .upsert({ id: userId, phone: phone20, full_name: fullName, role: 'customer' } as never, { onConflict: 'id' })
  } catch {
    /* best-effort — مايوقفش الرد */
  }
}

// ── إشعار بوش لما المارد يرد (best-effort) ──────────────────────────────
// بنضيف صف في notification_queue، وكرون كل دقيقة بيبعته. الـSW بيتجاهله
// لو المستخدم فاتح الشات فعلاً (suppressIfChatFocused) علشان مايزعّجوش.
async function enqueueReplyPush(phone20: string, reply: string) {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    // مطابقة دقيقة لكل الصيغ المخزّنة: 010..، 2010..، +2010..
    const local = '0' + phone20.slice(2)
    const { data: prof } = await admin
      .from('profiles')
      .select('id')
      .in('phone', [local, phone20, '+' + phone20])
      .limit(1)
      .maybeSingle()
    const pid = (prof as { id?: string } | null)?.id
    if (!pid) return
    const { count } = await admin
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', pid)
    if (!count) return
    const preview = (reply || '').replace(/\s+/g, ' ').trim().slice(0, 90)
    // تريجر notification_queue_dedupe بيرمي أي إشعار بنفس (المستقبِل + العنوان) خلال ٦٠ دقيقة.
    // العنوان كان ثابت «المارد رد عليك 💬» → فأول رد في الساعة بس هو اللي بيوصل، وكل
    // الردود اللي بعده جوّه الساعة كانت بتتبلع بصمت (ده سبب إن الـpush مكانش بيبعت في الشات).
    // الحل: نخلي العنوان يحمل أول الرسالة، فكل رد مختلف = عنوان مختلف = بيوصل.
    // (لو الرد اتكرر حرفيًا نفس الساعة بيتمنع — وده اللي احنا عايزينه فعلاً.)
    const shortPreview = preview.slice(0, 45)
    await admin.from('notification_queue').insert({
      recipient_id: pid,
      type: 'chat_reply',
      title: preview ? `المارد: ${shortPreview}${preview.length > 45 ? '…' : ''}` : 'المارد رد عليك 💬',
      body: preview || 'عندك رد جديد على مضمونة',
      url: '/chat',
      data: { icon: '/marid-icon-192.png', suppressIfChatFocused: true },
    } as never)
  } catch {
    /* best-effort */
  }
}

// ── جلب تاريخ المحادثة (محمي بتوكن الحساب — الخصوصية أولاً) ──────────────────
// بنرجّع الرسايل بس لصاحب الحساب نفسه (Bearer token). من غير توكن = مفيش تاريخ،
// علشان محدش يقدر يقرا محادثة حد تاني بمجرد معرفة رقمه.
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ ok: true, messages: [] })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    // 🚪🚪 (٢ سبتمبر ٢٠٢٦) محمد: «ببعت رسايل للمارد وبمجرد ما أغيّر
    //     التاب الرسايل بتختفي».
    //     السبب: التاريخ كان بيتقرا بتوكن Supabase **بس**. ومحمد وأصحاب
    //     البيزنس داخلين بتوكن الواتساب (madmona_token) من غير جلسة
    //     Supabase — فالـGET بيرجّع messages: [] والرسايل بتتمسح من
    //     الشاشة أول ما الكومبوننت يتعمله remount. الرسايل نفسها **مش
    //     ضايعة** — متسجّلة في whatsapp_messages، بس مفيش طريق يقراها.
    //     دي رابع شاشة بنفس المرض النهاردة.
    let phone = ''
    const { data: userData } = await admin.auth.getUser(token)
    const user = userData?.user
    let name = ''
    if (user) {
      const { data: prof } = await admin.from('profiles').select('phone, full_name').eq('id', user.id).maybeSingle()
      const pr = prof as { phone?: string; full_name?: string } | null
      phone = normalizeEg(pr?.phone || user.phone || '')
      name = (pr?.full_name || '').trim()
    } else if (/^[0-9a-f-]{36}$/i.test(token)) {
      // توكن واتساب: جلسة سارية → رقم الحساب. التوكن سرّي فالخصوصية محفوظة.
      const { data: sess } = await admin
        .from('madmona_sessions')
        .select('account_id, expires_at')
        .eq('token', token)
        .maybeSingle()
      const row = sess as { account_id?: string; expires_at?: string } | null
      if (row?.account_id && row.expires_at && new Date(row.expires_at) > new Date()) {
        const { data: acct } = await admin
          .from('madmona_accounts')
          .select('phone_normalized, full_name')
          .eq('id', row.account_id)
          .maybeSingle()
        const ac = acct as { phone_normalized?: string; full_name?: string } | null
        phone = normalizeEg(ac?.phone_normalized || '')
        name = (ac?.full_name || '').trim()
      }
    }
    if (!phone || phone.length < 11) return NextResponse.json({ ok: true, messages: [], phone: '', name })

    const { data: conv } = await supabaseUntyped
      .from('whatsapp_conversations')
      .select('id')
      .eq('contact_phone', phone)
      .eq('session_id', 'web')
      .maybeSingle()
    const conversationId = (conv as { id?: string } | null)?.id
    if (!conversationId) return NextResponse.json({ ok: true, messages: [], phone, name })

    const { data: rows } = await supabaseUntyped
      .from('whatsapp_messages')
      .select('id, direction, body, message_type, ai_generated, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200)

    const urlRe = /(https?:\/\/[^\s]+)/
    const messages = ((rows ?? []) as Array<{ id: string; direction: string; body: string; message_type: string; ai_generated: boolean; created_at: string }>).map((r) => {
      const isMedia = !!r.message_type && r.message_type !== 'text'
      let text = r.body || ''
      let media_url: string | null = null
      if (isMedia) {
        const mm = text.match(urlRe)
        media_url = mm ? mm[1] : null
        text = text.replace(/^\[[^\]]*\]\s*/, '').replace(urlRe, '').trim()
      }
      return {
        id: r.id,
        direction: r.direction,
        ai_generated: !!r.ai_generated,
        message_type: r.message_type || 'text',
        text,
        media_url,
        created_at: r.created_at,
      }
    })

    return NextResponse.json({ ok: true, messages, phone, name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[chat GET]', msg)
    return NextResponse.json({ ok: true, messages: [] })
  }
}

export async function POST(request: NextRequest) {
  // 🛟 (٢٨/٨) نحفظهم هنا عشان المكتبة تقدر ترد لو حصل خطأ تحت
  let safeMessage = ''
  let safePhone = ''
  let body: { phone?: string; name?: string; message?: string; media?: MediaInput; summon?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  const phone = normalizeEg(body.phone || '')
  const name = (body.name || '').trim() || null
  const message = (body.message || '').trim()
  const media = body.media && body.media.data_base64 ? body.media : null
  const summon = body.summon !== false // المارد مستدعى؟ (افتراضي أيوه؛ false = شات عادي بدون رد)

  if (!phone || phone.length < 11) {
    return NextResponse.json({ ok: false, error: 'رقم غير صحيح' }, { status: 400 })
  }
  if (!message && !media) {
    return NextResponse.json({ ok: false, error: 'الرسالة فاضية' }, { status: 400 })
  }

  try {
    // ── ١) المحادثة (بالرقم + قناة الويب) ──────────────────────────────
    const { data: existing } = await supabaseUntyped
      .from('whatsapp_conversations')
      .select('id')
      .eq('contact_phone', phone)
      .eq('session_id', 'web')
      .maybeSingle()

    let conversationId = (existing as { id?: string } | null)?.id
    if (!conversationId) {
      const { data: created, error: cErr } = await supabaseUntyped
        .from('whatsapp_conversations')
        .insert({
          contact_phone: phone,
          contact_name: name,
          // 🧞 شات الموقع = «المارد الرسمي» — مارد منفصل بمساره الخاص،
          //    بنفس قدرات مارد الواتساب وبنفس الذاكرة (الجزء ٤ تحت).
          session_id: WEB_MARID_SESSION,
          agent_name: WEB_MARID_NAME,
          status: 'active',
          last_message_at: new Date().toISOString(),
          last_message_direction: 'inbound',
          last_inbound_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (cErr) throw cErr
      conversationId = (created as { id: string }).id
      // عميل جديد → اعملّه أكونت مضمونة بالرقم والاسم (best-effort، مايوقفش الرد)
      void ensureAccount(phone, name)
    } else if (name) {
      await supabaseUntyped.from('whatsapp_conversations').update({ contact_name: name }).eq('id', conversationId)
    }

    // ── ٢) الميديا (لو موجودة): حفظ + تجهيز للمارد ──────────────────────
    let mediaBlocks: Array<Record<string, unknown>> = []
    let savedMediaUrl: string | null = null
    let effectiveText = message
    let mediaTranscript: string | null = null
    if (media) {
      const r = await processIncomingMedia(media, phone)
      mediaBlocks = r.blocks
      savedMediaUrl = r.savedUrl
      if (!effectiveText) effectiveText = r.textHint
      if (media.type === 'audio' && r.textHint && !r.textHint.startsWith('[رسالة صوتية')) {
        mediaTranscript = r.textHint
      }
    }

    // ── ٣) تسجيل رسالة العميل ───────────────────────────────────────────
    const logBody = media
      ? `[${media.type}${media.filename ? ': ' + media.filename : ''}]${mediaTranscript ? ' ' + mediaTranscript : message ? ' ' + message : ''}${savedMediaUrl ? ' ' + savedMediaUrl : ''}`
      : message
    const { data: myInbound } = await supabaseUntyped.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'inbound',
      body: logBody,
      message_type: media ? media.type : 'text',
      status: 'delivered',
    }).select('created_at').single()

    // المارد مش مستدعى → نخزّن الرسالة كشات عادي من غير رد
    if (!summon) {
      await supabaseUntyped
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString(), last_message_direction: 'inbound', last_inbound_at: new Date().toISOString() })
        .eq('id', conversationId)
      return NextResponse.json({ ok: true, reply: null, stored: true, conversationId })
    }

    // ── ٣ب) جمع الدفعة (مطابق لمسار الواتساب) ──────────────────────────
    // نستنى شوية بعد ما نسجّل الرسالة، وبعدين نبص: فيه رسالة أحدث من
    // العميل وصلت في نفس المحادثة؟
    //   • أيوة → اسكت (batched) — العملية بتاعت الرسالة الأحدث هي اللي هترد.
    //   • لأ   → أنا آخر واحد في الدفعة → أرد رد واحد يغطّيها كلها.
    // ده بيمنع إن ٤ رسايل ورا بعض تطلّع ٤ ردود، وبيخلّي المارد يبان إنسان.
    const BATCH_WAIT_MS = Number(process.env.MARID_BATCH_WAIT_MS || 7000)
    if (myInbound?.created_at) {
      await new Promise((r) => setTimeout(r, BATCH_WAIT_MS))
      const { data: newer } = await supabaseUntyped
        .from('whatsapp_messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('direction', 'inbound')
        .gt('created_at', (myInbound as { created_at: string }).created_at)
        .limit(1)
        .maybeSingle()
      if (newer) {
        return NextResponse.json({ ok: true, reply: null, batched: true, conversationId })
      }
    }

    // ── ٤) تاريخ المحادثة (عبر القنوات) ─────────────────────────────────
    // نجمع كل محادثات نفس الرقم (ويب + واتساب بنفس الرقم الحقيقي) عشان
    // المارد يفتكر التاريخ حتى لو جه من قناة تانية.
    const { data: sameConvs } = await supabaseUntyped
      .from('whatsapp_conversations')
      .select('id')
      .eq('contact_phone', phone)
    const convIds = ((sameConvs ?? []) as Array<{ id: string }>).map((c) => c.id)
    const { data: hist } = await supabaseUntyped
      .from('whatsapp_messages')
      .select('direction, body, created_at')
      .in('conversation_id', convIds.length ? convIds : [conversationId])
      .order('created_at', { ascending: false })
      .limit(24)
    const histRows = ((hist ?? []) as Array<{ direction: string; body: string }>).reverse()
    const historyText = histRows
      .slice(0, -1)
      .map((h) => `${h.direction === 'inbound' ? 'العميل' : 'المارد'}: ${h.body || ''}`)
      .join('\n')
    const userMessage = historyText
      ? `سياق المحادثة السابقة:\n${historyText}\n\n---\nرسالة العميل الحالية:\n${effectiveText}`
      : effectiveText

    // 🛟 (٢٨/٨) للاحتياطي — المكتبة بترد بيهم لو حصل خطأ تحت
    safeMessage = userMessage || ''
    safePhone = phone || ''
    // ── ٥) رد المارد ────────────────────────────────────────────────────
    // 🧞 نفس مخ الواتساب بالظبط (`lib/marid-brain`) — نسخة واحدة لكل الماردة.
    //    والسياق الخاص بالمارد ده بيتقري من نفس المكان اللي أرقام الواتساب
    //    بتقرا منه (`wa_number_configs`)، فأي تعليمة جديدة للمارد الرسمي
    //    تتحط في صف واحد من غير أي نشر.
    const maridCfg = await getNumberConfig(WEB_MARID_SESSION)

    // 🛟 (٢٨/٨) رد المكتبة — بيشتغل لو الأنثروبيك فشل لأي سبب
    //    (رصيد خلص · انقطاع · تجاوز الحد). المكتبة بتعرف ٤١٤ فئة
    //    وبترشّح من الإعلانات الحية وبتعرف بتكلم مين.
    const libraryReply = async (): Promise<string | null> => {
      try {
        const { data } = await (supabaseUntyped.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('marid_offline_reply', {
          p_text: userMessage, p_phone: phone,
        })
        const t = typeof data === 'string' ? data.trim() : ''
        return t.length > 5 ? t : null
      } catch {
        return null
      }
    }

    const raw = await callMaridWithTools({
      systemPrompt: (await withLiveCommission(CUSTOMER_CONCIERGE_PROMPT)) + numberPromptSection(maridCfg),
      userMessage,
      mediaBlocks,
      savedMediaUrl,
      senderPhone: phone,
      senderName: name,
      admin: isAdmin(phone),
    })

    let reply = ''
    try {
      reply = (parseJsonResponse<{ reply?: string }>(raw).reply || '').trim()
    } catch {
      reply = (raw || '').trim()
    }
    if (!reply && raw.trim().length > 10) reply = raw.trim().slice(0, 1200)

    // 🛟 (٢٨/٨) الأنثروبيك مارجعش رد؟ المكتبة بترد بدله — العميل
    //    مايشوفش «مفيش رصيد» ولا رسالة خطأ أبدًا.
    if (!reply) {
      const fromLib = await libraryReply()
      if (fromLib) reply = fromLib
    }
    if (!reply) reply = 'ثانية واحدة — ممكن تعيد صياغة طلبك؟'
    reply = reply.replace(/\*\*([\s\S]+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/\n{3,}/g, '\n\n').trim()

    // ── ٦) تسجيل الرد ───────────────────────────────────────────────────
    await supabaseUntyped.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      body: reply,
      message_type: 'text',
      status: 'sent',
      ai_generated: true,
      agent_name: WEB_MARID_NAME,
      session_id: WEB_MARID_SESSION,
    })
    await supabaseUntyped
      .from('whatsapp_conversations')
      .update({ last_message_at: new Date().toISOString(), last_message_direction: 'outbound', last_outbound_at: new Date().toISOString() })
      .eq('id', conversationId)

    // إشعار بوش (بيتبعت بالكرون خلال دقيقة؛ الـSW بيتجاهله لو الشات مفتوح)
    // لازم await — الـserverless بيقفل بعد الـresponse فيقتل أي promise معلّق
    await enqueueReplyPush(phone, reply)

    // إشعار للأدمن على كل رد من المارد (best-effort) — إلا لو العميل نفسه أدمن
    if (!isAdmin(phone)) {
      await notifyAdminsMaridReply({ customerName: name, customerPhone: phone, preview: reply, channel: 'chat' })
    }

    return NextResponse.json({ ok: true, reply, conversationId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[chat]', msg)

    // 🛟 (٢٨ أغسطس ٢٠٢٦) محمد: «المارد اللي في شات مضمونة بيرد يقول
    //    مفيش رصيد» — كان بيرجّع **نص الخطأ الخام** للعميل.
    //    دلوقتي المكتبة بترد بدله: ٤١٤ فئة · ترشيح من الإعلانات
    //    الحية · وبتعرف بتكلم مين. والعميل مايشوفش كلمة «رصيد» أبدًا.
    try {
      // 📌 الرسالة والرقم اتحفظوا من أول ما اتقروا — الـbody
      //    مايتقراش مرتين في الويب.
      if (safeMessage) {
        const { data } = await (supabaseUntyped.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('marid_offline_reply', {
          p_text: safeMessage,
          p_phone: safePhone || null,
        })
        const fallback = typeof data === 'string' ? data.trim() : ''
        if (fallback.length > 5) {
          return NextResponse.json({ ok: true, reply: fallback, source: 'library' })
        }
      }
    } catch { /* المكتبة كمان فشلت — نرجّع رد عام */ }

    // 🙊 ومهما حصل، العميل مايشوفش تفاصيل تقنية
    return NextResponse.json({
      ok: true,
      reply: 'ثانية واحدة 🙏 ممكن تبعت طلبك تاني؟ ولو مستعجل كلّمنا على 01002229982.',
    })
  }
}
