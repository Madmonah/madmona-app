// 🏢 (١٩/٩/٢٠٢٦) رفع صور المقر التجاري (مصر الجديدة — عمار بن ياسر).
// الصور مستخرجة من ٢٤ فيديو 4K بعتهم محمد على درايف (مفيش صور أصلًا في الفولدر).
const fs = require('fs'), path = require('path')
const { createClient } = require('@supabase/supabase-js')
const env = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8')
const pick = (k) => (env.match(new RegExp('^' + k + '="?([^"\n\r]+)', 'm')) || [])[1]
const db = createClient(pick('NEXT_PUBLIC_SUPABASE_URL'), pick('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const DIR = path.join(__dirname, '../reels/clients/hq300')
;(async () => {
  const out = {}
  for (const f of fs.readdirSync(DIR).filter((x) => /^\d\d-.*\.jpg$/.test(x)).sort()) {
    const key = `clients/hq300/${f}`
    const { error } = await db.storage.from('content-images').upload(key, fs.readFileSync(path.join(DIR, f)), { contentType: 'image/jpeg', upsert: true })
    if (error) throw new Error(`${f}: ${error.message}`)
    out[f] = db.storage.from('content-images').getPublicUrl(key).data.publicUrl
    console.log('✅', f)
  }
  fs.writeFileSync(path.join(__dirname, 'hq300-assets.json'), JSON.stringify(out, null, 2))
  console.log('\n📄 الروابط في scripts/clients/hq300-assets.json ·', Object.keys(out).length, 'صورة')
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
