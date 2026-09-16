// 📨 نشر ريل على قناة تليجرام @madmona_cairo — بيجيب توكن البوت من الداتابيز بنفسه
// (whatsapp_config.telegram_bot_token) بدل ما يتمرّر في سطر الأوامر أو يتطبع في أي لوج.
// الاستخدام: node _tg_auto.cjs <slug> [mp4]
const fs = require('fs')
const path = require('path')

const [, , slug, mp4Arg] = process.argv
if (!slug) { console.error('usage: node _tg_auto.cjs <slug> [mp4]'); process.exit(1) }

function loadEnv() {
  const roots = ['E:/madmona-app/.env.local', 'E:/madmona-app/.env']
  const env = {}
  for (const f of roots) {
    if (!fs.existsSync(f)) continue
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
  }
  return env
}

;(async () => {
  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY
  if (!url || !key) { console.error('ERR: مفيش رابط/مفتاح Supabase في .env.local'); process.exit(1) }

  const res = await fetch(
    `${url}/rest/v1/whatsapp_config?key=eq.telegram_bot_token&select=value`,
    { headers: { apikey: key, authorization: `Bearer ${key}` } },
  )
  const rows = await res.json()
  const token = Array.isArray(rows) && rows[0] && rows[0].value
  if (!token) { console.error('ERR: التوكن مش موجود في whatsapp_config'); process.exit(1) }

  const mp4 = mp4Arg || `output/reel-${slug}-bahgat-egy.mp4`
  const cap = `output/caption-${slug}-telegram.txt`
  for (const f of [mp4, cap]) {
    if (!fs.existsSync(f)) { console.error('ERR: ملف ناقص ' + f); process.exit(1) }
  }

  const fd = new FormData()
  fd.append('chat_id', '@madmona_cairo')
  fd.append('supports_streaming', 'true')
  fd.append('caption', fs.readFileSync(cap, 'utf8'))
  fd.append('video', new Blob([fs.readFileSync(mp4)], { type: 'video/mp4' }), path.basename(mp4))

  const r = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, { method: 'POST', body: fd })
  const j = await r.json()
  // ⚠️ ممنوع طباعة أي حاجة فيها التوكن — الرد بيتقص ومفيهوش التوكن أصلًا.
  console.log(slug, j.ok ? 'TG_MSG ' + j.result.message_id : 'TG_FAIL ' + JSON.stringify(j).slice(0, 200))
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
