// src/app/api/whatsapp/queue/route.ts
// طابور إرسال المارد — إضافة حملة للطابور بجدولة زمنية آمنة.
//
// مابيبعتش حاجة فورًا. بيحط الرسايل في whatsapp_campaign_messages
// بمواعيد متباعدة عشوائيًا، والكرون هو اللي بيبعت واحدة واحدة.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { normalizePhone } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── حدود الأمان (الرقم اتعاد تسجيله ١٩ يوليو ٢٠٢٦) ───────────────────────
const SAFETY = {
  maxPerDay: Number(process.env.WA_MAX_PER_DAY || 25),
  minGapSec: Number(process.env.WA_MIN_GAP_SEC || 60),
  maxGapSec: Number(process.env.WA_MAX_GAP_SEC || 180),
  startHour: 10, // بتوقيت القاهرة
  endHour: 20,
}

interface Recipient {
  phone: string
  name?: string | null
  message: string // نص مخصص لكل واحد — مش قالب موحّد
}

/** أول موعد صالح داخل ساعات العمل بتوقيت القاهرة */
function nextBusinessSlot(from: Date): Date {
  const d = new Date(from)
  for (let guard = 0; guard < 14; guard++) {
    const cairoHour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        hour12: false,
      }).format(d)
    )
    if (cairoHour >= SAFETY.startHour && cairoHour < SAFETY.endHour) return d
    d.setMinutes(d.getMinutes() + 30)
  }
  return d
}

export async function POST(request: NextRequest) {
  // حماية: نفس سر الخدمة أو سر الكرون
  const secret = request.headers.get('x-madmona-secret')
  const okSecret =
    (process.env.WA_SERVICE_SECRET && secret === process.env.WA_SERVICE_SECRET) ||
    (process.env.CRON_SECRET && secret === process.env.CRON_SECRET)
  if (!okSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: {
    campaign_name?: string
    recipients?: Recipient[]
    dry_run?: boolean
    skip_recent_days?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const recipients = body.recipients ?? []
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ ok: false, error: 'recipients مطلوبة' }, { status: 400 })
  }

  const skipDays = body.skip_recent_days ?? 3
  const since = new Date(Date.now() - skipDays * 86400_000).toISOString()

  // ── ١) استبعاد اللي كلمناهم قريّب ────────────────────────────────────
  const { data: recentRaw } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('contact_phone')
    .gte('last_outbound_at', since)
  const recent = new Set(
    ((recentRaw ?? []) as Array<{ contact_phone: string }>).map((r) =>
      normalizePhone(r.contact_phone)
    )
  )

  // ── ٢) استبعاد اللي في الطابور بالفعل ────────────────────────────────
  const { data: queuedRaw } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('recipient_phone')
    .eq('status', 'queued')
  const queued = new Set(
    ((queuedRaw ?? []) as Array<{ recipient_phone: string }>).map((r) =>
      normalizePhone(r.recipient_phone)
    )
  )

  // ── ٣) بناء الطابور بفواصل عشوائية ───────────────────────────────────
  const rows: Array<Record<string, unknown>> = []
  const skipped: Array<{ phone: string; reason: string }> = []
  let cursor = nextBusinessSlot(new Date(Date.now() + 60_000))
  let dayCount = 0
  let dayKey = cursor.toDateString()

  for (const r of recipients) {
    const phone = normalizePhone(r.phone)
    if (!phone) {
      skipped.push({ phone: r.phone, reason: 'رقم غير صالح' })
      continue
    }
    if (recent.has(phone)) {
      skipped.push({ phone, reason: `اتواصلنا معاه خلال ${skipDays} أيام` })
      continue
    }
    if (queued.has(phone)) {
      skipped.push({ phone, reason: 'موجود في الطابور بالفعل' })
      continue
    }
    if (!r.message?.trim()) {
      skipped.push({ phone, reason: 'مفيش نص رسالة' })
      continue
    }

    // سقف يومي — لو اتعدّى ننقل لليوم اللي بعده
    if (cursor.toDateString() !== dayKey) {
      dayKey = cursor.toDateString()
      dayCount = 0
    }
    if (dayCount >= SAFETY.maxPerDay) {
      cursor = new Date(cursor)
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(SAFETY.startHour, 0, 0, 0)
      cursor = nextBusinessSlot(cursor)
      dayKey = cursor.toDateString()
      dayCount = 0
    }

    rows.push({
      campaign_id: null,
      recipient_phone: phone,
      recipient_name: r.name ?? null,
      message_content: r.message.trim(),
      status: 'queued',
      channel: 'marid',
      scheduled_for: cursor.toISOString(),
      template_vars: { campaign_name: body.campaign_name ?? 'manual' },
    })

    dayCount++
    const gap =
      SAFETY.minGapSec + Math.floor(Math.random() * (SAFETY.maxGapSec - SAFETY.minGapSec))
    cursor = nextBusinessSlot(new Date(cursor.getTime() + gap * 1000))
  }

  // ── ٤) عرض بدون تنفيذ ────────────────────────────────────────────────
  if (body.dry_run) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      would_queue: rows.length,
      skipped_count: skipped.length,
      skipped: skipped.slice(0, 20),
      first_send: rows[0]?.scheduled_for ?? null,
      last_send: rows[rows.length - 1]?.scheduled_for ?? null,
      safety: SAFETY,
    })
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, queued: 0, skipped_count: skipped.length, skipped })
  }

  const { error } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .insert(rows as never)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    queued: rows.length,
    skipped_count: skipped.length,
    first_send: rows[0]?.scheduled_for,
    last_send: rows[rows.length - 1]?.scheduled_for,
  })
}

// حالة الطابور
export async function GET() {
  const { data } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('status')
    .in('status', ['queued', 'sent', 'failed'])

  const counts = ((data ?? []) as Array<{ status: string }>).reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {}
  )
  return NextResponse.json({ ok: true, counts, safety: SAFETY })
}
