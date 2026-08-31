#!/usr/bin/env node
/**
 * 🔌 فحص الشغل الموصّل — يمسك «نص الشغل» قبل ما تكتشفه
 *
 * (٢٨ أغسطس ٢٠٢٦) محمد: «ليه كل الشغل نص شغل؟ ممكن الشغل يبقى مكتمل
 *   وفعّال؟»
 *
 * 🐞 النمط اللي اتكرر: أبني دالة أو مسار أو مكوّن **وأنساه من غير
 *    ما أوصّله**. أمثلة حصلت فعلًا:
 *    · ٥ دوال تاسكات (تايم لاين · إشعارات · متابعة · تقييم · تلاعب)
 *      اتبنوا **من غير كرون** — ٧٥ تاسك وصفر إشعار.
 *    · أداة add_listing_oneshot اتبنت في الداتابيز **من غير ما
 *      المارد ياخدها**.
 *    · شاشة إشعارات **مش موجودة** رغم إن ٤٤٦١ إشعار متسجّلين.
 *    · مسارات كرون **مابتقبلش Bearer** فبتتصد بـ401.
 *
 * ✅ الفحص ده بيسأل عن كل حاجة جديدة: **مين بينده عليها؟**
 *    ولو محدش — بيقول بصوت عالي قبل الكوميت.
 *
 * الاستخدام: node scripts/check-wiring.cjs
 */
const fs = require('fs')
const path = require('path')

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    const s = fs.statSync(p)
    if (s.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(f)) out.push(p.replace(/\\/g, '/'))
  }
  return out
}

const files = walk('src')
const allCode = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n')
const problems = []

// ─── ① كل مكوّن في src/components مستورد في مكان؟ ─────────────
for (const f of files) {
  if (!f.startsWith('src/components/')) continue
  const name = path.basename(f).replace(/\.tsx?$/, '')
  // بيتستورد في أي ملف تاني؟
  const imported = files.some((o) =>
    o !== f && new RegExp(`from ['"]@/components/${name}['"]|from ['"]\\./${name}['"]`).test(
      fs.readFileSync(o, 'utf8')))
  if (!imported) {
    problems.push(`🧩 ${f.replace('src/', '')} — مكوّن مش مستورد في أي مكان (شغل واقف)`)
  }
}

// ─── ② كل مسار API فيه GET أو POST؟ ───────────────────────────
for (const f of files) {
  if (!/\/route\.ts$/.test(f)) continue
  const c = fs.readFileSync(f, 'utf8')
  if (!/export async function (GET|POST|PUT|PATCH|DELETE)/.test(c)) {
    problems.push(`🔌 ${f.replace('src/app/', '')} — مسار من غير أي handler`)
  }
}

// ─── ③ كل صفحة جديدة موصولة برابط؟ ────────────────────────────
for (const f of files) {
  const m = f.match(/^src\/app\/([^/]+)\/page\.tsx$/)
  if (!m) continue
  const route = `/${m[1]}`
  if (['admin', 'api', 'auth'].includes(m[1])) continue
  const linked = new RegExp(`href=["'\`]${route}`).test(allCode)
  if (!linked) {
    problems.push(`🔗 ${route} — صفحة موجودة بس مفيش أي رابط ليها`)
  }
}

console.log(`🔍 فحصت ${files.length} ملف\n`)

if (problems.length === 0) {
  console.log('✅ كل حاجة موصّلة')
  process.exit(0)
}

console.log(`⚠️ ${problems.length} حاجة محتاجة توصيل:\n`)
problems.forEach((p) => console.log('  ' + p))
console.log('\n💡 ده تنبيه مش خطأ — راجعهم وقرّر.')
// مابنفشلش البناء — ممكن يكون فيه حالات مقصودة
process.exit(0)
