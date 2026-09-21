// 🩺 (٢١/٩/٢٠٢٦) محمد: «لما بدوس على صفحات جوة البيزنس مش بتفتح».
// بيعمل حساب صاحب بيزنس حقيقي من /start (زي daily-e2e) وبيفتح **كل** شاشة في اللوحة
// وبيسجّل اللي بيفتح واللي بيعلّق أو بيقول «مالكش صلاحية».
//
// ⚠️ لازم كروم حقيقي headed — نقطة تفتيش فيرسل بترفض الهيدلس.
// التشغيل: node scripts/qa/panel-screens.cjs
const { chromium } = require('playwright')
const fs = require('fs')
const SECRET = (fs.readFileSync('E:/madmona-app/.env.vercel-prod', 'utf8').match(/WA_SERVICE_SECRET="([^"]+)"/) || [])[1]
const SITE = 'https://www.madmonacairo.com'
const PHONE = '0199988' + String(Date.now()).slice(-4)
const PW = 'Qa' + String(Date.now()).slice(-6) + 'xZ'

const SCREENS = fs.readdirSync('E:/madmona-app/src/app/admin/business-finance/[supplierId]')
  .filter((d) => fs.existsSync(`E:/madmona-app/src/app/admin/business-finance/[supplierId]/${d}/page.tsx`))

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG' })
  const p = await ctx.newPage()
  let supplierId = null
  try {
    // ── حساب جديد من /start ──
    await p.goto(`${SITE}/start?utm_source=qa_panel`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await p.waitForSelector('form', { timeout: 60000 })
    await p.fill('input[placeholder*="عيادة د"]', `QA panel ${new Date().toISOString().slice(0, 10)} (تتمسح)`)
    await p.fill('input[inputmode="tel"]', PHONE)
    await p.fill('input[inputmode="email"]', `qa.panel.${Date.now()}@madmonacairo-test.com`)
    await p.fill('input[type="password"]', PW)
    await p.click('button[type="submit"]')
    await p.waitForURL(/\/account/, { timeout: 120000 }).catch(() => {})
    await p.waitForTimeout(5000)
    const link = await p.$('a[href*="/admin/business-finance/"]')
    supplierId = link ? ((await link.getAttribute('href')) || '').match(/business-finance\/([0-9a-f-]{36})/)?.[1] : null
    if (!supplierId) throw new Error('مالقيتش لوحة الشركة بعد الإنشاء')
    console.log('الشركة:', supplierId, '· الشاشات:', SCREENS.length, '\n')

    const bad = []
    for (const s of SCREENS) {
      await p.goto(`${SITE}/admin/business-finance/${supplierId}/${s}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
      // بنستنى الصفحة تستقر: نص فعلي أو لودر عالق
      let txt = ''
      for (let i = 0; i < 7; i++) {
        await p.waitForTimeout(1800)
        txt = await p.evaluate(() => document.body.innerText).catch(() => '')
        if (txt.length > 260) break
      }
      const spinner = await p.$('svg.animate-spin')
      const denied = /مالكش صلاحية|شركة غير موجودة|حصل خطأ|Application error|something went wrong/i.test(txt)
      const stuck = txt.length < 260 && !!spinner
      const state = denied ? 'مرفوضة' : stuck ? 'عالقة' : txt.length < 160 ? 'فاضية' : 'شغالة'
      if (state !== 'شغالة') { bad.push({ s, state, txt: txt.replace(/\s+/g, ' ').slice(0, 70) }); console.log('❌', s, '—', state) }
    }
    console.log(`\nشغالة: ${SCREENS.length - bad.length}/${SCREENS.length} · مكسورة: ${bad.length}`)
    fs.writeFileSync('E:/madmona-app/scripts/qa/panel-screens.json', JSON.stringify({ at: new Date().toISOString(), phone: PHONE, supplierId, total: SCREENS.length, bad }, null, 2))
    if (bad.length) console.log('\nالمكسورة:\n' + bad.map((x) => ` • ${x.s} [${x.state}] ${x.txt}`).join('\n'))
  } catch (e) {
    console.log('ERR', e.message.slice(0, 160))
  }
  console.log('\nرقم الاختبار (للتنضيف):', PHONE)
  await ctx.close(); await b.close().catch(() => {})
})().catch((e) => { console.log('ERR', e.message.slice(0, 160)); process.exit(1) })
