// =====================================================================
// 🔑 /api/auth/forgot-otp — كود «نسيت كلمة السر» على الواتساب
//
// 🐞 (٢٣ أغسطس ٢٠٢٦ — محمد: «اكونت عبير مش بيرضى يبعت أوتي بي»)
//
//    تاب «نسيت كلمة السر» كان بينده الـedge function `phone-auth`، وهي
//    بتبعت الواتساب على:
//        https://madmona-app-production.up.railway.app/send
//    الخدمة دي (جسر Baileys) **اتمسحت من رايلواي** — مكتوب بالنص في
//    src/lib/whatsapp.ts: «wa-service و wa-web اتمسحوا من رايلواي
//    والفولدرات اتشالت من الريبو». الـedge function فضلت مصوّبة عليها.
//
//    جرّبناها على البرودكشن برقم عبير والرد كان:
//        {"success":false,"error":"wa_send_failed_404"}
//
//    يعني الكود كان **بيتولّد ويتسجّل في الداتابيز** وبعدين الإرسال يفشل —
//    وشُفنا في madmona_otp_codes ٦ أكواد لنورا وعبير النهاردة محدش شافها.
//    وزيادة في الطين بلّة: الحد (٣ أكواد / ١٠ دقايق) بيتحسب على الأكواد
//    اللي اتولّدت، فكل محاولة فاشلة كانت بتقرّبهم من القفل.
//
//    الحل: الإرسال يعدّي من نفس المسار الحي اللي التطبيق كله بيستخدمه
//    (`sendText` → OpenWA) بدل ما يبقى في الـedge function مسار تاني
//    بيتنسى لما القناة تتغيّر. نفس الدرس اللي اتكرر النهاردة تلات مرات:
//    مسار تاني منسي = عطل صامت.
//
//    الـedge function لسه بتخدم `forgot_reset` وكود الإيميل — دول شغالين.
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabase as admin, supabaseUntyped } from '@/lib/supabase'
import { sendText } from '@/lib/whatsapp'
import { normalizePhone } from '@/lib/auth-helpers'
import { rateLimitOk, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WA_PRIMARY = '201002229982'  // البراند/المارد
const WA_FALLBACK = '201026222337' // البيزنس الموثّق

/** نفس منطق اختيار رقم الدخول في /api/auth/wa — الأساسي إلا لو متعطّل. */
async function pickWa(): Promise<string> {
  try {
    const { data } = await admin
      .from('wa_number_configs')
      .select('session_id, enabled')
      .in('session_id', [WA_PRIMARY, WA_FALLBACK])
    const rows = (data ?? []) as Array<{ session_id: string; enabled: boolean | null }>
    const primary = rows.find((r) => (r.session_id || '').replace(/\D/g, '') === WA_PRIMARY)
    return !primary || primary.enabled !== false ? WA_PRIMARY : WA_FALLBACK
  } catch {
    return WA_PRIMARY
  }
}

export async function POST(req: NextRequest) {
  let body: { phone?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'bad_json' }, { status: 400 })
  }

  const normalized = normalizePhone(String(body.phone || ''))
  if (!normalized) {
    return NextResponse.json({ success: false, error: 'اكتب رقم موبايل مصري صحيح (01XXXXXXXXX).' })
  }

  // 🔒 حد معدل واسع على الـIP — الحد الحقيقي (٣ أكواد/١٠ دقايق للرقم) جوّه
  //    madmona_request_otp نفسها. واسع عشان المكتب المشترك (نفس درس النهاردة).
  if (!(await rateLimitOk(admin, `forgot-otp:${clientIp(req)}`, 60, 600))) {
    return NextResponse.json({ success: false, error: 'الضغط عالي دلوقتي — استنى دقيقة وجرّب تاني.' })
  }

  // الحساب موجود أصلاً؟
  const { data: found, error: findErr } = await supabaseUntyped
    .rpc('find_auth_user_by_phone', { p_phone: normalized })
  if (findErr) {
    console.error('[forgot-otp] lookup failed:', findErr.message)
    return NextResponse.json({ success: false, error: 'حصلت مشكلة — جرّب تاني.' })
  }
  const user = (found as Array<{ user_id: string; email: string }> | null)?.[0]
  if (!user) {
    return NextResponse.json({ success: false, error: 'no_account_with_phone' })
  }

  // ولّد الكود
  const { data: otpRaw, error: otpErr } = await supabaseUntyped
    .rpc('madmona_request_otp', { p_phone: normalized, p_full_name: null })
  if (otpErr) {
    console.error('[forgot-otp] otp rpc failed:', otpErr.message)
    return NextResponse.json({ success: false, error: 'حصلت مشكلة — جرّب تاني.' })
  }
  const otp = otpRaw as { success?: boolean; error?: string; code?: string; wa_to?: string; phone?: string } | null
  if (!otp?.success || !otp.code) {
    return NextResponse.json({ success: false, error: otp?.error || 'حصلت مشكلة — جرّب تاني.' })
  }

  // ابعت على القناة الحية
  const res = await sendText({
    to: (otp.wa_to || normalized).replace(/\D/g, ''),
    session: await pickWa(),
    agentName: 'forgot-password',
    body: [
      '🔐 كود استرجاع كلمة السر في مضمونة:',
      `*${otp.code}*`,
      '',
      'لو مش انت اللي طلبته، تجاهل الرسالة دي.',
      '⏱ صالح ١٠ دقايق',
    ].join('\n'),
  })

  if (!res.ok) {
    // 🔊 السبب الحقيقي بيتسجّل ويترجّع مختصر — مش «حصلت مشكلة» صمّاء.
    //    ده اللي خلّى العطل ده يقعد مستخبي: الكود بيتولّد والإرسال يفشل
    //    في صمت، والمستخدم قاعد مستني رسالة عمرها ما اتبعتت.
    console.error('[forgot-otp] wa send failed:', res.error)
    return NextResponse.json({
      success: false,
      error: 'مقدرناش نبعت الكود على الواتساب دلوقتي — جرّب «كود على الإيميل» أو كلّم الإدارة.',
      detail: res.error,
    })
  }

  return NextResponse.json({ success: true, channel: 'whatsapp', sent_to: otp.phone || normalized })
}
