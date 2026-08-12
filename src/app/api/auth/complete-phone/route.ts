import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePhone } from '@/lib/auth-helpers'
import { sendLoginWelcome } from '@/lib/wa-welcome'

export const dynamic = 'force-dynamic'

// Server-side admin client (service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

// =====================================================================
// POST /api/auth/complete-phone
// -----------------------------------------------------------------
// يربط رقم واتساب *متأكّد منه بالوارد* بحساب داخل بجوجل حاليًا.
//
// ⚠️ التوحيد (٢٣ يوليو): مفيش OTP بارد خالص. حساب جوجل بياخد منه الإيميل
//    والاسم بس — لكن *لازم* يوثّق رقمه بنفس طريقة الدخول: يبعت كود MADxxxxx
//    للمارد على واتساب. الرقم بيتأكّد من *مصدر الرسالة* (محدش يبعت برقم غيره)،
//    والوارد شغّال دايمًا حتى تحت الحظر. مضمونة مابتبعتش أي رسالة متولّدة.
//
// Headers: Authorization: Bearer <access_token>
// Body: { code: "MADxxxxx", next?: "/somewhere" }
// التدفّق: تأكيد الجلسة → قراءة الكود المتأكّد من wa_inbound_verifications
//          → استخراج الرقم المُثبت → التأكد إنه مش مربوط بحساب تاني →
//          حفظه على البروفايل → استهلاك الكود → رد ترحيب (رد مسموح).
// =====================================================================
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'no_session', message: 'لازم تكون داخل بحسابك' },
        { status: 401 },
      )
    }

    // 1) تأكيد الجلسة → المستخدم الحالي (حساب جوجل)
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: 'invalid_session', message: 'الجلسة مش صالحة، سجّل دخول تاني' },
        { status: 401 },
      )
    }
    const userId = userData.user.id
    const meta = (userData.user.user_metadata || {}) as Record<string, unknown>
    const fullName =
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      null

    const body = await req.json().catch(() => ({}))
    const code = String(body.code || '').trim().toUpperCase()
    const next = typeof body.next === 'string' ? body.next : ''
    if (!/^MAD[A-Z0-9]{5}$/.test(code)) {
      return NextResponse.json(
        { ok: false, error: 'bad_code', message: 'الكود مش مظبوط' },
        { status: 400 },
      )
    }

    // 2) اقرا الكود المتأكّد من الوارد (الويبهوك بيأكّده لما العميل يبعته للمارد)
    const { data: row } = await supabase
      .from('wa_inbound_verifications')
      .select('id, verified, verified_phone, expires_at, session_minted_at')
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!row?.verified || !row.verified_phone) {
      return NextResponse.json(
        { ok: false, error: 'not_verified', message: 'لسه مستنيين رسالتك على واتساب' },
        { status: 400 },
      )
    }
    if (row.session_minted_at) {
      return NextResponse.json(
        { ok: false, error: 'already_used', message: 'الكود ده اتستخدم قبل كده، اطلب كود جديد' },
        { status: 400 },
      )
    }
    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, error: 'expired', message: 'الكود انتهت صلاحيته، اطلب كود جديد' },
        { status: 400 },
      )
    }

    // 3) استخرج الرقم المُثبت. لو وصلنا مُعرّف مخفي (LID)، نحاول نحلّه من wa_lid_map.
    let normalized = normalizePhone(row.verified_phone)
    if (!normalized) {
      const digits = String(row.verified_phone).replace(/\D/g, '')
      if (digits.length >= 10) {
        const { data: map } = await supabase
          .from('wa_lid_map').select('phone').eq('lid', digits).maybeSingle()
        const mapped = (map as { phone?: string } | null)?.phone
        if (mapped) normalized = normalizePhone(mapped)
      }
    }

    // استهلك الكود دلوقتي (يمنع إعادة الاستخدام) — بننجّح حتى لو الرقم مخفي
    await supabase
      .from('wa_inbound_verifications')
      .update({ session_minted_at: new Date().toISOString() } as never)
      .eq('id', row.id)

    // 4) لو الرقم مخفي بلا تطابق: العميل أثبت تحكّمه في واتساب بس مفيش رقم حقيقي
    //    نخزّنه. نعتبره «موثّق واتساب» عشان مايفضلش يترجّع لصفحة التوثيق (loop)،
    //    ونكمّله. رد الترحيب برضه بيتبعت (رد مسموح).
    if (!normalized) {
      try {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { ...meta, wa_verified: true, wa_lid: String(row.verified_phone).replace(/\D/g, '') || null },
        })
      } catch (e) { console.warn('[complete-phone] lid meta update failed:', e) }
      await sendLoginWelcome(supabase, { code, verifiedPhone: String(row.verified_phone), fullName, next })
      return NextResponse.json({ ok: true, phone: null, lid: true, message: 'تم توثيق واتسابك ✅' })
    }

    const e164 = normalized                    // +2010xxxxxxxx
    const local010 = '0' + normalized.slice(3) // 010xxxxxxxx
    const bare20 = normalized.slice(1)          // 2010xxxxxxxx

    // 5) اتأكد إن الرقم مش مربوط بحساب تاني (بكل الصيغ المخزّنة في المشروع)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .in('phone', [e164, local010, bare20])
      .neq('id', userId)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'phone_taken',
          message: 'الرقم ده مربوط بحساب تاني. لو الحساب بتاعك، ادخل بالواتساب بالرقم ده مباشرة.',
        },
        { status: 409 },
      )
    }

    // 6) احفظ الرقم المُثبت على البروفايل (بصيغة +20 زي الغالبية والـcallback)
    const { error: updErr, count } = await supabase
      .from('profiles')
      .update({ phone: e164 } as never, { count: 'exact' })
      .eq('id', userId)
    if (updErr) {
      // تعارض فريد نادر (سباق) → عامله زي «مربوط بحساب تاني»
      if (/duplicate|unique/i.test(updErr.message)) {
        return NextResponse.json(
          { ok: false, error: 'phone_taken', message: 'الرقم ده مربوط بحساب تاني.' },
          { status: 409 },
        )
      }
      console.error('[complete-phone] profile update error:', updErr)
      return NextResponse.json(
        { ok: false, error: 'update_failed', message: 'حصلت مشكلة وإحنا بنحفظ الرقم، حاول تاني' },
        { status: 500 },
      )
    }
    // لو مفيش صف بروفايل (نادر) — اعمله
    if (!count) {
      await supabase.from('profiles').insert({ id: userId, phone: e164, role: 'customer' } as never)
    }

    // خزّن الرقم + علامة التوثيق في auth metadata (يمنع loop صفحة التوثيق)
    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { ...meta, phone: local010, wa_verified: true },
      })
    } catch (e) { console.warn('[complete-phone] auth meta update failed:', e) }

    // مرآة على جدول users القديم لو موجود (best-effort)
    try { await supabase.from('users').update({ phone_number: e164 } as never).eq('id', userId) } catch { /* */ }

    // استلم أي مسوّدات إعلانات مربوطة بالرقم (زي التسجيل العادي) — best-effort
    // 🔒 (١٢ أغسطس ٢٠٢٦) بقى نداء RPC مباشر بدل HTTP للمسار العام —
    // المسار العام بقى محتاج Bearer المستخدم (مراجعة الأمان)، وإحنا هنا
    // سيرفر معانا service client أصلًا فمفيش داعي للفة الـHTTP.
    try {
      await supabase.rpc('claim_all_drafts_for_phone', {
        p_phone: e164,
        p_profile_id: userId,
      } as never)
    } catch (e) { console.warn('[complete-phone] claim-by-phone failed:', e) }

    // 7) رد ترحيب على رسالة الكود (رد مسموح) + اللينك اللي كان رايحه + شات المارد
    await sendLoginWelcome(supabase, { code, verifiedPhone: e164, fullName, next })

    return NextResponse.json({ ok: true, phone: e164, message: 'تم تأكيد رقمك ✅' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[complete-phone] exception:', e)
    return NextResponse.json(
      { ok: false, error: 'server_error', message: msg },
      { status: 500 },
    )
  }
}
