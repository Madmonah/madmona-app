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

interface BaileysPayload {
  from: string
  name?: string | null
  message_id: string
  timestamp: number
  type: 'text' | 'image' | 'audio' | 'document'
  text: string
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

  try {
    // ── ١) تسجيل المحادثة والرسالة ────────────────────────────────────────
    const conversationId = await upsertConversation({
      contactPhone: phone,
      contactName: body.name ?? undefined,
      direction: 'inbound',
    })

    await logInboundMessage({
      conversationId,
      from: phone,
      body: body.text,
      wa_message_id: body.message_id,
      messageType: body.type,
    })

    // الرسايل غير النصية: نسجّلها بس ونسيبها لمحمد
    if (body.type !== 'text' || !body.text.trim()) {
      return NextResponse.json({ ok: true, logged: true, replied: false })
    }

    // ── ٢) الرد الذكي ─────────────────────────────────────────────────────
    const history = await getConversationHistory(conversationId, 12)

    const raw = await callClaude({
      system: CUSTOMER_CONCIERGE_PROMPT,
      messages: [
        ...history.map((h: { direction: string; body: string }) => ({
          role: h.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
          content: h.body,
        })),
        { role: 'user' as const, content: body.text },
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
