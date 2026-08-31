#!/usr/bin/env node
/**
 * 🛡️ فحص مسارات الكرون — يمنع باج ٤٠١ يتكرر
 *
 * (٢٨ أغسطس ٢٠٢٦) محمد: «كل شغلانة معاك لازم ليها ديل — ربنا يستر
 *   على باقي الشغل ومنفضلش نصلح وراك باقي حياتنا».
 *
 * 🐞 الباج اللي حصل: كتبت مسارين كرون جداد بيتحققوا من السر في
 *    `x-cron-secret` بس — و**Vercel بيبعته في `Authorization: Bearer`**.
 *    فالكرون اتصد بـ٤٠١ والطابور وقف، ومحدش عرف غير لما محمد شاف
 *    الإيرور.
 *
 * ✅ الفحص ده بيمسك الحالة دي **قبل** ما تتنشر: أي مسار مذكور في
 *    crons بتاع vercel.json لازم يقبل Bearer.
 *
 * الاستخدام: node scripts/check-cron-auth.cjs
 * (بيرجّع كود ١ لو فيه مشكلة — يصلح للـCI)
 */
const fs = require('fs')
const path = require('path')

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
const crons = vercel.crons || []
const problems = []

for (const c of crons) {
  // /api/vision/process?limit=10 → src/app/api/vision/process/route.ts
  const clean = c.path.split('?')[0].replace(/^\//, '')
  const file = path.join('src', 'app', clean, 'route.ts')

  if (!fs.existsSync(file)) {
    problems.push(`❌ ${c.path} — الملف مش موجود (${file})`)
    continue
  }

  const src = fs.readFileSync(file, 'utf8')

  // مفيش تحقق من سر خالص؟ ده مسار مفتوح
  if (!/CRON_SECRET/.test(src)) {
    problems.push(`⚠️ ${c.path} — مفيش تحقق من CRON_SECRET (مسار مفتوح)`)
    continue
  }

  // بيقبل Bearer؟ ده اللي Vercel بيبعته
  const acceptsBearer = /Bearer \$\{|=== `Bearer|startsWith\('Bearer/.test(src)
  if (!acceptsBearer) {
    problems.push(
      `🔴 ${c.path} — مابيقبلش \`Authorization: Bearer\` وده اللي Vercel بيبعته!\n` +
      `   الكرون هيتصد بـ401 والشغل هيقف بصمت.`,
    )
  }
}

console.log(`🔍 فحصت ${crons.length} كرون في vercel.json`)

if (problems.length === 0) {
  console.log('✅ كل مسارات الكرون بتقبل Bearer صح')
  process.exit(0)
}

console.log(`\n${problems.length} مشكلة:\n`)
problems.forEach((p) => console.log(p))
process.exit(1)
