// 📨 نشر ريل على قناة تليجرام @madmona_cairo بالبوت الموجود (نفس بوت social-daily) — قناتنا، مش رسايل باردة.
const fs = require('fs')
const [,, slug, token] = process.argv
;(async () => {
  const fd = new FormData()
  fd.append('chat_id', '@madmona_cairo')
  fd.append('supports_streaming', 'true')
  fd.append('caption', fs.readFileSync(`output/caption-${slug}-telegram.txt`, 'utf8'))
  fd.append('video', new Blob([fs.readFileSync(`output/reel-${slug}-bahgat-egy.mp4`)], { type: 'video/mp4' }), `reel-${slug}.mp4`)
  const r = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, { method: 'POST', body: fd })
  const j = await r.json()
  console.log(slug, j.ok ? 'msg ' + j.result.message_id : JSON.stringify(j).slice(0, 200))
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
