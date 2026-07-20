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
}): Promise<string> {
  const MAX_TURNS = 4

  const system = `${opts.systemPrompt}

═══════════════════════════════════════════════════════════
معلومات المتكلّم دلوقتي
═══════════════════════════════════════════════════════════
رقمه: ${opts.senderPhone}${opts.senderName ? `\nاسمه: ${opts.senderName}` : ''}

استخدم الرقم ده مباشرة في الأدوات — ماتسألهوش عليه.

═══════════════════════════════════════════════════════════
عندك أدوات — استخدمها
═══════════════════════════════════════════════════════════
• أي سؤال عن حاجة معينة → search_catalog قبل ما ترد
• «عندكم إيه؟» → list_categories
• أول رسالة من حد → who_is_this عشان تعرف تبعت اللينك الصح
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

    if (body.media) {
      const mt = body.media.mimetype || ''

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
    await logInboundMessage({
      conversationId,
      wa_message_id: body.message_id,
      body: userText,
      messageType: body.type,
    })

    if (!userText.trim() && mediaBlocks.length === 0) {
      return NextResponse.json({ ok: true, logged: true, replied: false })
    }

    // ── ٤) الرد الذكي ───────────────────────────────────────────────────
    // getConversationHistory بترجع {role, content} جاهزة — بنحوّلها نص
    // لأن callClaude بتاخد رسالة واحدة بس.
    const history = await getConversationHistory(conversationId, 12)
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
    })

    // البرومبت بيطلب JSON — بنفك بأمان ولو فشل نستخدم النص كما هو
    let parsed: ConciergeReply = {}
    try {
      parsed = parseJsonResponse<ConciergeReply>(raw)
    } catch {
      parsed = { reply: raw }
    }

    const reply = (parsed.reply || '').trim()
    if (!reply) {
      return NextResponse.json({ ok: true, logged: true, replied: false, reason: 'empty_reply' })
    }

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
