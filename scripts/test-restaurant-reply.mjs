// اختبار أول رد على مطعم جديد من الرقم الجديد.
// بيحاكي مطعم بيبعت منيو، وبيرجّع الرد عشان نراجع الترتيب.
//   node scripts/test-restaurant-reply.mjs 201004194133

import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const phone = process.argv[2]
if (!phone) {
  console.error('لازم رقم')
  process.exit(1)
}

const run = Date.now().toString(36)
const now = Math.floor(Date.now() / 1000)

const burst = [
  'السلام عليكم',
  `منيو مطعم البحر الأزرق 🐟

- سمك بلطي مشوي 180
- جمبري مقلي 320
- كابوريا 450
- صينية سمك مشكل 600
- شوربة سي فود 90`,
  'التوصيل ٣٠ جنيه لكل المناطق القريبة',
]

const results = await Promise.all(
  burst.map((text, i) =>
    fetch('https://www.madmonacairo.com/api/whatsapp/baileys', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-madmona-secret': env.EDGE_GATEWAY_SECRET },
      body: JSON.stringify({
        session_id: '201114621551',
        from: phone,
        reply_jid: `${phone}@s.whatsapp.net`,
        message_id: `rest-${run}-${i}`,
        text,
        type: 'text',
        timestamp: now + i,
        name: 'مطعم البحر الأزرق',
      }),
    })
      .then((r) => r.json())
      .catch((e) => ({ error: e.message })),
  ),
)

const replied = results.filter((r) => r.replied).length
console.log(`\nردود: ${replied} (المطلوب ١)`)
for (const r of results) {
  if (r.error) console.log('  🔴', r.error)
}
