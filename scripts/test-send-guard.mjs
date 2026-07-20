// اختبار: هل الرد بيخرج لحد كلّمنا على الرقم القديم المفصول؟
//   node scripts/test-send-guard.mjs

import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

async function trySend(to, label, session) {
  const res = await fetch('https://www.madmonacairo.com/api/internal/wa-send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-secret': env.EDGE_GATEWAY_SECRET },
    body: JSON.stringify({ to, text: 'اختبار المسار', agent_name: 'المارد', session }),
  })
  const d = await res.json().catch(() => ({}))
  console.log(`  ${label.padEnd(34)} ${d.ok ? '✅ خرج' : '⛔ ' + (d.error || res.status)}`)
}

console.log('\n═══ مسار الإرسال ═══\n')

// رقم عنده 15 صف محادثة — الحارس كان بيفشل معاه
await trySend('+201067122107', 'رقم بـ15 صف محادثة', '201002229982')

// رقم ماكلّمناش — لازم يترفض
await trySend('201555999888', 'رقم ماكلّمناش', undefined)

console.log('')
