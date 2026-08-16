// src/app/api/delivery/register/route.ts
// ============================================================================
// 🛵 تسجيل طيار جديد — بالأوراق
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «محتاجين منه يرفع صورة رخصة المركبة وصورة بطاقته»)
//
// POST multipart/form-data:
//   name · phone · vehicle · zones (مفصولة بفواصل)
//   national_id (ملف صورة) · vehicle_license (ملف صورة)
//
// بيرجّع لينك حسابه — والحساب بيبدأ «قيد المراجعة» لحد ما الأدمن يوافق.
//
// ⚠️ الأوراق بتتخزن في باكت `rider-docs` **البرايفت** — البطاقة والرخصة
//    أوراق هوية، مش زي صور الإعلانات. مفيش لينك عام ليها خالص؛ الأدمن
//    بيشوفها بروابط موقّتة (signed URLs) من شاشة المراجعة.
//
// ⚠️ الرفع من هنا (service role) مش من المتصفح مباشرة — عشان الباكت
//    يفضل مقفول ومفيش أي بوليسي عامة عليه.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped as db } from '@/lib/supabase'

export const runtime = 'nodejs'

const MAX_DOC_BYTES = 8 * 1024 * 1024 // ٨ ميجا للصورة الواحدة كفاية لأي بطاقة

async function uploadDoc(file: File, riderId: string, kind: string): Promise<string | null> {
  if (!file || file.size === 0 || file.size > MAX_DOC_BYTES) return null
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${riderId}/${kind}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await db.storage.from('rider-docs').upload(path, buf, {
    contentType: file.type || 'image/jpeg',
    upsert: true, // الطيار ممكن يرفع صورة أوضح بعد الرفض
  })
  if (error) {
    console.error('[rider-register] فشل رفع', kind, error.message)
    return null
  }
  // بنخزّن الـpath مش لينك عام — الباكت برايفت والعرض بروابط موقّتة
  return path
}

export async function POST(req: NextRequest) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ ok: false, error: 'البيانات مش وصلة صح' }, { status: 400 })
  }

  const name = String(form.get('name') || '').trim()
  const rawPhone = String(form.get('phone') || '').trim()
  const vehicle = String(form.get('vehicle') || '').trim() || null
  const zones = String(form.get('zones') || '')
    .split(/[،,]/).map((z) => z.trim()).filter(Boolean)
  const nationalId = form.get('national_id') as File | null
  const vehicleLicense = form.get('vehicle_license') as File | null

  if (!name || !rawPhone) {
    return NextResponse.json({ ok: false, error: 'الاسم ورقم التليفون مطلوبين' })
  }
  // ⚠️ الأوراق شرط تسجيل مش رفاهية — من غيرها الحساب مالوش معنى للمراجعة
  if (!nationalId || nationalId.size === 0) {
    return NextResponse.json({ ok: false, error: 'صورة البطاقة مطلوبة' })
  }
  if (!vehicleLicense || vehicleLicense.size === 0) {
    return NextResponse.json({ ok: false, error: 'صورة رخصة المركبة مطلوبة' })
  }

  const phone = rawPhone.replace(/\D/g, '').replace(/^0/, '20')

  // موجود قبل كده؟ — نرجّعله لينكه بدل ما نعمل نسخة تانية
  const { data: existing } = await db
    .from('delivery_riders')
    .select('id, access_token, verification_status')
    .eq('phone', phone)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({
      ok: true, already: true,
      rider_link: `/delivery/${existing.access_token}`,
      verification_status: existing.verification_status,
    })
  }

  const { data: rider, error } = await db
    .from('delivery_riders')
    .insert({ name, phone, vehicle, zones, verification_status: 'pending' })
    .select('id, access_token')
    .maybeSingle()
  if (error || !rider) {
    return NextResponse.json({ ok: false, error: error?.message || 'فشل التسجيل' })
  }

  const idPath = await uploadDoc(nationalId, rider.id, 'national-id')
  const licPath = await uploadDoc(vehicleLicense, rider.id, 'vehicle-license')

  // ⚠️ لو أي ورقة فشلت في الرفع بنشيل الحساب — حساب من غير أوراق كاملة
  //    هيقعد pending للأبد ومحدش هيعرف ليه.
  if (!idPath || !licPath) {
    await db.from('delivery_riders').delete().eq('id', rider.id)
    return NextResponse.json({ ok: false, error: 'فشل رفع الصور — جرّب تاني بصور أصغر' })
  }

  await db.from('delivery_riders')
    .update({ national_id_url: idPath, vehicle_license_url: licPath })
    .eq('id', rider.id)

  return NextResponse.json({
    ok: true,
    rider_link: `/delivery/${rider.access_token}`,
    verification_status: 'pending',
  })
}
