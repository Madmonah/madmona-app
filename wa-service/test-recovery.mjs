// اختبار سريع لمنطق استرجاع الرسايل الفايتة.
// بيتأكد إن الفلترة بالوقت شغالة زي ما احنا متوقعين — من غير ما
// نحتاج نوصّل واتساب حقيقي.

const MAX_AGE_MIN = 30
const now = Date.now() / 1000

function shouldProcess(type, timestampSec) {
  if (type !== 'notify' && type !== 'append') return { ok: false, why: 'نوع مرفوض' }
  const ageMin = timestampSec ? (now - timestampSec) / 60 : 0
  if (ageMin > MAX_AGE_MIN) return { ok: false, why: `قديمة (${Math.round(ageMin)} دقيقة)` }
  return { ok: true, why: type === 'append' ? 'فايتة — هتتعالج' : 'جديدة' }
}

const cases = [
  ['رسالة جديدة عادية', 'notify', now - 5, true],
  ['رسالة فايتة من دقيقتين (الخدمة كانت مقطوعة)', 'append', now - 120, true],
  ['رسالة فايتة من ٢٠ دقيقة', 'append', now - 1200, true],
  ['مزامنة تاريخ — رسالة من ساعتين', 'append', now - 7200, false],
  ['مزامنة تاريخ — رسالة من شهر', 'append', now - 2592000, false],
  ['نوع مش معروف', 'set', now - 5, false],
]

let pass = 0
let fail = 0

console.log('\n═══ اختبار استرجاع الرسايل الفايتة ═══\n')

for (const [name, type, ts, expected] of cases) {
  const r = shouldProcess(type, ts)
  const ok = r.ok === expected
  ok ? pass++ : fail++
  console.log(`  ${ok ? '✅' : '🔴'} ${name}`)
  console.log(`     النوع ${type} → ${r.ok ? 'تتعالج' : 'تتخطّى'} (${r.why})`)
  if (!ok) console.log(`     ⚠️ المتوقع: ${expected ? 'تتعالج' : 'تتخطّى'}`)
}

console.log(`\n  نجح ${pass} · فشل ${fail}\n`)
process.exit(fail ? 1 : 0)
