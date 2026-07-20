// اختبار حارس «رد بس»:
//   • رقم كلّمنا قبل كده  → لازم يعدّي
//   • رقم ماكلّمناش خالص  → لازم يترفض
//
//   node scripts/test-reply-only.mjs

import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const URL = 'https://www.madmonacairo.com/api/internal/wa-send'

async function trySend(to, label) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-secret': env.EDGE_GATEWAY_SECRET },
    body: JSON.stringify({ to, text: 'اختبار حارس الإرسال', agentName: 'المارد' }),
  })
  const d = await res.json().catch(() => ({}))
  console.log(`  ${label.padEnd(28)} ${d.ok ? '✅ عدّى' : '⛔ اترفض'}  ${d.error ?? ''}`)
  return d
}

console.log('\n═══ حارس «رد بس» ═══\n')

// رقم اخترعناه — مستحيل يكون كلّمنا
await trySend('201555000111', 'رقم ماكلّمناش')

// رقم في قاعدة البيانات وكلّمنا فعلاً
await trySend('201004194133', 'رقم كلّمنا قبل كده')

console.log('')
