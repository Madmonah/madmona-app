#!/usr/bin/env node
/**
 * 🔌 فحص الشغل الموصّل — يمسك «نص الشغل» قبل ما تكتشفه
 *
 * (٢٨ أغسطس ٢٠٢٦) محمد: «ليه كل الشغل نص شغل؟ ممكن الشغل يبقى مكتمل
 *   وفعّال؟»
 *
 * 🐞 النمط اللي اتكرر: أبني حاجة **وأنساها من غير ما أوصّلها**:
 *    · ٥ دوال تاسكات من غير كرون → ٧٥ تاسك وصفر إشعار
 *    · أداة إضافة الإعلان من غير ما المارد ياخدها
 *    · ٤٤٦١ إشعار من غير شاشة تعرضهم
 *
 * 🐞 وباج في الفحص نفسه (٢٨/٨): كان بيدوّر على `@/components/<اسم>`
 *    بس — فالمكوّنات جوّه مجلدات فرعية (analytics/ · payment/)
 *    كانت بتطلع «موقوفة» وهي مستوردة فعلًا. **جوجل أناليتكس طلع
 *    شغّال وأنا قلت إنه واقف** — فالفحص الغلط أسوأ من مفيش فحص.
 *    ✅ دلوقتي بيطابق **المسار الكامل** ومسارات نسبية وimport ديناميكي.
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
const cache = new Map()
const read = (f) => {
  if (!cache.has(f)) cache.set(f, fs.readFileSync(f, 'utf8'))
  return cache.get(f)
}
const allCode = files.map(read).join('\n')
const problems = []

// ─── ① مكوّنات مش مستوردة ─────────────────────────────────────
for (const f of files) {
  if (!f.startsWith('src/components/')) continue
  const name = path.basename(f).replace(/\.tsx?$/, '')
  const rel = f.replace('src/components/', '').replace(/\.tsx?$/, '')

  // بندوّر بكل الصيغ الممكنة
  const patterns = [
    `@/components/${rel}`,   // المسار الكامل
    `@/components/${name}`,  // الاسم لوحده (لو في الجذر)
    `/${name}'`,             // مسار نسبي
    `/${name}"`,
  ]
  const imported = files.some((o) => {
    if (o === f) return false
    const c = read(o)
    return patterns.some((p) => c.includes(p))
  })

  if (!imported) {
    problems.push(`🧩 ${f.replace('src/', '')} — مكوّن مش مستورد في أي مكان`)
  }
}

// ─── ② مسارات API من غير handler ──────────────────────────────
for (const f of files) {
  if (!/\/route\.ts$/.test(f)) continue
  if (!/export async function (GET|POST|PUT|PATCH|DELETE)|export const (GET|POST)/.test(read(f))) {
    problems.push(`🔌 ${f.replace('src/app/', '')} — مسار من غير handler`)
  }
}

// ─── ③ صفحات من غير رابط ──────────────────────────────────────
for (const f of files) {
  const m = f.match(/^src\/app\/([^/]+)\/page\.tsx$/)
  if (!m) continue
  const seg = m[1]
  if (['admin', 'api', 'auth', 'demo'].includes(seg) || seg.startsWith('[')) continue
  if (!new RegExp(`href=["'\`]/${seg}`).test(allCode)
    && !new RegExp(`push\\(['"\`]/${seg}`).test(allCode)) {
    problems.push(`🔗 /${seg} — صفحة من غير أي رابط ليها`)
  }
}

console.log(`🔍 فحصت ${files.length} ملف\n`)

if (problems.length === 0) {
  console.log('✅ كل حاجة موصّلة')
  process.exit(0)
}

console.log(`⚠️ ${problems.length} حاجة محتاجة توصيل:\n`)
problems.forEach((p) => console.log('  ' + p))
console.log('\n💡 تنبيه مش خطأ — فيه حالات مقصودة (مكوّن محضّر لصفحة جاية).')
process.exit(0)
