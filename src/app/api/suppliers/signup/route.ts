import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { defaultCommissionPercent } from '@/lib/commission'

// POST /api/suppliers/signup
//
// Anyone can submit a supplier application. The record is created with
// status='pending' and shows up in the admin queue for approval.
// We don't authenticate them yet — admin approves first, then we issue
// credentials in a follow-up step.
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const {
    business_name,
    contact_name,
    contact_phone,
    contact_email,
    address,
    district,
    description_ar,
  } = body as Record<string, unknown>

  // ---- Required fields ----
  if (typeof business_name !== 'string' || business_name.trim().length < 2 || business_name.length > 200) {
    return NextResponse.json({ error: 'اسم النشاط مطلوب' }, { status: 400 })
  }
  if (typeof contact_name !== 'string' || contact_name.trim().length < 2 || contact_name.length > 200) {
    return NextResponse.json({ error: 'اسم المسؤول مطلوب' }, { status: 400 })
  }
  if (typeof contact_phone !== 'string') {
    return NextResponse.json({ error: 'رقم الموبايل مطلوب' }, { status: 400 })
  }

  // Egyptian phone validation (lenient — let admin verify)
  const cleanPhone = contact_phone.replace(/\D/g, '')
  if (!/^(01[0125]\d{8}|201[0125]\d{8})$/.test(cleanPhone)) {
    return NextResponse.json({ error: 'رقم الموبايل غير صحيح' }, { status: 400 })
  }
  const normalizedPhone = cleanPhone.startsWith('20') ? `+${cleanPhone}` : `+20${cleanPhone.slice(1)}`

  if (typeof contact_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
    return NextResponse.json({ error: 'البريد الإلكتروني غير صحيح' }, { status: 400 })
  }

  // ---- Optional fields ----
  const addressClean =
    typeof address === 'string' && address.length <= 500 ? address.trim() || null : null
  const districtClean =
    typeof district === 'string' && district.length <= 100 ? district.trim() || null : null
  const descriptionClean =
    typeof description_ar === 'string' && description_ar.length <= 2000
      ? description_ar.trim() || null
      : null

  // ---- Insert ----
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      business_name: business_name.trim(),
      contact_name: contact_name.trim(),
      contact_phone: normalizedPhone,
      contact_email: contact_email.trim().toLowerCase(),
      address: addressClean,
      district: districtClean,
      description_ar: descriptionClean,
      // 💰 (١٦ أغسطس ٢٠٢٦ — محمد: «كل قسم ليه العمولة بتاعته»)
      //    كان مكتوب `10.0` بالنص هنا. المشكلة مش إن الرقم غلط — المشكلة
      //    إنه رقم رابع منفصل عن الداتابيز والبرومبت والحملة، فأول ما محمد
      //    يغيّر النسبة الافتراضية من الشاشة يفضل كل مورد جديد بياخد ١٠٪.
      //    دلوقتي بيتقري من قاعدة `default` في `commission_rules`.
      //
      //    ⚠️ ده الافتراضي وقت التسجيل بس. العمولة الفعلية على كل حجز
      //    بتتحسب من قسم الإعلان نفسه (`commission_rate_for`)، لأن المورد
      //    الواحد ممكن يبيع في أكتر من قسم بعمولات مختلفة.
      commission_rate: await defaultCommissionPercent(),
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique_violation (email already exists)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مسجل بالفعل' },
        { status: 409 }
      )
    }
    console.error('[suppliers/signup] insert error:', error)
    return NextResponse.json({ error: 'حصل خطأ، حاول تاني' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    supplier_id: (data as { id: string } | null)?.id ?? null,
    message: 'تم استلام طلبك! هنراجعه ونتواصل معاك قريباً',
  })
}
