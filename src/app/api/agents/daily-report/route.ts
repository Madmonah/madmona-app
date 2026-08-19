// src/app/api/agents/daily-report/route.ts
// Daily Report Agent: runs daily at 10 PM Cairo time (8 PM UTC) via Vercel Cron

import { NextRequest, NextResponse } from 'next/server'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { DAILY_REPORT_PROMPT } from '@/lib/agent-prompts/daily-report'

export const runtime = 'nodejs'
export const maxDuration = 60

interface DailyMetrics {
  date: string
  today: {
    new_signups_total: number
    new_suppliers: number
    new_customers: number
    new_listings: number
    new_bookings: number
    bookings_value_egp: number
  }
  // 🆕 ١٩ أغسطس ٢٠٢٦: محمد لاحظ ٧٥ إعلان اتعمل النهارده ونشر منهم ٢٥ بس،
  // والفجوة دي مكانتش ظاهرة في التقرير خالص — new_listings كان بيعدّ كل
  // إعلان اتعمل بغض النظر عن حالته (منشور/درافت/متوقف). دلوقتي التقرير
  // بيفصّل الحالات صراحة عشان الفجوة تبقى ظاهرة من غير ما حد يسأل ليه.
  listings_breakdown_today: {
    created_total: number
    published: number
    draft: number
    paused: number
    other: number
    publish_gap: number // created_total - published — لو كبير ده تنبيه
  }
  past_7_days_avg: {
    daily_signups: number
    daily_listings: number
    daily_bookings: number
  }
  totals: {
    suppliers: number
    listings: number
    bookings: number
    total_revenue_egp: number
  }
  recent_signups_sample: Array<{
    role: string
    created_at: string
    has_listing: boolean
  }>
}

interface ReportOutput {
  headline: string
  summary: string
  wins: string[]
  concerns: string[]
  actions_recommended: string[]
  metrics_highlights: {
    biggest_change: string
    trend_alert: string
  }
}

async function gatherMetrics(): Promise<DailyMetrics> {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const todayStartIso = todayStart.toISOString()
  const sevenDaysAgoIso = sevenDaysAgo.toISOString()

  const { count: newSignupsToday } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStartIso)

  const { count: newSuppliersToday } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStartIso)

  const { count: newListingsToday } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStartIso)

  // 🆕 ١٩ أغسطس ٢٠٢٦: تفصيل الحالة — مش بس عدد إجمالي. لازم نعرف كام
  // منهم فعلاً وصل للماركتبليس (published) وكام عالق (draft/paused).
  const { data: todayListingsByStatus } = await supabaseAdmin
    .from('listings')
    .select('status')
    .gte('created_at', todayStartIso)

  type StatusRow = { status?: string | null }
  const statusRows = (todayListingsByStatus ?? []) as StatusRow[]
  const publishedToday = statusRows.filter((r) => r.status === 'published').length
  const draftToday = statusRows.filter((r) => r.status === 'draft').length
  const pausedToday = statusRows.filter((r) => r.status === 'paused').length
  const otherToday = statusRows.length - publishedToday - draftToday - pausedToday

  const { data: todayBookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('id, total_amount, created_at')
    .gte('created_at', todayStartIso)

  type BookingRow = { total_amount?: number | string | null }
  const todayBookingRows = (todayBookings ?? []) as BookingRow[]
  const newBookingsToday = todayBookingRows.length
  const bookingsValueToday = todayBookingRows.reduce(
    (sum, b) => sum + (Number(b.total_amount) || 0),
    0
  )

  const { count: signups7d } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgoIso)
    .lt('created_at', todayStartIso)

  const { count: listings7d } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgoIso)
    .lt('created_at', todayStartIso)

  const { count: bookings7d } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgoIso)
    .lt('created_at', todayStartIso)

  const { count: totalSuppliers } = await supabaseAdmin
    .from('marketplace_suppliers')
    .select('*', { count: 'exact', head: true })

  const { count: totalListings } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true })

  const { data: allBookings } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('total_amount')

  const allBookingRows = (allBookings ?? []) as BookingRow[]
  const totalRevenue = allBookingRows.reduce(
    (sum, b) => sum + (Number(b.total_amount) || 0),
    0
  )

  const { data: recentSignups } = await supabaseAdmin
    .from('profiles')
    .select('role, created_at')
    .gte('created_at', todayStartIso)
    .order('created_at', { ascending: false })
    .limit(5)

  type SignupRow = { role: string; created_at: string }
  const signupRows = (recentSignups ?? []) as SignupRow[]

  const newCustomersToday = (newSignupsToday ?? 0) - (newSuppliersToday ?? 0)

  return {
    date: todayStart.toISOString().split('T')[0],
    today: {
      new_signups_total: newSignupsToday ?? 0,
      new_suppliers: newSuppliersToday ?? 0,
      new_customers: Math.max(0, newCustomersToday),
      new_listings: newListingsToday ?? 0,
      new_bookings: newBookingsToday,
      bookings_value_egp: Math.round(bookingsValueToday),
    },
    listings_breakdown_today: {
      created_total: statusRows.length,
      published: publishedToday,
      draft: draftToday,
      paused: pausedToday,
      other: Math.max(0, otherToday),
      publish_gap: Math.max(0, statusRows.length - publishedToday),
    },
    past_7_days_avg: {
      daily_signups: Number(((signups7d ?? 0) / 7).toFixed(1)),
      daily_listings: Number(((listings7d ?? 0) / 7).toFixed(1)),
      daily_bookings: Number(((bookings7d ?? 0) / 7).toFixed(1)),
    },
    totals: {
      suppliers: totalSuppliers ?? 0,
      listings: totalListings ?? 0,
      bookings: allBookingRows.length,
      total_revenue_egp: Math.round(totalRevenue),
    },
    recent_signups_sample: signupRows.map((s) => ({
      role: s.role,
      created_at: s.created_at,
      has_listing: false,
    })),
  }
}

