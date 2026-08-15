// src/lib/wa-queue.ts
// ============================================================================
// 📥 بناء طابور الإرسال — **مصدر واحد** لقواعد الأمان.
//
// 🐞 (١٥ أغسطس ٢٠٢٦) الكود ده كان جوه `/api/whatsapp/queue` مقفول بسر خدمة،
//    فالمتصفح مايقدرش يوصله — يعني مفيش شاشة تضيف أرقام، ومحمد كان بيستخدم
//    باكيدج محلي على الديسكتوب بيبعت **برّه البروتوكول** (من غير تأكيد وصول،
//    من غير إعادة إرسال بعد ٣ دقايق، ومن غير ما يبان في /admin/sending).
//
//    اتشال هنا عشان الراوتين الاتنين ينادوا عليه: راوت السر (للأنظمة) وراوت
//    الأدمن (للشاشة). **ممنوع** ننسخ القواعد دي في مكان تاني — تكرار المسارات
//    هو نفسه اللي خلّى /admin/leads و/admin/wa-numbers يشتغلوا على مصدر ميت.
//
// ⚠️ الملف ده بيحط في الطابور بس. اللي بيبعت فعلًا هو كرون wa-queue-send،
//    وهو اللي فيه: رسالة رسالة، انتظار إيصال «وصلت»، و٣ دقايق قبل الإعادة.
// ============================================================================

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { normalizePhone } from '@/lib/whatsapp'

// ── حدود الأمان (الرقم اتعاد تسجيله ١٩ يوليو ٢٠٢٦) ───────────────────────
export const SAFETY = {
  maxPerDay: Number(process.env.WA_MAX_PER_DAY || 25),
  minGapSec: Number(process.env.WA_MIN_GAP_SEC || 60),
  maxGapSec: Number(process.env.WA_MAX_GAP_SEC || 180),
  startHour: 10, // بتوقيت القاهرة
  endHour: 20,
}

export interface Recipient {
  phone: string
  name?: string | null
  message: string // نص مخصص لكل واحد — مش قالب موحّد
}

export interface QueueInput {
  campaign_name?: string
  recipients: Recipient[]
  dry_run?: boolean
  skip_recent_days?: number
}

export interface QueueResult {
  ok: boolean
  error?: string
  dry_run?: boolean
  queued?: number
  would_queue?: number
  skipped_count: number
  skipped?: Array<{ phone: string; reason: string }>
  first_send?: string | null
  last_send?: string | null
  safety?: typeof SAFETY
}

/** أول موعد صالح داخل ساعات العمل بتوقيت القاهرة */
export function nextBusinessSlot(from: Date): Date {
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

/**
 * بيحط حملة في الطابور بمواعيد متباعدة. مابيبعتش حاجة.
 * بيستبعد: رقم غير صالح، اللي اتواصلنا معاه خلال skip_recent_days،
 * اللي في الطابور بالفعل، واللي مالوش نص رسالة.
 */
export async function queueCampaign(input: QueueInput): Promise<QueueResult> {
  const recipients = input.recipients ?? []
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { ok: false, error: 'recipients مطلوبة', skipped_count: 0 }
  }

  const skipDays = input.skip_recent_days ?? 3
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
  const seen = new Set<string>()
  let cursor = nextBusinessSlot(new Date(Date.now() + 60_000))
  let dayCount = 0
  let dayKey = cursor.toDateString()

  for (const r of recipients) {
    const phone = normalizePhone(r.phone)
    if (!phone) {
      skipped.push({ phone: r.phone, reason: 'رقم غير صالح' })
      continue
    }
    // 🐞 تكرار الرقم جوه نفس اللزقة — الباكيدج المحلي كان بيبعتله مرتين.
    if (seen.has(phone)) {
      skipped.push({ phone, reason: 'مكرر في نفس القايمة' })
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
    seen.add(phone)

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
      template_vars: { campaign_name: input.campaign_name ?? 'manual' },
    })

    dayCount++
    const gap =
      SAFETY.minGapSec + Math.floor(Math.random() * (SAFETY.maxGapSec - SAFETY.minGapSec))
    cursor = nextBusinessSlot(new Date(cursor.getTime() + gap * 1000))
  }

  // ── ٤) عرض بدون تنفيذ ────────────────────────────────────────────────
  if (input.dry_run) {
    return {
      ok: true,
      dry_run: true,
      would_queue: rows.length,
      skipped_count: skipped.length,
      skipped: skipped.slice(0, 50),
      first_send: (rows[0]?.scheduled_for as string) ?? null,
      last_send: (rows[rows.length - 1]?.scheduled_for as string) ?? null,
      safety: SAFETY,
    }
  }

  if (rows.length === 0) {
    return { ok: true, queued: 0, skipped_count: skipped.length, skipped }
  }

  const { error } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .insert(rows as never)

  if (error) {
    return { ok: false, error: error.message, skipped_count: skipped.length }
  }

  return {
    ok: true,
    queued: rows.length,
    skipped_count: skipped.length,
    skipped: skipped.slice(0, 50),
    first_send: (rows[0]?.scheduled_for as string) ?? null,
    last_send: (rows[rows.length - 1]?.scheduled_for as string) ?? null,
  }
}
