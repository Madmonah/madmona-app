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
  // 🔒 (١٢ أغسطس ٢٠٢٦) فحص وجود السر الأول — لو CRON_SECRET مش متظبط،
  //    `Bearer undefined` كان بيعدّي. (wa-sync كان بيعملها صح — دي كانت ناقصة هنا)
  const isVercelCron = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
  const isManual = process.env.WA_SERVICE_SECRET && secret === process.env.WA_SERVICE_SECRET
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // ── ١) المارد متصل؟ لو لأ منبعتش خالص ────────────────────────────────
  //
  // 🚨 (٢ أغسطس ٢٠٢٦) كان بيسأل `WA_SERVICE_URL/health` — وده جسر Baileys
  //    اللي اتشال. كان بيرجّع `connected:false` دايمًا، فالكرون كان بيقف
  //    عند البوابة دي كل دقيقة و**الطابور مقفول بالكامل** من غير أي أثر
  //    غير كلمة «المارد مش متصل» في رد مالوش قارئ.
  //
  //    دلوقتي بيسأل OpenWA: طالما فيه جلسة واحدة `ready`، الطابور يمشي.
  try {
    const base = (process.env.OPENWA_URL || '').replace(/\/$/, '')
    const key = process.env.OPENWA_API_KEY || ''
    if (!base || !key) {
      return NextResponse.json({ ok: false, error: 'OPENWA_URL أو OPENWA_API_KEY ناقص' })
    }
    const h = await fetch(`${base}/api/sessions`, {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const list = (await h.json()) as Array<{ status?: string }>
    const anyReady = Array.isArray(list) && list.some((s) => s?.status === 'ready')
    if (!anyReady) {
      return NextResponse.json({ ok: true, skipped: 'مفيش رقم متصل على OpenWA', sent: 0 })
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
  // ⚠️ (٦ أغسطس ٢٠٢٦) الحملات اللي ليها مُرسِل متخصص لازم تتستثنى هنا.
  //    `paced_20260806` بيديرها `/api/cron/wa-paced-send` بإيقاع 3 كل 3 دقايق
  //    وبوابة تأكيد تسليم. الكرون ده كان بيخطف صفوفها ويبعتها 1/دقيقة من 982 —
  //    يعني بيكسر الإيقاع والبوابة الاتنين، و15 رسالة فشلت كده لما 982 فصل.
  const PACED_CAMPAIGNS = ['paced_20260806']

  const { data: dueRaw, error: dueErr } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('id, recipient_phone, recipient_name, message_content, attempts')
    .eq('status', 'queued')
    .not('template_vars->>campaign_name', 'in', `(${PACED_CAMPAIGNS.join(',')})`)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(MAX_PER_RUN)

  // 🧹 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) ريبر الرسايل العالقة:
  // القفل المتفائل بيقلب الصف لـ'sending' قبل الإرسال — لو الدالة اتقطعت
  // (timeout/crash) قبل ما تحدّث الحالة النهائية، الصف كان بيفضل 'sending'
  // للأبد: لا بيتبعت ولا بيتعاد ولا بيبان في استعلام المستحق. أي صف
  // 'sending' بقاله أكتر من ١٠ دقايق = تشغيلة ماتت في النص → نرجّعه
  // 'queued' فيتعاد في التشغيلة الجاية. (attempts اتزادت وقت القفل فمش
  // هيتكرر بلا حدود لو فيه فشل حقيقي متكرر.)
  try {
    const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .update({ status: 'queued' } as never)
      .eq('status', 'sending')
      .lt('locked_at', stuckCutoff)
  } catch { /* الريبر مايوقفش الإرسال */ }

  // 🔎 (5 Aug 2026) ماتبلعش الخطأ — ده كان مخبي عطل الطابور المتجمد
  if (dueErr) {
    return NextResponse.json({ ok: false, error: 'due query failed', detail: dueErr.message })
  }

  const due = (dueRaw ?? []) as unknown as QueueRow[]
  if (due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: 'مفيش رسايل مستحقة' })
  }

  const results: Array<{ id: string; phone: string; ok: boolean; error?: string }> = []

  for (const row of due) {
    // قفل متفائل — نحوّل الحالة قبل الإرسال عشان مانبعتش مرتين
    const { data: locked, error: lockErr } = await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .update({ status: 'sending', attempts: (row.attempts ?? 0) + 1, locked_at: new Date().toISOString() } as never)
      .eq('id', row.id)
      .eq('status', 'queued')
      .select('id')

    // 🔎 (5 Aug 2026) لو القفل فشل بخطأ فعلي — سجّله في الرد بدل البلع
    if (lockErr) {
      results.push({ id: row.id, phone: row.recipient_phone, ok: false, error: 'lock: ' + lockErr.message })
      continue
    }
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
      // 🔧 (5 Aug 2026) من غير session بيقع على جسر Baileys الميت ويرجع 404
      // (المصيدة المسجلة في الذاكرة) — لازم نحدد جلسة OpenWA صراحةً
      session: process.env.WA_CAMPAIGN_SESSION || 'madmona-982',
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
