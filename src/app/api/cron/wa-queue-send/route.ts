// src/app/api/cron/wa-queue-send/route.ts
// بيشتغل كل دقيقة — بياخد الرسايل المستحقة ويبعتها عن طريق المارد.
//
// أمان: بيبعت رسالة واحدة في كل تشغيلة كحد أقصى، وبيحترم السقف اليومي،
// وبيقف فورًا لو المارد مش متصل.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendText, upsertConversation } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_PER_DAY = Number(process.env.WA_MAX_PER_DAY || 25)
const MAX_PER_RUN = Number(process.env.WA_MAX_PER_RUN || 1)

interface QueueRow {
  id: string
  recipient_phone: string
  recipient_name: string | null
  message_content: string
  attempts: number | null
}

export async function GET(request: NextRequest) {
  // Vercel Cron بيبعت الهيدر ده — أو سر يدوي
  const auth = request.headers.get('authorization')
  const secret = request.headers.get('x-madmona-secret')
  const isVercelCron = auth === `Bearer ${process.env.CRON_SECRET}`
  const isManual = process.env.WA_SERVICE_SECRET && secret === process.env.WA_SERVICE_SECRET
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // ── ١) المارد متصل؟ لو لأ منبعتش خالص ────────────────────────────────
  try {
    const base = (process.env.WA_SERVICE_URL || '').replace(/\/$/, '')
    if (!base) return NextResponse.json({ ok: false, error: 'WA_SERVICE_URL ناقص' })
    const h = await fetch(`${base}/health`, { signal: AbortSignal.timeout(8000) })
    const health = await h.json()
    if (!health?.connected) {
      return NextResponse.json({ ok: true, skipped: 'المارد مش متصل', sent: 0 })
    }
  } catch {
    return NextResponse.json({ ok: true, skipped: 'فشل فحص صحة المارد', sent: 0 })
  }

  // ── ٢) السقف اليومي ──────────────────────────────────────────────────
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const { data: todayRaw } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('id')
    .eq('status', 'sent')
    .gte('sent_at', dayStart.toISOString())

  const sentToday = (todayRaw ?? []).length
  if (sentToday >= MAX_PER_DAY) {
    return NextResponse.json({ ok: true, skipped: 'السقف اليومي اتوصل', sent_today: sentToday })
  }

  // ── ٣) الرسايل المستحقة ──────────────────────────────────────────────
  const { data: dueRaw } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('id, recipient_phone, recipient_name, message_content, attempts')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(MAX_PER_RUN)

  const due = (dueRaw ?? []) as unknown as QueueRow[]
  if (due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: 'مفيش رسايل مستحقة' })
  }

  const results: Array<{ id: string; phone: string; ok: boolean; error?: string }> = []

  for (const row of due) {
    // قفل متفائل — نحوّل الحالة قبل الإرسال عشان مانبعتش مرتين
    const { data: locked } = await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .update({ status: 'sending', attempts: (row.attempts ?? 0) + 1 } as never)
      .eq('id', row.id)
      .eq('status', 'queued')
      .select('id')

    if (!locked || locked.length === 0) continue // حد تاني خدها

    const conversationId = await upsertConversation({
      phone: row.recipient_phone,
      name: row.recipient_name ?? undefined,
      agentName: 'المارد',
    })

    const sent = await sendText({
      to: row.recipient_phone,
      body: row.message_content,
      conversationId: conversationId ?? undefined,
      agentName: 'المارد',
      aiGenerated: false,
    })

    await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .update({
        status: sent.ok ? 'sent' : 'failed',
        sent_at: sent.ok ? new Date().toISOString() : null,
        whatsapp_msg_id: sent.wa_message_id ?? null,
        error_message: sent.ok ? null : sent.error ?? 'unknown',
      } as never)
      .eq('id', row.id)

    results.push({ id: row.id, phone: row.recipient_phone, ok: sent.ok, error: sent.error })
  }

  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    sent_today: sentToday + results.filter((r) => r.ok).length,
    daily_cap: MAX_PER_DAY,
    results,
  })
}
