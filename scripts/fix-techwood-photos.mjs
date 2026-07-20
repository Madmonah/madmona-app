// 🪵 صلّح صور تيكوود — كل موديل ياخد صورته بدل ما الستة يشيلوا نفس الست صور.
//
// الصور نفسها مكتوب عليها رقم الموديل والسعر والمقاس — فمحتاجناش نسأل
// سامي حاجة، الداتا كانت عندنا من الأول.
//
//   node scripts/fix-techwood-photos.mjs          معاينة
//   node scripts/fix-techwood-photos.mjs --write  تنفيذ

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

// اللي قريته بعيني من الصور الست (بالترتيب اللي هي متخزنة بيه)
const PHOTOS = [
  { i: 0, model: 'WOD 07', kind: 'دولاب جرار',  price: 8888,  size: '195×140' },
  { i: 1, model: 'WOD 14', kind: 'دريسنج مفتوح', price: 7777,  size: '195×80' },
  { i: 2, model: 'WOD 13', kind: 'دريسنج مفتوح', price: 7777,  size: '195×80' },
  { i: 3, model: 'WOD 01', kind: 'دولاب جرار بمراية كاملة', price: 10999, size: '200×160' },
  { i: 4, model: 'WOD 09', kind: 'دريسنج مفتوح', price: 8888,  size: '195×120' },
  { i: 5, model: 'WOD 11', kind: 'دريسنج مفتوح', price: 11999, size: '200×220' },
]

const { data: listings } = await db
  .from('listings')
  .select('id, title, price_egp')
  .ilike('title', '%Techwood%')
  .eq('status', 'published')

// مجموعة الصور الست (كلهم على نفس المجموعة دلوقتي)
const { data: allPhotos } = await db
  .from('listing_photos')
  .select('url, display_order')
  .eq('listing_id', listings[0].id)
  .order('display_order')

const urls = allPhotos.map((p) => p.url)

console.log('\n═══ مقارنة: اللي سامي بعته ↔ اللي إحنا نشرناه ═══\n')

const matched = []
const orphanListings = []

for (const l of listings) {
  const num = (l.title.match(/WOD\s*0?(\d+)/i) || [])[1]
  const ph = PHOTOS.find((p) => p.model.replace(/\D/g, '') === String(num).padStart(2, '0'))
  if (ph) {
    const priceOk = l.price_egp === ph.price
    console.log(`  ✅ ${l.title.slice(0, 42).padEnd(44)} صورة ${ph.i + 1}  ${priceOk ? 'السعر صح' : `⚠️ السعر عندنا ${l.price_egp} والصورة بتقول ${ph.price}`}`)
    matched.push({ listing: l, photo: ph })
  } else {
    console.log(`  ❌ ${l.title.slice(0, 42).padEnd(44)} مفيش صورة للموديل ده — السعر ${l.price_egp} من فين؟`)
    orphanListings.push(l)
  }
}

const usedModels = matched.map((m) => m.photo.model)
const orphanPhotos = PHOTOS.filter((p) => !usedModels.includes(p.model))

console.log('\n═══ موديلات سامي اللي مالهاش إعلان ═══\n')
for (const p of orphanPhotos) {
  console.log(`  📷 ${p.model.padEnd(8)} ${p.kind.padEnd(24)} ${String(p.price).padStart(6)}ج  ${p.size}`)
}

console.log(`\n📊 ${matched.length} مضبوطين · ${orphanListings.length} إعلان مخترع · ${orphanPhotos.length} موديل حقيقي ضايع\n`)

if (!WRITE) {
  console.log('👀 معاينة — زوّد --write عشان يوزّع الصور الصح\n')
  process.exit(0)
}

// نوزّع: كل إعلان مطابق ياخد صورته هي الأساسية، والباقي بعدها
for (const { listing, photo } of matched) {
  await db.from('listing_photos').delete().eq('listing_id', listing.id)
  const ordered = [urls[photo.i], ...urls.filter((_, i) => i !== photo.i)]
  await db.from('listing_photos').insert(
    ordered.map((url, i) => ({
      listing_id: listing.id,
      url,
      display_order: i,
      is_primary: i === 0,
      is_placeholder: false,
    }))
  )
  console.log(`  ✅ ${listing.title.slice(0, 45)} → صورة ${photo.i + 1}`)
}

console.log('\nخلص ✅\n')
