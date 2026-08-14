// ============================================================================
// /api/verify-call  —  إثبات الرقم بالاتصال
//
// POST { phone, exclude? }  → يبدأ طلب تحقق ويرجّع الرقم اللي العميل يرن عليه
// GET  ?id=<uuid>           → حالة الطلب (الواجهة بتسأل كل شوية)
//
// العميل بيكتب رقمه ويرن على رقمنا **من نفس الرقم**. المكالمة بتوصل على
// /api/verify-call/incoming وبنقفلها قبل ما نرد. الرقمين اتطابقوا ⇒ إثبات.
//
// ⚠️ مفيش نبضات (قرار محمد ٢ أغسطس ٢٠٢٦). التبديل بين الأرقام بيحصل
//    بالاستخدام: لو المكالمة مالحقتش، الواجهة بتطلب رقم تاني بـ`exclude`.
// ============================================================================
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

const tail10 = (p: string) => (p || '').replace(/\D/g, '').slice(-10)
const isEgyptianMobile = (p: string) => /^1[0125]\d{8}$/.test(tail10(p))

export async function POST(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })
  const profileId = auth.user!.id

  let body: { phone?: string; exclude?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_body' }, { status: 400 }) }

  const raw = (body.phone || '').trim()
  if (!isEgyptianMobile(raw)) {
    return NextResponse.json({ error: 'رقم مش صحيح — اكتب رقم موبايل مصري' }, { status: 400 })
  }
  const phone = '+20' + tail10(raw)

  // 🔒 الملكية بالرقم حاجة حساسة — مانسمحش يوثّق رقم مربوط بحساب تاني
  // @ts-ignore loose typing
  const { data: taken } = await supabaseAdmin
    .from('profiles').select('id').eq('phone', phone).neq('id', profileId).maybeSingle()
  if (taken) {
    return NextResponse.json({ error: 'الرقم ده متسجل على حساب تاني' }, { status: 409 })
  }

  // @ts-ignore rpc not in generated types
  const { data: picked, error: pickErr } = await supabaseAdmin
    .rpc('pick_verify_number', { p_exclude: body.exclude || undefined })
  const number = Array.isArray(picked) ? picked[0] : picked
  if (pickErr || !number?.phone) {
    console.error('[verify-call] مفيش رقم متاح', pickErr)
    return NextResponse.json({ error: 'خدمة التحقق مش متاحة دلوقتي — جرّب بعدين' }, { status: 503 })
  }

  // نلغي أي طلب معلّق قديم لنفس الشخص عشان المطابقة ماتتلغبطش
  // @ts-ignore new schema
  await supabaseAdmin.from('phone_call_verifications')
    .update({ status: 'expired' })
    .eq('profile_id', profileId).eq('status', 'pending')

  // @ts-ignore new schema
  const { data: v, error } = await supabaseAdmin
    .from('phone_call_verifications')
    .insert({ profile_id: profileId, phone, phone_k: tail10(phone), issued_number_id: number.id })
    .select('id, expires_at')
    .single()

  if (error || !v) {
    console.error('[verify-call] فشل إنشاء الطلب', error)
    return NextResponse.json({ error: 'حصلت مشكلة — جرّب تاني' }, { status: 500 })
  }

  return NextResponse.json({
    id: v.id,
    expires_at: v.expires_at,
    call_number: number.phone,
    call_number_id: number.id,
  })
}

export async function GET(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

  // @ts-ignore new schema
  const { data } = await supabaseAdmin
    .from('phone_call_verifications')
    .select('status, phone, expires_at')
    .eq('id', id)
    .eq('profile_id', auth.user!.id)   // 🔒 محدش يسأل عن طلب حد تاني
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const expired = data.status === 'pending' && new Date(data.expires_at) < new Date()
  return NextResponse.json({
    status: expired ? 'expired' : data.status,
    phone: data.status === 'verified' ? data.phone : null,
  })
}
