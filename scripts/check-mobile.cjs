const fs = require('fs')

// 📱 (٢٨ أغسطس ٢٠٢٦) محمد: «هل فيه أي حاجة في الجلسة دي مش متنفذة
//    على نسخة الموبايل؟ أنا كل شوية بسألك ومش بلاقي إجابات صحيحة».
//    فحص كل شغل الجلسة: موصّل للموبايل ولا لأ؟
const mobile = fs.readFileSync('src/components/MobileHome.tsx', 'utf8')
const topnav = fs.readFileSync('src/components/TopNav.tsx', 'utf8')
const bottom = fs.existsSync('src/components/BottomNav.tsx')
  ? fs.readFileSync('src/components/BottomNav.tsx', 'utf8') : ''

const checks = [
  ['🔔 شاشة الإشعارات', () => fs.existsSync('src/app/notifications/page.tsx')],
  ['🔔 جرس الموبايل → /notifications', () => /href="\/notifications"/.test(mobile)],
  ['🔔 رابط في قايمة الموبايل', () => /DrawerLink href="\/notifications"/.test(mobile)],
  ['📊 لوحة الإدارة في الموبايل', () => /href="\/admin"/.test(mobile)],
  ['🧩 موديولات المورد في الموبايل', () => /<SupplierModulesInline/.test(mobile)],
  ['🚗 رابط /cars', () => /href="\/cars"/.test(mobile) || /href="\/cars"/.test(topnav) || /href="\/cars"/.test(bottom)],
  ['📦 رابط /my-orders', () => /href="\/my-orders"/.test(mobile) || /href="\/my-orders"/.test(topnav)],
  ['⚡ الإضافة خطوة واحدة', () => {
    const c = fs.readFileSync('src/app/add-listing/AddListingClient.tsx', 'utf8')
    return !/\{step === [2-5] &&/.test(c)
  }],
  ['📦 البيانات الإضافية مطوية', () => {
    const c = fs.readFileSync('src/app/add-listing/AddListingClient.tsx', 'utf8')
    return /بيانات إضافية/.test(c)
  }],
  ['🛟 احتياطي المكتبة في الشات', () => {
    const c = fs.readFileSync('src/app/api/chat/route.ts', 'utf8')
    return /marid_offline_reply/.test(c)
  }],
  ['📰 أخبار البورصة', () => {
    const c = fs.readFileSync('src/app/business-lounge/BusinessLoungeClient.tsx', 'utf8')
    return /NewsStories/.test(c) && /FinancialTicker/.test(c)
  }],
  ['🧹 «ضيف المنتج» اتشالت', () => !/tn\.add_product/.test(topnav)],
]

console.log('📱 فحص شغل الجلسة على الموبايل\n')
let bad = 0
for (const [name, fn] of checks) {
  let ok = false
  try { ok = fn() } catch { ok = false }
  if (!ok) bad++
  console.log(`  ${ok ? '✅' : '❌'} ${name}`)
}
console.log(`\n${bad === 0 ? '✅ كل حاجة موصّلة للموبايل' : `⚠️ ${bad} حاجة ناقصة`}`)