async function runAgent() {
  const runStart = Date.now()

  const { data: run } = await supabaseAdmin
    .from('agent_runs')
    .insert({
      agent_name: 'daily-report',
      trigger_type: 'cron',
      status: 'started',
    } as never)
    .select('id')
    .single()

  const runId = (run as { id?: string } | null)?.id

  try {
    const metrics = await gatherMetrics()
    const userMessage = `بيانات النهارده + المتوسطات:\n\n${JSON.stringify(metrics, null, 2)}`

    const claudeText = await callClaude({
      systemPrompt: DAILY_REPORT_PROMPT,
      userMessage,
      maxTokens: 1536,
      temperature: 0.4,
    })

    const report = parseJsonResponse<ReportOutput>(claudeText)
    const emailHtml = buildReportEmailHtml(report, metrics)
    const ownerEmail = process.env.MADMONA_OWNER_EMAIL ?? 'madmona.admin@gmail.com'

    const sendResult = await sendEmail({
      to: ownerEmail,
      subject: `📊 تقرير ${metrics.date} — ${report.headline}`,
      html: emailHtml,
    })

    if (!sendResult.ok) {
      throw new Error(`Email send failed: ${sendResult.error}`)
    }

    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          input_payload: metrics as unknown as Record<string, unknown>,
          output_summary: {
            headline: report.headline,
            email_id: sendResult.id,
            wins_count: report.wins.length,
            concerns_count: report.concerns.length,
            sent_to: ownerEmail,
          },
        } as never)
        .eq('id', runId)
    }

    return { success: true, report, metrics, email_id: sendResult.id, sent_to: ownerEmail }
  } catch (err) {
    const error = err as Error
    if (runId) {
      await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          error_message: error.message,
        } as never)
        .eq('id', runId)
    }
    throw error
  }
}

