// يشيل تعليقات @ts-expect-error اللي TypeScript قال إنها زايدة (TS2578).
// Node بيقرا ويكتب utf8 افتراضياً — ده بيمنع تشويه العربي اللي حصل في نسخة PowerShell.
// وضع التجربة: node strip.js <logfile> --dry   (مش بيكتب حاجة، بيعرض بس)
const fs = require('fs')
const path = require('path')

const logFile = process.argv[2] || 'tscfinal.log'
const dry = process.argv.includes('--dry')
const onlyFile = process.argv.find((a) => a.startsWith('--only='))?.slice(7)

const log = fs.readFileSync(logFile, 'utf8').split(/\r?\n/)
const hits = new Map()
for (const line of log) {
  const m = /^(.+?)\((\d+),\d+\): error TS2578/.exec(line)
  if (!m) continue
  const f = m[1]
  if (onlyFile && f !== onlyFile) continue
  if (!hits.has(f)) hits.set(f, new Set())
  hits.get(f).add(parseInt(m[2], 10))
}

let removed = 0, skipped = 0, touched = 0, missing = 0
for (const [f, lineSet] of hits) {
  const abs = path.resolve(f)
  if (!fs.existsSync(abs)) { missing += lineSet.size; continue }
  const lines = fs.readFileSync(abs, 'utf8').split('\n')
  const nums = [...lineSet].sort((a, b) => b - a) // من آخر الملف لأوله
  let changed = false
  for (const n of nums) {
    const i = n - 1
    if (i < 0 || i >= lines.length) { skipped++; continue }
    const txt = lines[i].trim()
    // شرط الأمان: السطر لازم يكون تعليق @ts-expect-error لوحده
    if (/^(\/\/|\/\*)\s*@ts-expect-error/.test(txt)) {
      lines.splice(i, 1); removed++; changed = true
    } else { skipped++ }
  }
  if (changed && !dry) { fs.writeFileSync(abs, lines.join('\n'), 'utf8'); touched++ }
  else if (changed) touched++
}
console.log(JSON.stringify({ mode: dry ? 'DRY-RUN' : 'WRITE', files: hits.size, removed, skipped, missing, touched }, null, 2))
