// 🖼️ جيب صور حقيقية للمطاعم اللي على صورة تصنيف مؤقتة.
//
// «مش معنى إن الصورة مش موجودة إننا نقفل الحساب» — بنجيبها
// من أي مصدر حقيقي: منيوهم، لوجوهم، موقعهم.
//
//   node scripts/fetch-real-photos.mjs --send

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

const SEND = process.argv.includes('--send')

// صور من مصادر شغلهم الحقيقي — لوجوهم أو صور منيوهم
const SOURCES = [
  {
    match: 'HEROS',
    url: 'file:pdf-pages/heros-3-p1.png',
    ملاحظة: 'صفحة منيو ناشفيل من الـPDF اللي بعتوه',
  },
  {
    match: 'Viking Burger',
    url: 'https://ugc.production.linktr.ee/e8d2ef84-daed-42cd-a5d6-a2eba1ddadd0_IMG-1039.png',
    ملاحظة: 'لوجوهم من صفحتهم على linktree',
  },
  {
    match: 'طيبة غورميه',
    url: 'https://drive.google.com/drive-viewer/AKGpihbuO9fN1qX8mOUm0PxSOwOvN2I4g82VwhlnxtTxboywJaUAc7wn5Np2XkqwZVkPppJeixPaRagae7Lwxr3KzluLHWDKSEMcmw=s1600-rw-v1',
    ملاحظة: 'منيو المطعم اللي بعتوه على درايف',
  },
]

for (const s of SOURCES) {
  const { data: rows } = await db
    .from('listings')
    .select('id, title')
    .ilike('title', `%${s.match}%`)
    .eq('status', 'published')

  if (!rows?.length) {
    console.log(`  ⚠️  ${s.match} — مالقيتش إعلان`)
    continue
  }

  let buf
  try {
    if (s.url.startsWith('file:')) {
      buf = readFileSync(s.url.slice(5))
    } else {
      const r = await fetch(s.url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      buf = Buffer.from(await r.arrayBuffer())
    }
  } catch (e) {
    console.log(`  🔴 ${s.match} — ${e.message}`)
    continue
  }

  const ext = s.url.includes('.png') ? 'png' : 'jpg'
  const path = `listings/real/${s.match.replace(/\W+/g, '-').toLowerCase()}-${Date.now()}.${ext}`

  console.log(`  ${s.match.padEnd(16)} ${Math.round(buf.length / 1024)}KB  ${s.ملاحظة}`)
  if (!SEND) continue

  const { error: upErr } = await db.storage
    .from('content-images')
    .upload(path, buf, { contentType: `image/${ext}`, upsert: true })

  if (upErr) {
    console.log(`     🔴 رفع: ${upErr.message}`)
    continue
  }

  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/content-images/${path}`

  for (const row of rows) {
    // نشيل المؤقتة ونحط الحقيقية مكانها
    await db.from('listing_photos').delete().eq('listing_id', row.id).eq('is_placeholder', true)
    await db.from('listing_photos').insert({
      listing_id: row.id,
      url,
      display_order: 0,
      is_primary: true,
      is_placeholder: false,
    })
    console.log(`     ✅ ${row.title.slice(0, 40)}`)
  }
}

console.log(SEND ? '\nخلص ✅\n' : '\n👀 معاينة — زوّد --send\n')
