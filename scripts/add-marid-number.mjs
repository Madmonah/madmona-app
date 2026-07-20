// ربط رقم مارد جديد بالخدمة، وإرجاع لينك الـQR اللي يتمسح من الموبايل.
//   node scripts/add-marid-number.mjs 201026222337 "المارد ٢"

import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const session = process.argv[2]
const label = process.argv[3] || session
if (!session) {
  console.error('لازم رقم')
  process.exit(1)
}

const res = await fetch('https://www.madmonacairo.com/api/internal/wa-group', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-internal-secret': env.EDGE_GATEWAY_SECRET },
  body: JSON.stringify({ action: 'add_session', session, label }),
})
const d = await res.json().catch(() => ({}))

console.log('\n═══ ربط رقم مارد ═══\n')
console.log(`  الرقم   : ${session}`)
console.log(`  الحالة  : ${d.ok ? '✅ الجلسة بدأت' : '🔴 ' + (d.error || res.status)}`)
if (d.qr_page) {
  console.log(`\n  📱 افتح اللينك ده وامسح الكود من موبايل الرقم:`)
  console.log(`     ${d.qr_page}\n`)
  console.log(`  (واتساب على الموبايل ← الإعدادات ← الأجهزة المرتبطة ← ربط جهاز)\n`)
}
