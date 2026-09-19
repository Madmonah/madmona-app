// 🏗️ (١٩/٩/٢٠٢٦) محمد: «اعمل صفحة ليوسف محسن».
// بيرفع أصول YM (لوجو + ٩ صور شغل) على التخزين ويبني صفحة البيزنس على /s/ym-finishing.
//
// ⛔ خطوط حمرا محترمة هنا:
//   • مفيش سعر متر ولا مدة تسليم ولا ضمان — ولا رقم غير رقم مضمونة الرسمي،
//     لأن رقم يوسف نفسه لسه ماوصلش (README في scripts/reels/clients/ym).
//   • الوصف من كلام محمد المؤكَّد بس: «واقف على الشغل بنفسه».
// التشغيل: node scripts/clients/ym-page.cjs
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const env = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8')
const pick = (k) => (env.match(new RegExp('^' + k + '="?([^"\\n\\r]+)', 'm')) || [])[1]
const db = createClient(pick('NEXT_PUBLIC_SUPABASE_URL'), pick('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

const SRC = path.join(__dirname, '../reels/clients/ym/src')
const BUCKET = 'content-images'
const PREFIX = 'clients/ym'

async function upload(file, name) {
  const buf = fs.readFileSync(path.join(SRC, file))
  const key = `${PREFIX}/${name}`
  const { error } = await db.storage.from(BUCKET).upload(key, buf, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`${file}: ${error.message}`)
  return db.storage.from(BUCKET).getPublicUrl(key).data.publicUrl
}

;(async () => {
  // ١) الصور — أسماء ASCII (Supabase Storage بيرفض مفاتيح فيها عربي)
  const files = fs.readdirSync(SRC).filter((f) => /\.jpg$/i.test(f)).sort()
  const urls = {}
  for (const f of files) {
    urls[f] = await upload(f, f)
    console.log('✅ اترفعت:', f)
  }
  const logo = urls['logo.jpg']
  const gallery = files.filter((f) => f !== 'logo.jpg' && f !== '01-youssef.jpg').map((f) => urls[f])
  const cover = urls['02-hall.jpg']          // أحسن لقطة تشطيب كغلاف
  const portrait = urls['01-youssef.jpg']    // صورة يوسف نفسه

  console.log('\nاللوجو:', logo)
  console.log('الغلاف:', cover)
  console.log('المعرض:', gallery.length, 'صورة')
  fs.writeFileSync(path.join(__dirname, 'ym-assets.json'), JSON.stringify({ logo, cover, portrait, gallery }, null, 2))
  console.log('\n📄 الروابط اتحفظت في scripts/clients/ym-assets.json')
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