function buildReportEmailHtml(report: ReportOutput, m: DailyMetrics): string {
  const wins = report.wins.length
    ? report.wins.map((w) => `<li>${escapeHtml(w)}</li>`).join('')
    : '<li style="color:#999">مفيش wins خاصة النهارده</li>'

  const concerns = report.concerns.length
    ? report.concerns.map((c) => `<li>${escapeHtml(c)}</li>`).join('')
    : '<li style="color:#999">مفيش مخاوف النهارده ✓</li>'

  const actions = report.actions_recommended.length
    ? report.actions_recommended.map((a) => `<li>${escapeHtml(a)}</li>`).join('')
    : '<li style="color:#999">مفيش action عاجل</li>'

  return `<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 680px; margin: 0 auto; padding: 24px;">

  <div style="background: #059669; color: #FAF7F0; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
    <p style="margin: 0; opacity: 0.7; font-size: 12px;">📊 تقرير ${m.date}</p>
    <h2 style="margin: 8px 0 0 0; color: #FAF7F0; font-size: 22px;">${escapeHtml(report.headline)}</h2>
  </div>

  <div style="background: #FAF7F0; padding: 16px 20px; border-right: 4px solid #2FA084; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 15px;">${escapeHtml(report.summary)}</p>
  </div>

  <h3 style="color: #059669; margin-top: 24px;">📈 أرقام النهارده</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr style="background: #FAF7F0;"><td style="padding: 8px;">مؤجرين جداد</td><td style="padding: 8px; font-weight: bold;">${m.today.new_suppliers}</td></tr>
    <tr><td style="padding: 8px;">مستأجرين جداد</td><td style="padding: 8px; font-weight: bold;">${m.today.new_customers}</td></tr>
    <tr style="background: #FAF7F0;"><td style="padding: 8px;">إعلانات جديدة</td><td style="padding: 8px; font-weight: bold;">${m.today.new_listings}</td></tr>
    <tr><td style="padding: 8px;">حجوزات جديدة</td><td style="padding: 8px; font-weight: bold;">${m.today.new_bookings}</td></tr>
    <tr style="background: #FAF7F0;"><td style="padding: 8px;">قيمة الحجوزات</td><td style="padding: 8px; font-weight: bold;">${m.today.bookings_value_egp.toLocaleString('en-US')} ج</td></tr>
  </table>

  <h3 style="color: #059669; margin-top: 24px;">📋 تفصيل الإعلانات الجديدة</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr style="background: #FAF7F0;"><td style="padding: 8px;">اتعمل النهارده</td><td style="padding: 8px; font-weight: bold;">${m.listings_breakdown_today.created_total}</td></tr>
    <tr><td style="padding: 8px;">✅ اتنشر فعلاً</td><td style="padding: 8px; font-weight: bold; color:#059669;">${m.listings_breakdown_today.published}</td></tr>
    <tr style="background: #FAF7F0;"><td style="padding: 8px;">📝 لسه درافت</td><td style="padding: 8px; font-weight: bold;">${m.listings_breakdown_today.draft}</td></tr>
    <tr><td style="padding: 8px;">⏸️ متوقف (paused)</td><td style="padding: 8px; font-weight: bold;">${m.listings_breakdown_today.paused}</td></tr>
    ${m.listings_breakdown_today.publish_gap > 0
      ? `<tr style="background:#FEF3C7;"><td style="padding: 8px; font-weight:bold;">⚠️ الفجوة (اتعمل ومانشرش)</td><td style="padding: 8px; font-weight: bold; color:#B45309;">${m.listings_breakdown_today.publish_gap}</td></tr>`
      : ''}
  </table>

  <h3 style="color: #059669; margin-top: 24px;">✅ Wins</h3>
  <ul style="padding-right: 20px;">${wins}</ul>

  <h3 style="color: #6FCF97; margin-top: 24px;">⚠️ محتاج انتباه</h3>
  <ul style="padding-right: 20px;">${concerns}</ul>

  <h3 style="color: #059669; margin-top: 24px;">🎯 Actions لبكره</h3>
  <ul style="padding-right: 20px;">${actions}</ul>

  <h3 style="color: #059669; margin-top: 24px;">📌 Highlights</h3>
  <p><strong>أكبر تغير:</strong> ${escapeHtml(report.metrics_highlights.biggest_change)}</p>
  <p><strong>Trend Alert:</strong> ${escapeHtml(report.metrics_highlights.trend_alert)}</p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 32px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">Daily Report Agent — مضمونة 🤝<br>إجمالي: ${m.totals.suppliers} مؤجر، ${m.totals.listings} إعلان، ${m.totals.bookings} حجز، ${m.totals.total_revenue_egp.toLocaleString('en-US')} ج</p>
</div>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ============================================================================
// HTTP handlers
// ============================================================================

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  // 🔒 (١٢ أغسطس ٢٠٢٦) fail-closed: لو CRON_SECRET مش متظبط المسار يقفل مش يفتح
  if (!process.env.CRON_SECRET || cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAgent()
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    console.error('Daily Report agent error:', error)
    return NextResponse.json(
      { error: 'Agent failed', detail: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    !process.env.AGENT_WEBHOOK_SECRET ||
    authHeader !== `Bearer ${process.env.AGENT_WEBHOOK_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAgent()
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    return NextResponse.json(
      { error: 'Agent failed', detail: error.message },
      { status: 500 }
    )
  }
}
