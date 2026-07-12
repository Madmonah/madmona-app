// اختبار سريع لمنطق الدمج الجديد في instant-claim-builder
// بيتأكد إن المشاريع المختلفة مبقتش تتدمج، واللي فعلاً نفس الإعلان لسه بيتدمج.
function normTitle(s) {
  return s.toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim()
}
function titleSimilarity(a, b) {
  const toks = (s) => new Set(normTitle(s).split(' ').filter(t => t.length > 2 && !/^\d+$/.test(t)))
  const A = toks(a), B = toks(b)
  if (!A.size || !B.size) return 0
  let shared = 0
  for (const t of A) if (B.has(t)) shared++
  return shared / Math.min(A.size, B.size)
}
const MERGE = 0.6

const cases = [
  // [عنوان الإعلان الموجود, عنوان الـdraft الجديد, هل المفروض يتدمجوا؟]
  ['Grand Lane التجمع السادس – 1 غرفة 87م', 'Mall The Gray – مكاتب إدارية 43م² – التجمع الخامس', false],
  ['Grand Lane التجمع السادس – 1 غرفة 87م', 'Island 22 مارينا العلمين – شاليه 1BR 63م', false],
  ['Amaz Business Complex — وحدة تجارية أرضي', 'مكتب إداري Sky Bridge العاصمة الإدارية', false],
  ['ستوديو G-Bay El Sokhna — إطلالة بحر — ٣٥ م', 'شاليه ٣ غرف G-Bay — ١٤٥م', false],
  ['شقة 1 غرفة — Ritz New Zayed الشيخ زايد', 'تاون هاوس 282م — Ritz New Zayed', false],
  // اللي المفروض يتدمج فعلاً: نفس الإعلان بصور زيادة
  ['Grand Lane التجمع السادس – 1 غرفة 87م', 'Grand Lane التجمع السادس – 1 غرفة 87م', true],
  ['يخت فاخر متعدد الطوابق — حديد بحري 8مم', 'يخت فاخر متعدد الطوابق — حديد بحري', true],
]

let pass = 0, fail = 0
for (const [existing, draft, shouldMerge] of cases) {
  const score = titleSimilarity(existing, draft)
  const willMerge = score >= MERGE
  const ok = willMerge === shouldMerge
  ok ? pass++ : fail++
  console.log(
    `${ok ? 'PASS' : 'FAIL'} | score=${score.toFixed(2)} | ` +
    `${willMerge ? 'هيدمج' : 'إعلان جديد'} (المتوقع: ${shouldMerge ? 'هيدمج' : 'إعلان جديد'})\n` +
    `       "${existing.slice(0, 40)}"  vs  "${draft.slice(0, 40)}"`
  )
}
console.log(`\n=== ${pass} pass / ${fail} fail ===`)
process.exit(fail ? 1 : 0)
