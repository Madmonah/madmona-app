#!/usr/bin/env node
// اختبار الدفعة: بيبعت أربع رسايل ورا بعض زي ما حصل مع Yuri Sushi.
// المطلوب: رد واحد بس، وبيتكلم عن المنيو مش رد عام.
//   node scripts/test-burst.mjs 201104496225

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

const URL = 'https://www.madmonacairo.com/api/whatsapp/baileys'
const jid = `${phone}@s.whatsapp.net`
const now = Math.floor(Date.now() / 1000)
const run = Date.now().toString(36)

const burst = [
  'السلام عليكم',
  'منيو مطعم الأكابر 🍗\n\n- فراخ مشوية نص 120\n- ربع فرخة مشوي 70\n- كبدة اسكندراني 90\n- حمام محشي 110\n- طاجن بامية 85',
  'وعندنا توصيل لحد البيت',
  'تحب تطلب ايه يا فندم؟',
]

console.log(`\n═══ اختبار الدفعة → ${phone} ═══\n`)

const results = await Promise.all(
  burst.map((text, i) =>
    fetch(URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-madmona-secret': env.EDGE_GATEWAY_SECRET },
      body: JSON.stringify({
        from: phone,
        reply_jid: jid,
        message_id: `burst-${run}-${i}`,
        text,
        type: 'text',
        timestamp: now + i,
        push_name: 'مطعم الأكابر',
      }),
    })
      .then((r) => r.json().catch(() => ({ status: r.status })))
      .then((d) => ({ i, ...d }))
      .catch((e) => ({ i, error: e.message })),
  ),
)

for (const r of results) {
  const mark = r.replied ? '💬 رد' : r.reason === 'batched' ? '⏸️  اتجمّع' : `— ${r.reason || JSON.stringify(r)}`
  console.log(`  رسالة ${r.i + 1}  ${mark}`)
}

const replies = results.filter((r) => r.replied).length
console.log(`\n${replies === 1 ? '✅' : '🔴'}  عدد الردود: ${replies}  (المطلوب: ١)\n`)
