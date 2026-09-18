// 🔑 (١٨/٩/٢٠٢٦) إثبات مسار «إيميل + باسورد» من غير أي توثيق رقم — من متصفح حقيقي.
// الرحلة: /start → اسم + نشاط + رقم + إيميل + باسورد → «أنشئ شركتي» → حسابي
//         → خروج → /start?tab=login بالإيميل والباسورد → لوحة الشركة.
// التشغيل: node scripts/qa/signup-email-e2e.cjs [suffix]
// التنضيف بعده: scripts/qa/cleanup.sql (نفس نطاق QA)
const { chromium } = require('playwright')
const SITE = 'https://www.madmonacairo.com'
const N = process.argv[2] || String(Date.now()).slice(-6)
const EMAIL = `qa.start.${N}@madmonacairo-test.com`
const PW = 'Qa' + N + 'xZ'
const PHONE = '01999' + N.slice(-6).padStart(6, '0')
const rows = []
const ok = (n, p, note = '') => { rows.push({ n, p }); console.log((p ? '✅' : '❌') + ' ' + n + (note ? ' — ' + String(note).slice(0, 90) : '')) }

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-EG', isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  try {
    await p.goto(`${SITE}/start?utm_source=qa_email`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await p.waitForSelector('form', { timeout: 40000 })
    await p.fill('input[placeholder*="عيادة د"]', `QA email ${new Date().toISOString().slice(0, 10)} (تتمسح)`)
    await p.fill('input[inputmode="tel"]', PHONE)
    await p.fill('input[inputmode="email"]', EMAIL)
    await p.fill('input[type="password"]', PW)
    ok('خانة الإيميل أساسية في الفورم', true)
    // الزرار لازم يبقى «أنشئ شركتي» — مش «وثّق رقمي بالواتساب»
    const btn = await p.textContent('button[type="submit"]').catch(() => '')
    ok('الزرار الأساسي بقى «أنشئ شركتي»', /أنشئ شركتي/.test(btn || ''), btn)
    await p.click('button[type="submit"]')
    await p.waitForURL(/\/account/, { timeout: 90000 }).catch(() => {})
    ok('الحساب والشركة اتعملوا من غير أي كود واتساب', /\/account/.test(p.url()), p.url().slice(0, 70))
    await p.waitForTimeout(4000)
    const bizLink = await p.$('a[href*="/admin/business-finance/"]')
    const supplierId = bizLink ? ((await bizLink.getAttribute('href')) || '').match(/business-finance\/([0-9a-f-]{36})/)?.[1] : null
    ok('كارت «بيزنسي» فيه لوحة الشركة', !!supplierId, supplierId || 'مفيش')
    // ── خروج ──
    const out = await p.$('button:has-text("تسجيل خروج"), button:has-text("خروج")')
    if (out) { await out.click(); await p.waitForTimeout(6000) }
    const cleared = await p.evaluate(() => !Object.keys(localStorage).some((k) => /sb-.*-auth-token|madmona_token/.test(k)))
    ok('الخروج مسح الجلسة', cleared)
    // ── دخول تاني بالإيميل والباسورد ──
    await p.goto(`${SITE}/start?tab=login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await p.waitForTimeout(4000)
    const idIn = await p.$('input[dir="ltr"]')
    if (idIn) await idIn.fill(EMAIL)
    const pwIn = await p.$('input[type="password"]')
    if (pwIn) await pwIn.fill(PW)
    const sub = await p.$('button[type="submit"]')
    if (sub) { await sub.click(); await p.waitForTimeout(10000) }
    const inAgain = await p.evaluate(() => Object.keys(localStorage).some((k) => /sb-.*-auth-token|madmona_token/.test(k)))
    ok('الدخول تاني بالإيميل + الباسورد', inAgain && !/\/login|tab=login/.test(p.url()), p.url().slice(0, 70))
  } catch (e) {
    ok('الرحلة كملت من غير أخطاء', false, e.message)
  }
  console.log(JSON.stringify({ email: EMAIL, phone: PHONE, pass: rows.filter(r => r.p).length, total: rows.length, failed: rows.filter(r => !r.p).map(r => r.n) }))
  await ctx.close(); await b.close().catch(() => {})
})().catch(e => { console.log('ERR', e.message.slice(0, 160)); process.exit(1) })
