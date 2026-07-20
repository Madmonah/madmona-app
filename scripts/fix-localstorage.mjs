// 🧭 استبدال localStorage المباشر بالغلاف الآمن.
//
// سفاري في التصفح الخاص بيرمي استثناء عند لمس localStorage —
// فأول استخدام غير محمي بيقتل الصفحة كلها. عندنا ٧٩ استخدام.
//
//   node scripts/fix-localstorage.mjs           معاينة
//   node scripts/fix-localstorage.mjs --write   تنفيذ

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const WRITE = process.argv.includes('--write')
const ROOT = 'src'

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(tsx|ts)$/.test(name)) out.push(p)
  }
  return out
}

let changed = 0
let hits = 0

for (const file of walk(ROOT)) {
  if (file.includes('safe-storage')) continue
  let src = readFileSync(file, 'utf8')
  if (!src.includes('localStorage.')) continue

  const before = src

  src = src
    .replace(/localStorage\.getItem\(/g, 'safeStorage.get(')
    .replace(/localStorage\.setItem\(/g, 'safeStorage.set(')
    .replace(/localStorage\.removeItem\(/g, 'safeStorage.remove(')

  if (src === before) continue

  // نضيف الاستيراد لو مش موجود
  if (!src.includes("from '@/lib/safe-storage'")) {
    const m = src.match(/^((?:'use client'\r?\n)?(?:\r?\n)?)((?:import .*\r?\n)+)/)
    if (m) {
      src = src.replace(m[0], `${m[1]}${m[2]}import { safeStorage } from '@/lib/safe-storage'\n`)
    } else {
      src = `import { safeStorage } from '@/lib/safe-storage'\n${src}`
    }
  }

  const count = (before.match(/localStorage\.(getItem|setItem|removeItem)/g) || []).length
  hits += count
  changed++
  console.log(`  ${relative('.', file).padEnd(52)} ${count}`)

  if (WRITE) writeFileSync(file, src, 'utf8')
}

console.log(`\n${changed} ملف · ${hits} استخدام${WRITE ? ' — اتغيّروا ✅' : ' — معاينة بس'}\n`)
