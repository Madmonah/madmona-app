#!/usr/bin/env node
/**
 * 🙊 فحص تسريب أخطاء الذكاء للعملاء
 *
 * (٢٨ أغسطس ٢٠٢٦) محمد: «لسه المارد بيرد يقول مفيش كريديت على الرد
 *   — تخيل!»
 *
 * 🐞 الباج اللي اتكرر **مرتين**: مسار بينده على الأنثروبيك، وفي
 *    الـcatch بيرجّع **نص رسالة الخطأ الخام** للعميل — ومن ضمنها
 *    «credit balance is too low».
 *    · /api/chat اتصلح الصبح
 *    · /api/team/marid اتكشف بعدها بساعات — **نفس الباج بالحرف**
 *
 * ✅ الفحص ده بيمسك النمط: أي مسار بينده على الذكاء ولازم يكون:
 *    ① له احتياطي من المكتبة (marid_offline_reply)، أو
 *    ② على الأقل مايسرّبش نص الخطأ
 *
 * الاستخدام: node scripts/check-ai-leaks.cjs
 */
const fs = require('fs')
const path = require('path')

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    const s = fs.statSync(p)
    if (s.isDirectory()) walk(p, out)
    else if (f === 'route.ts') out.push(p.replace(/\\/g, '/'))
  }
  return out
}

// 🚨 المسارات اللي بترد على **إنسان** — دي اللي التسريب فيها مؤذي
const HUMAN_FACING = /\/(chat|team\/marid|leads|signup|concierge|crm)\//

const leaks = []
const noFallback = []

for (const f of walk('src/app/api')) {
  const c = fs.readFileSync(f, 'utf8')
  if (!/callMaridWithTools|callClaude|anthropic/.test(c)) continue

  const short = f.replace('src/app/api/', '')
  const human = HUMAN_FACING.test(f)

  // 🩸 بيرجّع نص الخطأ للعميل؟
  const leaking = /error:\s*(err|e|error)\s+instanceof\s+Error\s*\?\s*\1\.message/.test(c)
    || /error:\s*(msg|message)\s*\}/.test(c)

  if (leaking && human) {
    leaks.push(`🩸 ${short} — بيرجّع نص الخطأ للعميل (ممكن يبان «credit balance is too low»)`)
  }

  if (human && !/marid_offline_reply/.test(c)) {
    noFallback.push(`🔴 ${short} — بيرد على عميل من غير احتياطي من المكتبة`)
  }
}

console.log('🙊 فحص تسريب أخطاء الذكاء\n')

if (leaks.length === 0 && noFallback.length === 0) {
  console.log('✅ مفيش مسار بيسرّب أخطاء للعملاء')
  process.exit(0)
}

leaks.forEach((l) => console.log('  ' + l))
noFallback.forEach((l) => console.log('  ' + l))
console.log('\n💡 المسارات اللي بترد على عملاء لازم: احتياطي من المكتبة + مفيش نص خطأ.')
process.exit(0)
