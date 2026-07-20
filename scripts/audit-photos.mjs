// 🔍 فحص صور الإعلانات المنشورة:
//   • صورة مش شغّالة (404 / خطأ)
//   • صورة صغيرة أوي (غالبًا لوجو أو بيزنس كارد مش صورة منتج)
//   • نفس الصورة على أكتر من إعلان
//
// الإعلان المكسور بيضرب الثقة في المنصة كلها مش في نفسه بس.
//
//   node scripts/audit-photos.mjs

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

const { data: rows, error } = await db
  .from('listing_photos')
  .select('id, url, listing_id, listings!inner(title, status)')
  .eq('listings.status', 'published')

if (error) {
  console.error('🔴', error.message)
  process.exit(1)
}

console.log(`\n═══ فحص ${rows.length} صورة ═══\n`)

const broken = []
const tiny = []
const seen = new Map()

for (const r of rows) {
  const key = r.url
  if (!seen.has(key)) seen.set(key, [])
  seen.get(key).push(r.listings.title)

  try {
    const res = await fetch(r.url, { method: 'HEAD', signal: AbortSignal.timeout(12000) })
    if (!res.ok) {
      broken.push({ ...r, سبب: `HTTP ${res.status}` })
      continue
    }
    const size = Number(res.headers.get('content-length') || 0)
    // أقل من ٤٠ كيلو غالبًا لوجو أو بيزنس كارد — مش صورة عقار/منتج
    if (size > 0 && size < 40_000) tiny.push({ ...r, حجم: Math.round(size / 1024) })
  } catch (e) {
    broken.push({ ...r, سبب: e.message.slice(0, 40) })
  }
}

const dupes = [...seen.entries()].filter(([, v]) => v.length > 1)

console.log(`🔴 صور مكسورة    : ${broken.length}`)
for (const b of broken.slice(0, 15)) console.log(`   ${b.listings.title.slice(0, 40)}  ${b.سبب}`)

console.log(`\n⚠️  صور صغيرة جدًا : ${tiny.length}  (غالبًا لوجو/كارت)`)
for (const t of tiny.slice(0, 15)) console.log(`   ${t.listings.title.slice(0, 40)}  ${t.حجم}KB`)

console.log(`\n🔁 صور مكررة     : ${dupes.length}`)
for (const [url, titles] of dupes.slice(0, 10)) {
  console.log(`   ${titles.length}× ${url.slice(-42)}`)
  console.log(`      ${titles.slice(0, 3).map((t) => t.slice(0, 26)).join(' · ')}`)
}
console.log('')
