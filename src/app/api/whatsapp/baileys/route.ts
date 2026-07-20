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
import { MARID_TOOLS, runMaridTool, MADMONA_LINKS } from '@/lib/marid-tools'
import { CUSTOMER_CONCIERGE_PROMPT } from '@/lib/agent-prompts/customer-concierge'

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
}): Promise<string> {
  const MAX_TURNS = 4

  const system = `${opts.systemPrompt}

═══════════════════════════════════════════════════════════
معلومات المتكلّم دلوقتي
═══════════════════════════════════════════════════════════
رقمه: ${opts.senderPhone}${opts.senderName ? `\nاسمه: ${opts.senderName}` : ''}

استخدم الرقم ده مباشرة في الأدوات — ماتسألهوش عليه.
${opts.savedMediaUrl ? `\n📎 الملف اللي بعته اتحفظ هنا:\n${opts.savedMediaUrl}\nلو هتسجّل إعلان أو مشروع، استخدم الرابط ده كصورة.\n` : ''}

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

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system,
      tools: MARID_TOOLS as never,
      messages: messages as never,
    })

    const toolUses = res.content.filter((c) => c.type === 'tool_use')

    if (!toolUses.length) {
      const textPart = res.content.find((c) => c.type === 'text')
      return textPart && textPart.type === 'text' ? textPart.text : ''
    }

    messages.push({ role: 'assistant', content: res.content })

    const results = []
    for (const tu of toolUses) {
      if (tu.type !== 'tool_use') continue
      const out = await runMaridTool(tu.name, tu.input as Record<string, unknown>)
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
        await sendText({ to: phone, jid: replyJid, body: 'الكود ده مش موجود. ارجع للموقع واطلب كود جديد 🙏' })
        return NextResponse.json({ ok: true, login: 'unknown_code' })
      }
      if (new Date(row.expires_at) < new Date()) {
        await sendText({ to: phone, jid: replyJid, body: 'الكود ده انتهت صلاحيته. اطلب كود جديد من الموقع 🙏' })
        return NextResponse.json({ ok: true, login: 'expired' })
      }

      await supabaseAdmin
        .from('wa_inbound_verifications')
        .update({ verified: true, verified_phone: phone, verified_at: new Date().toISOString() } as never)
        .eq('id', row.id)

      await sendText({ to: phone, jid: replyJid, body: '✅ تم التأكيد! ارجع للموقع، هتلاقي نفسك دخلت.' })
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
        await logInboundMessage({
          conversationId,
          wa_message_id: body.message_id,
          body: body.text || `[${body.type}]`,
          messageType: body.type,
        })
        return NextResponse.json({ ok: true, logged: true, replied: false, reason: conv.status })
      }
    }

    // ── ٠د) حارس اللوب ──────────────────────────────────────────────────
    // لو المارد بعت أكتر من الحد في ساعة على نفس المحادثة، يبقى فيه
    // دوران — بيوقف المحادثة وينبّه بدل ما يفضل يبعت.
    // الرقم اللي بيبعت كتير في وقت قصير بيتقفل من واتساب.
    const LOOP_LIMIT = Number(process.env.MARID_LOOP_LIMIT || 12)
    {
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
    // ⚠️ الفرق المهم: «رسايل جت مع بعض قبل ما نرد» غير «العميل رد علينا».
    //
    // أول نسخة من الحارس ده منعت أي رد خلال ٤٥ ثانية من آخر رد —
    // فلما عبده رد علينا بعد ٣٥ ثانية، المارد سكت. عطل أسوأ من اللي
    // كنا بنصلحه.
    //
    // القاعدة الصح: نقارن **وقت الرسالة نفسها** بوقت آخر رد.
    //   • الرسالة أقدم من آخر رد → كانت جزء من الدفعة اللي ردّينا عليها → نتخطّى
    //   • الرسالة أحدث من آخر رد → العميل بيكلّمنا من جديد → نرد
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
        await logInboundMessage({
          conversationId,
          wa_message_id: body.message_id,
          body: body.text || `[${body.type}]`,
          messageType: body.type,
        })
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
    const logBody = body.media
      ? [
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
      : userText

    await logInboundMessage({
      conversationId,
      wa_message_id: body.message_id,
      body: logBody,
      messageType: body.type,
    })

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
      systemPrompt: CUSTOMER_CONCIERGE_PROMPT,
      userMessage,
      mediaBlocks,
      senderPhone: phone,
      senderName: body.name ?? null,
      savedMediaUrl,
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

    // اللينكات تتمغنط قبل الإرسال — العميل يدخل بضغطة واحدة
    reply = await magnetizeLinks(reply, phone)

    const sent = await sendText({
      to: phone,
      jid: replyJid,
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
