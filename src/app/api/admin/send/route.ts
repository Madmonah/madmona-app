// src/app/api/admin/send/route.ts
// ============================================================================
// 📤 «ابعت» — الشاشة اللي بتضيف الأرقام، على البروتوكول بتاعنا.
//
// ليه (١٥ أغسطس ٢٠٢٦ — محمد: «كان في موديل للإرسال بنضيف فيه الأرقام»):
//    الموديل ده باكيدج محلي على الديسكتوب (واتساب باكيدج/wa_sender.js).
//    بيبعت **برّه** كل حاجة اتفقنا عليها:
//      ✗ مابيستناش إيصال «وصلت» — بيستنى الواتساب يقبل الرسالة بس
//      ✗ مفيش إعادة إرسال بعد ٣ دقايق لو الراجل قافل — بيسجّل error ويعدّي
//      ✗ مفيش ساعات عمل — بيبعت ٣ الفجر عادي
//      ✗ بيبعت من جلسة على جهازه، ومش بيبان في /admin/sending خالص
//
//    الراوت ده بيدخّل نفس السهولة (لزق أرقام + رسالة) على الطابور بتاع
//    السيرفر: كرون wa-queue-send هو اللي بيبعت — رسالة رسالة، بينتظر إيصال
//    «وصلت» قبل اللي بعدها، وبيعيد بعد ٣ دقايق لو مفيش إيصال، وكله بيبان
//    في /admin/sending.
//
// 🔒 الحارس بقى `isAdminRequest` من `@/lib/adminGate` — بيقبل كوكي جلسة
//    الأدمن زي الـmiddleware (كان `ADMIN_PASSWORD` القديم = 401 دايمًا).
//    (راوت /api/whatsapp/queue مقفول بسر خدمة، فالمتصفح مايوصلهوش — عشان
//     كده الشاشة كانت ناقصة من الأساس.)
//
// ⚠️ قواعد الأمان مش متكتوبة هنا — كلها في `src/lib/wa-queue.ts`، مصدر واحد.
// ============================================================================

import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { queueCampaign, type Recipient } from '@/lib/wa-queue'
import { getSafety } from '@/lib/wa-safety'
import { isAdminRequest } from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60


/** حالة الطابور + آخر اللي اتبعت */
// 🐞 (١٥ أغسطس ٢٠٢٦) نفس الغلاف بتاع /api/admin/sending — أي استثناء مش
//    متمسوك كان بيرجّع ٥٠٠ بجسم فاضي من غير ما يقول إيه اللي حصل.
export async function GET(request: Request) {
  try {
    return await handleGet(request)
  } catch (e) {
    const err = e as Error
    console.error('[admin/send] unhandled:', err)
    return NextResponse.json(
      { error: 'Unhandled', detail: `${err?.name || 'Error'}: ${err?.message || String(e)}` },
      { status: 500 },
    )
  }
}

async function handleGet(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: statuses } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('status')
  const counts = ((statuses ?? []) as Array<{ status: string }>).reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {},
  )

  const { data: upcoming } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('recipient_phone, recipient_name, scheduled_for, template_vars')
    .eq('status', 'queued')
    .order('scheduled_for', { ascending: true })
    .limit(25)

  // 📤 (١٥ أغسطس ٢٠٢٦ — محمد: «عايز أقدر أختار الرقم اللي هيبعت»)
  //    الشاشة محتاجة تعرف الأرقام المتاحة. بنجيبها حية من OpenWA،
  //    والافتراضي من `whatsapp_config.queue_send_session` — مش متكتوب في الكود.
  const [defaultSession, devices, safety] = await Promise.all([
    resolveDefaultSession(),
    listSessions(),
    // 🔀 (١٥ أغسطس ٢٠٢٦) الحدود بقت من الداتابيز — مش الثابت SAFETY.
    getSafety(),
  ])

  return NextResponse.json({
    ok: true,
    counts,
    safety,
    upcoming: upcoming ?? [],
    sessions: devices,
    default_session: defaultSession,
  })
}

interface SessionOption { session: string; status: string; connected: boolean; phone: string | null }

/** الجلسة الافتراضية — من الداتابيز مش من الكود، عشان تتغيّر من غير ديبلوي. */
async function resolveDefaultSession(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_config').select('value').eq('key', 'queue_send_session').maybeSingle()
    const v = (data as { value?: string } | null)?.value?.trim()
    if (v) return v
  } catch { /* بنكمّل بالافتراضي */ }
  return process.env.WA_CAMPAIGN_SESSION || 'madmona-982'
}

