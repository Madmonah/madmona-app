// 🧹 كناسة الفشل الصامت
// بتحوّل:   await supabase.rpc('fn', {...})        ← مفيش فحص للخطأ
// إلى:      await rpcSafe(supabase, 'fn', {...})   ← بيسجّل ويطلّع تنبيه
// بتسيب أي نداء بيفحص { data, error } زي ما هو — مش بنلمسه.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'src')
const files = []
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(tsx|ts)$/.test(e.name)) files.push(p)
  }
})(ROOT)

// النداء المكشوف: بداية سطر → await <client>.rpc(
const BARE = /^([ \t]*)await (supabase|supa|supabaseBrowser|sb)\.rpc\(/gm

let touched = 0, sites = 0
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8')
  if (!BARE.test(src)) continue
  BARE.lastIndex = 0

  const before = src
  src = src.replace(BARE, (_m, indent, client) => {
    sites++
    return `${indent}await rpcSafe(${client}, `
  })

  // شيل الـ@ts-expect-error اللي كان فوق النداء — بقى مش محتاجه وهيبقى unused
  src = src.replace(/^[ \t]*\/\/ @ts-expect-error.*\r?\n(?=[ \t]*await rpcSafe\()/gm, '')

  if (src === before) continue

  // ضيف الـimport لو مش موجود
  if (!/from '@\/lib\/rpc'/.test(src)) {
    const lines = src.split('\n')
    let last = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^import .*from ['"].*['"]/.test(lines[i])) last = i
    }
    if (last >= 0) {
      lines.splice(last + 1, 0,
        "// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)",
        "import { rpcSafe } from '@/lib/rpc'")
      src = lines.join('\n')
    }
  }

  fs.writeFileSync(f, src, 'utf8')
  touched++
  console.log('✔', path.relative(ROOT, f))
}
console.log(`\n${sites} نداء في ${touched} ملف`)
