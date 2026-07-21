// 🪵 صلّح كتالوج تيكوود:
//   ١) نأرشف الـ٤ إعلانات المخترعة (WOD 03/04/05/06) — موديلات وأسعار مالهاش أصل
//   ٢) ننشر الـ٤ الحقيقيين (WOD 09/11/13/14) بالبيانات المقروءة من صور سامي
//
// ماحذفناش نهائي — أرشفة عشان نقدر نرجّع لو طلع إن الموديلات دي موجودة فعلاً.
//
//   node scripts/rebuild-techwood.mjs          معاينة
//   node scripts/rebuild-techwood.mjs --write  تنفيذ

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const WRITE = process.argv.includes('--write')

const FAKE = ['WOD 03', 'WOD 04', 'WOD 05', 'WOD 06']

// مقروءة بالعين من صور سامي — رقم الصورة في المجموعة، والموديل والسعر والمقاس
const REAL = [
  { photo: 4, model: 'WOD 09', kind: 'دريسنج مفتوح', price: 8888,  size: '195×120 سم' },
  { photo: 5, model: 'WOD 11', kind: 'دريسنج مفتوح', price: 11999, size: '200×220 سم' },
  { photo: 2, model: 'WOD 13', kind: 'دريسنج مفتوح', price: 7777,  size: '195×80 سم' },
  { photo: 1, model: 'WOD 14', kind: 'دريسنج مفتوح', price: 7777,  size: '195×80 سم' },
]

const rnd = () => Math.random().toString(36).slice(2, 7)

// نجيب إعلان مرجعي عشان ناخد منه المورّد والتصنيف والتليفون
const { data: ref } = await db
  .from('listings')
  .select('*')
  .ilike('title', '%WOD 07%')
  .eq('status', 'published')
  .limit(1)
  .single()

const { data: refPhotos } = await db
  .from('listing_photos')
  .select('url, display_order')
  .eq('listing_id', ref.id)
  .order('display_order')

// ترتيب صور WOD 07 اتغيّر (صورته بقت الأولى) — نرجّع للترتيب الأصلي
// عن طريق إعلان لسة على الترتيب القديم
const { data: anyPaused } = await db
  .from('listings')
  .select('id')
  .ilike('title', '%Techwood%')
  .eq('status', 'paused')
  .limit(1)
  .single()

const { data: origPhotos } = await db
  .from('listing_photos')
  .select('url, display_order')
  .eq('listing_id', anyPaused.id)
  .order('display_order')

const urls = (origPhotos?.length === 6 ? origPhotos : refPhotos).map((p) => p.url)

console.log('\n═══ ١) أرشفة المخترعين ═══\n')
for (const m of FAKE) {
  const { data: rows } = await db
    .from('listings')
    .select('id, title, status')
    .ilike('title', `%${m}%`)
  const live = (rows || []).filter((r) => r.status === 'published')
  console.log(`  ${m}  ${live.length} منشور · ${(rows || []).length - live.length} موقوف`)
  if (WRITE && live.length) {
    // ⚠️ 'archived' مش قيمة صالحة في enum listing_status — القيم هي
    // draft / published / paused / rejected. بنستخدم rejected عشان
    // السبب يفضل مكتوب في rejection_reason ونقدر نرجّع لو غلطنا.
    const { error } = await db
      .from('listings')
      .update({
        status: 'rejected',
        rejection_reason: 'موديل مالوش أصل — اتولّد بالغلط، مش من بيانات المورّد',
      })
      .in('id', live.map((r) => r.id))
    if (error) console.log(`     🔴 ${error.message}`)
  }
}

console.log('\n═══ ٢) نشر الحقيقيين ═══\n')
for (const r of REAL) {
  const title = `${r.kind} Techwood موديل ${r.model} — ${r.size}`
  const { data: exists } = await db
    .from('listings')
    .select('id')
    .ilike('title', `%${r.model}%`)
    .neq('status', 'rejected')
    .limit(1)
  if (exists?.length) {
    console.log(`  ⏭️  ${r.model} — موجود بالفعل`)
    continue
  }

  console.log(`  📦 ${title}  ${r.price}ج  (صورة ${r.photo + 1})`)
  if (!WRITE) continue

  const { data: created, error } = await db
    .from('listings')
    .insert({
      supplier_id: ref.supplier_id,
      category_id: ref.category_id,
      title,
      slug: `${title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}-${rnd()}`,
      description: `${r.kind} من Techwood موديل ${r.model} — مقاس ${r.size}. خامات فاخرة وتشطيب مميز وتنظيم داخلي مثالي.`,
      // ⚠️ فيه حارس بيرفض النشر من غير صورة — فبندخل مسودة الأول
      status: 'draft',
      country: 'EG',
      price_egp: r.price,
      contact_phone: ref.contact_phone,
      phone_verified_at: ref.phone_verified_at,
      advance_booking_days: 90,
      cancellation_hours: 24,
    })
    .select('id, slug')
    .single()

  if (error) {
    console.log(`     🔴 ${error.message}`)
    continue
  }

  // صورته هي الأساسية، وباقي صور الكتالوج بعدها
  const ordered = [urls[r.photo], ...urls.filter((_, i) => i !== r.photo)]
  const { error: phErr } = await db.from('listing_photos').insert(
    ordered.map((url, i) => ({
      listing_id: created.id,
      url,
      display_order: i,
      is_primary: i === 0,
      is_placeholder: false,
    }))
  )
  if (phErr) {
    console.log(`     🔴 صور: ${phErr.message}`)
    continue
  }

  // دلوقتي بس ننشر
  const { error: pubErr } = await db
    .from('listings')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', created.id)

  if (pubErr) {
    console.log(`     🔴 نشر: ${pubErr.message}`)
    continue
  }
  console.log(`     ✅ https://madmonacairo.com/marketplace/${created.slug}`)
}

console.log(WRITE ? '\nخلص ✅\n' : '\n👀 معاينة — زوّد --write\n')
