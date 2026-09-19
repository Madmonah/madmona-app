// 🎬 (١٩/٩/٢٠٢٦) محمد: «ضيف الفيديو والبوستر في الصفحة».
// بيرفع إعلان YM (نسخة الموبايل ٥.٧ ميجا — الأخف للويب) والبوستر، وبيحدّث صفحة
// /s/ym-finishing: الفيديو في `suppliers.gallery` كعنصر {kind:'video'} والبوستر
// كصورة أولى في المعرض.
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const env = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8')
const pick = (k) => (env.match(new RegExp('^' + k + '="?([^"\\n\\r]+)', 'm')) || [])[1]
const db = createClient(pick('NEXT_PUBLIC_SUPABASE_URL'), pick('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

const DIR = path.join(__dirname, '../reels/clients/ym')
const BUCKET = 'content-images'
const SUPPLIER = '86b8fc54-c0a2-494a-bec7-eaa9693c713c'

async function up(file, name, type) {
  const buf = fs.readFileSync(path.join(DIR, file))
  const key = `clients/ym/${name}`
  const { error } = await db.storage.from(BUCKET).upload(key, buf, { contentType: type, upsert: true })
  if (error) throw new Error(`${file}: ${error.message}`)
  return db.storage.from(BUCKET).getPublicUrl(key).data.publicUrl
}

;(async () => {
  const video = await up('ym-ad-mobile.mp4', 'ym-ad.mp4', 'video/mp4')
  console.log('✅ الفيديو:', video)
  const poster = await up('ym-poster.jpg', 'ym-poster.jpg', 'image/jpeg')
  console.log('✅ البوستر:', poster)

  const { data: cur, error: e1 } = await db.from('suppliers').select('gallery').eq('id', SUPPLIER).single()
  if (e1) throw new Error(e1.message)

  // نشيل أي فيديو/بوستر قديم قبل ما نضيف (التشغيل مرتين مايكررش)
  const old = (cur.gallery || []).filter((g) => {
    const u = typeof g === 'string' ? g : g?.url || ''
    return !/ym-ad\.mp4|ym-poster\.jpg/.test(u)
  })
  const gallery = [
    { url: video, kind: 'video', poster, caption: 'إعلان YM' },
    { url: poster, caption: 'بوستر' },
    ...old,
  ]
  const { error: e2 } = await db.from('suppliers').update({ gallery }).eq('id', SUPPLIER)
  if (e2) throw new Error(e2.message)
  console.log('\n✅ المعرض اتحدّث — العناصر:', gallery.length, '(فيديو + بوستر +', old.length, 'صورة)')
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
