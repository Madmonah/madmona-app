// src/app/api/internal/wa-send/route.ts
//
// ðŸŽ¯ Ù†Ù‚Ø·Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ù…ÙˆØ­Ù‘Ø¯Ø© â€” ÙƒÙ„ Ø¥Ø±Ø³Ø§Ù„ ÙˆØ§ØªØ³Ø§Ø¨ ÙÙŠ Ù…Ø¶Ù…ÙˆÙ†Ø© Ù„Ø§Ø²Ù… ÙŠØ¹Ø¯Ù‘ÙŠ Ù…Ù† Ù‡Ù†Ø§.
//
// Ù„Ù…Ø§Ø°Ø§ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù Ù…ÙˆØ¬ÙˆØ¯:
//   Ù‚Ø¨Ù„ Ù¢Ù  ÙŠÙˆÙ„ÙŠÙˆ Ù¢Ù Ù¢Ù¦ ÙƒØ§Ù† ÙÙŠÙ‡ Ù¡Ù¨ Ù…ÙƒØ§Ù† Ø¨ÙŠÙ†ÙÙ‘Ø° Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø¨Ù†ÙØ³Ù‡ØŒ ÙƒÙ„ ÙˆØ§Ø­Ø¯
//   Ø¨ÙŠÙ†Ø§Ø¯ÙŠ graph.facebook.com Ù…Ø¨Ø§Ø´Ø±Ø© Ø¨Ù†Ø³Ø®ØªÙ‡. Ù„Ù…Ø§ Ø§Ù„Ø±Ù‚Ù… Ø§ØªÙ†Ù‚Ù„ Ù…Ù† Cloud API
//   Ù„Ù„Ù…Ø§Ø±Ø¯ØŒ Ø§Ù„Ù€ Ù¡Ù¨ ÙˆÙ‚Ø¹ÙˆØ§ Ù…Ø¹ Ø¨Ø¹Ø¶ â€” ÙˆÙƒÙ„ ÙˆØ§Ø­Ø¯ ÙƒØ§Ù† Ù…Ø­ØªØ§Ø¬ Ø¥ØµÙ„Ø§Ø­ Ù…Ù†ÙØµÙ„.
//
//   Ø¯Ù„ÙˆÙ‚ØªÙŠ: Ø§Ù„Ù‚Ù†Ø§Ø© Ø¨ØªØªØºÙŠÙ‘Ø± ÙÙŠ Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯ (lib/whatsapp.ts) ÙˆØ§Ù„ÙƒÙ„ Ø¨ÙŠÙ…Ø´ÙŠ ÙˆØ±Ø§Ù‡Ø§.
//
// Ù…ÙŠÙ† Ø¨ÙŠÙ†Ø§Ø¯ÙŠ Ø¥ÙŠÙ‡:
//   â€¢ Ù…Ø³Ø§Ø±Ø§Øª Next.js      â†’ import { sendText } from '@/lib/whatsapp'
//   â€¢ Ø¯ÙˆØ§Ù„ Supabase Edge  â†’ POST Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø³Ø§Ø± Ø¯Ù‡ Ø¨Ù‡ÙŠØ¯Ø± x-internal-secret
//
// âŒ Ù…Ù…Ù†ÙˆØ¹: Ø£ÙŠ Ù†Ø¯Ø§Ø¡ Ù…Ø¨Ø§Ø´Ø± Ù„Ù€ graph.facebook.com Ù„Ù„Ø¥Ø±Ø³Ø§Ù„. Ù„Ùˆ Ù„Ù‚ÙŠØª ÙˆØ§Ø­Ø¯ØŒ Ø­ÙˆÙ‘Ù„Ù‡ Ù‡Ù†Ø§.

