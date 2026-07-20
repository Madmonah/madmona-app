// شيل رقم مارد من الخدمة (بيمسح بيانات الربط بتاعته من القرص كمان).
//   node scripts/remove-marid-number.mjs 201026222337

import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const session = process.argv[2]
if (!session) {
  console.error('لازم رقم')
  process.exit(1)
}

const res = await fetch('https://www.madmonacairo.com/api/internal/wa-group', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-internal-secret': env.EDGE_GATEWAY_SECRET },
  body: JSON.stringify({ action: 'remove_session', session }),
})
const d = await res.json().catch(() => ({}))
console.log(d.ok ? `✅ ${session} اتشال` : `🔴 ${d.error || res.status}`)
