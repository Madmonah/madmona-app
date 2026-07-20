// src/app/api/whatsapp/baileys/route.ts
// يستقبل الرسايل الواردة من خدمة المارد (Baileys على Railway)
// نفس منطق webhook بتاع Cloud API — بس الـ payload أبسط.

import { NextRequest, NextResponse } from 'next/server'
import {
  upsertConversation,
  logInboundMessage,
  sendText,
  getConversationHistory,
  normalizePhone,
} from '@/lib/whatsapp'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { CUSTOMER_CONCIERGE_PROMPT } from '@/lib/agent-prompts/customer-concierge'

export const runtime = 'nodejs'
export const maxDuration = 30

interface BaileysMedia {
  mimetype: string
  filename: string | null
  seconds: number | null
  is_voice_note: boolean
  size_bytes: number
  data_base64: string
}

interface BaileysPayload {
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

// ── تفريغ الرسايل الصوتية ─────────────────────────────────────────────────
// Claude مابيسمعش صوت، فمحتاجين مزود تفريغ. Groq (Whisper) سريع ورخيص.
async function transcribeAudio(media: BaileysMedia): Promise<string | null> {
  const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  if (!key) return null

  const isGroq = !!process.env.GROQ_API_KEY
  const url = isGroq
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions'
  const model = isGroq ? 'whisper-large-v3-turbo' : 'whisper-1'

  try {
    const form = new FormData()
    const bytes = Buffer.from(media.data_base64, 'base64')
    form.append('file', new Blob([bytes], { type: media.mimetype || 'audio/ogg' }), 'voice.ogg')
    form.append('model', model)
    form.append('language', 'ar')

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    })
    if (!res.ok) {
      console.error('[transcribe]', res.status, await res.text())
      return null
    }
    const data = await res.json()
    return (data?.text as string) || null
  } catch (err) {
    console.error('[transcribe]', err instanceof Error ? err.message : err)
    return null
  }
}

export async function POST(request: NextRequest) {
  // ── التحقق من المصدر ────────────────────────────────────────────────────
  const secret = request.headers.get('x-madmona-secret')
  if (!process.env.WA_SERVICE_SECRET || secret !== process.env.WA_SERVICE_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: BaileysPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  const phone = normalizePhone(body.from)
  if (!phone) return NextResponse.json({ ok: true, skipped: 'invalid phone' })

  // ── ٠) كود تسجيل الدخول MADxxxxx ──────────────────────────────────────
  // العميل بياخد الكود من الموقع ويبعته هنا. لازم نأكّده قبل أي حاجة تانية.
  const loginCode = (body.text || '').toUpperCase().match(/\bMAD[A-Z0-9]{5}\b/)?.[0]
  if (loginCode) {
    try {
      const { data: row } = await supabaseAdmin
        .from('wa_inbound_verifications')
        .select('id, verified, expires_at')
        .eq('code', loginCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!row) {
        await sendText({ to: phone, body: 'الكود ده مش موجود. ارجع للموقع واطلب كود جديد 🙏' })
        return NextResponse.json({ ok: true, login: 'unknown_code' })
      }
      if (new Date(row.expires_at) < new Date()) {
        await sendText({ to: phone, body: 'الكود ده انتهت صلاحيته. اطلب كود جديد من الموقع 🙏' })
        return NextResponse.json({ ok: true, login: 'expired' })
      }

      await supabaseAdmin
        .from('wa_inbound_verifications')
        .update({ verified: true, verified_phone: phone, verified_at: new Date().toISOString() } as never)
        .eq('id', row.id)

      await sendText({ to: phone, body: '✅ تم التأكيد! ارجع للموقع، هتلاقي نفسك دخلت.' })
      return NextResponse.json({ ok: true, login: 'verified', phone })
    } catch (err) {
      console.error('[baileys] login code', err instanceof Error ? err.message : err)
      return NextResponse.json({ ok: false, error: 'login_verify_failed' }, { status: 500 })
    }
  }

  try {
    // ── ١) تسجيل المحادثة والرسالة ────────────────────────────────────────
    const conversationId = await upsertConversation({
      contactPhone: phone,
      contactName: body.name ?? undefined,
      direction: 'inbound',
    })

    // ── ٢) فهم الميديا ────────────────────────────────────────────────────
    // نص الرسالة اللي هيروح لـ Claude — بيتبني حسب نوع المحتوى
    let userText = body.text
    // محتوى مرئي (صور / PDF) بيتبعت لـ Claude مباشرة — بيقراهم أصلاً
    const visualBlocks: Array<Record<string, unknown>> = []

    if (body.media) {
      const mt = body.media.mimetype || ''

      // ٢أ) رسالة صوتية → تفريغ نصي
      if (body.type === 'audio') {
        const transcript = await transcribeAudio(body.media)
        if (transcript) {
          userText = transcript
          console.log('[baileys] تفريغ صوتي:', transcript.slice(0, 80))
        } else {
          userText = body.text || '[رسالة صوتية — مش قادر أفرّغها دلوقتي]'
        }
      }

      // ٢ب) صورة → Claude vision
      else if (body.type === 'image' && mt.startsWith('image/')) {
        visualBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: mt, data: body.media.data_base64 },
        })
        if (!userText.trim()) userText = 'العميل بعت الصورة دي — شوفها ورد عليه.'
      }

      // ٢ج) PDF → Claude documents
      else if (mt === 'application/pdf') {
        visualBlocks.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: body.media.data_base64 },
        })
        if (!userText.trim()) userText = 'العميل بعت الملف ده — اقراه ورد عليه.'
      }

      // ٢د) أي حاجة تانية (فيديو / ملفات غير مدعومة)
      else {
        userText = body.text || `[${body.type} — ${body.media.filename || mt}]`
      }
    }

    await logInboundMessage({
      conversationId,
      from: phone,
      body: userText,
      wa_message_id: body.message_id,
      messageType: body.type,
    })

    if (!userText.trim() && visualBlocks.length === 0) {
      return NextResponse.json({ ok: true, logged: true, replied: false })
    }

    // ── ٣) الرد الذكي ─────────────────────────────────────────────────────
    const history = await getConversationHistory(conversationId, 12)

    const content =
      visualBlocks.length > 0
        ? [...visualBlocks, { type: 'text', text: userText }]
        : userText

    const raw = await callClaude({
      system: CUSTOMER_CONCIERGE_PROMPT,
      messages: [
        ...history.map((h: { direction: string; body: string }) => ({
          role: h.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
          content: h.body,
        })),
        { role: 'user' as const, content: content as never },
      ],
    })

    const parsed = parseJsonResponse<{ reply?: string; should_reply?: boolean }>(raw)
    const reply = parsed?.reply ?? (typeof raw === 'string' ? raw : '')

    if (parsed?.should_reply === false || !reply.trim()) {
      return NextResponse.json({ ok: true, logged: true, replied: false })
    }

    // ── ٣) الإرسال عبر خدمة المارد ────────────────────────────────────────
    const sent = await sendText({
      to: phone,
      body: reply,
      conversationId,
      agentName: 'المارد',
      aiGenerated: true,
    })

    return NextResponse.json({ ok: true, logged: true, replied: sent.ok, error: sent.error })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[baileys webhook]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'madmona baileys webhook' })
}