/** الأجهزة الحية من OpenWA — لو مش متاح بنرجّع ليستة فاضية والشاشة بتقول كده. */
async function listSessions(): Promise<SessionOption[]> {
  const base = (process.env.OPENWA_URL || '').replace(/\/$/, '')
  const key = process.env.OPENWA_API_KEY || ''
  if (!base || !key) return []
  try {
    const r = await fetch(`${base}/api/sessions`, {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!r.ok) return []
    const list = (await r.json()) as Array<{ id?: string; name?: string; phone?: string | number; status?: string }>
    return (Array.isArray(list) ? list : []).map((x) => {
      const status = String(x.status ?? '').toLowerCase()
      return {
        session: String(x.name ?? x.id ?? ''),
        status: String(x.status ?? '—'),
        connected: status.includes('connected') || status.includes('ready') || status.includes('authenticated'),
        phone: x.phone != null ? String(x.phone).replace(/\D/g, '') : null,
      }
    }).filter((x) => x.session)
  } catch {
    return []
  }
}

/**
 * 🧹 (٢٥/٨/٢٠٢٦ — محمد: «تقضيلي الارقام الي في الطابور او تخلي في اوبشن
 *    دينامك») DELETE = إلغاء كل الرسايل الـqueued فورًا (اختياريًا
 *    ?session=cars لجلسة واحدة). الطابور المتأخر كان بينطلق دفعة واحدة
 *    أول ما البوت يتوصل → بان للحساب.
 */
export async function DELETE(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = new URL(request.url).searchParams.get('session')
  let q = supabaseAdmin
    .from('whatsapp_campaign_messages')
    .update({ status: 'cancelled', error_message: 'اتلغى من شاشة ابعت 🧹' } as never)
    .eq('status', 'queued')
  // (٢٥/٨) عمود session موجود في الداتابيز بس ناقص من types المولّدة القديمة
  if (session) q = (q as unknown as { eq: (c: string, v: string) => typeof q }).eq('session', session)
  const { data, error } = await q.select('id')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, cancelled: (data ?? []).length })
}

/**
 * body: { campaign_name?, message?, recipients: [{phone, name?, message?}], dry_run?, skip_recent_days? }
 *
 * `message` = النص الموحّد. أي مستلم معاه `message` خاص بيغلب الموحّد.
 * من غير dry_run الرسايل بتتحط في الطابور فعلًا (لسه مش بتتبعت — الكرون بيبعت).
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    campaign_name?: string
    message?: string
    recipients?: Array<{ phone: string; name?: string | null; message?: string }>
    dry_run?: boolean
    skip_recent_days?: number
    /** الرقم اللي هيبعت. فاضي = الافتراضي من whatsapp_config. */
    session?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  // 🚨 أسامي محجوزة — كرون wa-queue-send بيتعامل معاها معاملة خاصة:
  //    `booking_alert` معفي من السقف اليومي (معاملاتي)، و`paced_20260806`
  //    مستثنى من الطابور العادي خالص (ليه مُرسِل متخصص). لو محمد كتب
  //    واحدة منهم كاسم حملة، الرسايل إما تعدّي السقف أو ماتتبعتش أبدًا.
  const RESERVED = ['booking_alert', 'paced_20260806']
  if (body.campaign_name && RESERVED.includes(body.campaign_name.trim())) {
    return NextResponse.json(
      { ok: false, error: `اسم الحملة «${body.campaign_name}» محجوز للنظام — اختار اسم تاني` },
      { status: 400 },
    )
  }

  const shared = (body.message || '').trim()
  const recipients: Recipient[] = (body.recipients ?? []).map((r) => ({
    phone: r.phone,
    name: r.name ?? null,
    message: (r.message || '').trim() || shared,
  }))

  if (!recipients.length) {
    return NextResponse.json({ ok: false, error: 'مفيش أرقام' }, { status: 400 })
  }
  if (!shared && recipients.some((r) => !r.message)) {
    return NextResponse.json(
      { ok: false, error: 'اكتب نص الرسالة — فيه أرقام من غير رسالة' },
      { status: 400 },
    )
  }

  const result = await queueCampaign({
    campaign_name: body.campaign_name || 'من الشاشة',
    recipients,
    dry_run: body.dry_run,
    skip_recent_days: body.skip_recent_days,
    session: body.session,
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
