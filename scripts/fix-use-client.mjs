// 🔧 صلّح ترتيب 'use client' — سكريبت localStorage حط الاستيراد فوقه
// فبقت الملفات مكوّنات خادم بتستخدم hooks → البناء بيفشل.
//
//   node scripts/fix-use-client.mjs           معاينة
//   node scripts/fix-use-client.mjs --write   تنفيذ

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const WRITE = process.argv.includes('--write')
const files = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx|ts)$/.test(p)) files.push(p)
  }
}
walk('src')

let fixed = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  if (!/['"]use client['"]/.test(src)) continue

  const lines = src.split(/\r?\n/)
  const idx = lines.findIndex((l) => /^\s*['"]use client['"]\s*;?\s*$/.test(l))
  if (idx < 0) continue

  // فيه سطور فعلية (مش فاضية ولا تعليق) قبل 'use client'؟
  const before = lines.slice(0, idx)
  const hasCode = before.some((l) => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('/*') && !l.trim().startsWith('*'))
  if (!hasCode) continue

  const directive = lines[idx].trim()
  const rest = [...before, ...lines.slice(idx + 1)]
  // شيل أي سطور فاضية في الأول
  while (rest.length && !rest[0].trim()) rest.shift()

  const out = [directive, '', ...rest].join('\n')
  console.log(`  ${WRITE ? '✅' : '👀'} ${f}`)
  fixed++
  if (WRITE) writeFileSync(f, out, 'utf8')
}

console.log(`\n${fixed} ملف${WRITE ? ' اتصلح' : ' محتاج إصلاح'}\n`)