import { NextRequest, NextResponse } from 'next/server'
import { sendText, normalizePhone } from '@/lib/whatsapp'
import { createHash } from 'node:crypto'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  // Ø¨Ù†Ù‚Ø¨Ù„ Ø£ÙŠ Ù…Ù† Ø§Ù„Ø³Ø±Ù‘ÙŠÙ† Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠÙŠÙ†.
  //
  // Ù„ÙŠÙ‡ Ø§Ù„Ø§ØªÙ†ÙŠÙ†: Ø¯ÙˆØ§Ù„ Supabase Edge Ø¨ØªØ¹ÙŠØ´ ÙÙŠ Ù†Ø¸Ø§Ù… ØªØ§Ù†ÙŠ Ø¨Ø£Ø³Ø±Ø§Ø±Ù‡ Ø§Ù„Ø®Ø§ØµØ©.
  // Ù„Ùˆ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø© Ù‚Ø¨Ù„Øª `WA_SERVICE_SECRET` Ø¨Ø³ØŒ ÙƒÙ„ Ø¯Ø§Ù„Ø© Edge Ù‡ØªÙØ´Ù„ Ø¨ØµÙ…Øª
  // Ù„Ùˆ Ø§Ù„Ø³Ø± Ù…Ø´ Ù…ØªØ¸Ø¨Ø· Ø¹Ù†Ø¯Ù‡Ø§ â€” ÙˆØ¯Ù‡ Ø¨Ø§Ù„Ø¸Ø¨Ø· Ù†ÙˆØ¹ Ø§Ù„Ø¹Ø·Ù„ Ø§Ù„Ù„ÙŠ Ø¨Ù†Ø­Ø§Ø±Ø¨Ù‡.
  // `CRON_SECRET` Ø³Ø± Ø¯Ø§Ø®Ù„ÙŠ Ø¨Ù†ÙØ³ Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø«Ù‚Ø© ÙˆÙ…ØªØ¸Ø¨Ø· Ø£ØµÙ„Ø§Ù‹.
  // âš ï¸ Ø¨Ù†Ù‚ØµÙ‘ Ø§Ù„Ù…Ø³Ø§ÙØ§Øª Ù…Ù† Ø§Ù„Ø·Ø±ÙÙŠÙ†.
  // Ù…ØªØºÙŠØ±Ø§Øª Ø§Ù„Ø¨ÙŠØ¦Ø© Ø¨ØªÙ„ØªÙ‚Ø· Ø³Ø·Ø± Ø¬Ø¯ÙŠØ¯ Ø£Ùˆ Ù…Ø³Ø§ÙØ© Ø¨Ø³Ù‡ÙˆÙ„Ø© (Ø£Ù†Ø¨ÙˆØ¨ ÙÙŠ Ø§Ù„Ø·Ø±ÙÙŠØ©ØŒ
  // Ù†Ø³Ø® ÙˆÙ„ØµÙ‚ Ù…Ù† Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ…). Ø§Ù„Ù…Ù‚Ø§Ø±Ù†Ø© Ø¨ØªÙØ´Ù„ ÙˆØ§Ù„Ø®Ø·Ø£ Ø¨ÙŠØ¨Ø§Ù† Â«Ø³Ø± ØºÙ„Ø·Â» â€”
  // Ø¹Ø·Ù„ ØµØ§Ù…Øª Ø¨ÙŠØ¶ÙŠÙ‘Ø¹ ÙˆÙ‚Øª ÙƒØªÙŠØ±.
  const secret = request.headers.get('x-internal-secret')?.trim()
  const accepted = [
    process.env.EDGE_GATEWAY_SECRET, // Ù…Ø®ØµÙ‘Øµ Ù„Ø¯ÙˆØ§Ù„ Supabase Edge
    process.env.WA_SERVICE_SECRET,
    process.env.CRON_SECRET,
  ]
    .map((s) => s?.trim())
    .filter(Boolean)

  if (!accepted.length || !secret || !accepted.includes(secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    to?: string
    text?: string
    conversation_id?: string
    agent_name?: string
    ai_generated?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const to = normalizePhone(body.to || '')
  if (!to) return NextResponse.json({ ok: false, error: 'Ø±Ù‚Ù… ØºÙŠØ± ØµØ§Ù„Ø­' }, { status: 400 })
  if (!body.text?.trim()) return NextResponse.json({ ok: false, error: 'text Ù…Ø·Ù„ÙˆØ¨' }, { status: 400 })

  const res = await sendText({
    to,
    body: body.text,
    conversationId: body.conversation_id,
    agentName: body.agent_name ?? 'Ø§Ù„Ù…Ø§Ø±Ø¯',
    aiGenerated: body.ai_generated ?? false,
  })

  return NextResponse.json(
    { ok: res.ok, wa_message_id: res.wa_message_id, error: res.error },
    { status: res.ok ? 200 : 502 }
  )
}

export async function GET() {
  // ØªØ´Ø®ÙŠØµ Ù…Ù† ØºÙŠØ± ØªØ³Ø±ÙŠØ¨: Ø¨Ù†Ù‚ÙˆÙ„ Ø§Ù„Ù…ØªØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙˆÙ„Ø§ Ù„Ø£ ÙˆØ·ÙˆÙ„Ù‡ Ø¨Ø³.
  // Ø¯Ù‡ Ø¨ÙŠÙØ±Ù‘Ù‚ Ø¨ÙŠÙ† Â«Ø§Ù„Ù…ØªØºÙŠØ± Ù†Ø§Ù‚Øµ ÙˆÙ‚Øª Ø§Ù„ØªØ´ØºÙŠÙ„Â» ÙˆÂ«Ø§Ù„Ù‚ÙŠÙ…Ø© Ù…Ø®ØªÙ„ÙØ©Â» â€”
  // Ù…Ù† ØºÙŠØ±Ù‡ Ø¨Ù†Ø®Ù…Ù‘Ù†ØŒ ÙˆØ§Ù„ØªØ®Ù…ÙŠÙ† Ø¨ÙŠØ¶ÙŠÙ‘Ø¹ Ø³Ø§Ø¹Ø§Øª.
  const fingerprint = (v: string) =>
    createHash('sha256').update(v).digest('hex').slice(0, 8)

  const probe = (v?: string) =>
    v ? { set: true, len: v.trim().length, fp: fingerprint(v.trim()) } : { set: false }

  return NextResponse.json({
    ok: true,
    service: 'madmona unified whatsapp send',
    note: 'ÙƒÙ„ Ø¥Ø±Ø³Ø§Ù„ ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ø§Ø²Ù… ÙŠØ¹Ø¯Ù‘ÙŠ Ù…Ù† Ù‡Ù†Ø§ â€” Ù…Ù…Ù†ÙˆØ¹ Ù†Ø¯Ø§Ø¡ graph.facebook.com Ù…Ø¨Ø§Ø´Ø±Ø©',
    secrets: {
      EDGE_GATEWAY_SECRET: probe(process.env.EDGE_GATEWAY_SECRET),
      WA_SERVICE_SECRET: probe(process.env.WA_SERVICE_SECRET),
      CRON_SECRET: probe(process.env.CRON_SECRET),
    },
  })
}
