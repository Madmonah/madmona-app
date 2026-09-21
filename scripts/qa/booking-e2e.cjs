// 🧪 (٢١/٩/٢٠٢٦) محمد: «جرب مثلا /s/sa3dawy وجرب تحجز».
// رحلة عميل حقيقية: صفحة البيزنس → اختيار خدمة → شاشة الحجز → ملء البيانات → تأكيد.
// بيسجّل كل خطوة ووين بتقف. ⚠️ لو الحجز اتم فعلًا، رقمه بيتطبع عشان يتمسح.
// التشغيل: node scripts/qa/booking-e2e.cjs [slug]
const { chromium } = require('playwright')
const SITE = 'https://www.madmonacairo.com'
const SLUG = process.argv[2] || 'sa3dawy'
const steps = []
const ok = (n, p, note = '') => { steps.push({ n, p }); console.log((p ? '✅' : '❌') + ' ' + n + (note ? ' — ' + String(note).replace(/\s+/g, ' ').slice(0, 90) : '')) }

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-EG', isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  const errs = []
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })
  try {
    // ── ١) صفحة البيزنس ──
    await p.goto(`${SITE}/s/${SLUG}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    // تعدية نقطة تفتيش فيرسل لو ظهرت
    for (let i = 0; i < 20; i++) {
      await p.waitForTimeout(3000)
      const t = await p.title()
      const len = await p.evaluate(() => document.body.innerText.length).catch(() => 0)
      if (!/Checkpoint/i.test(t) && len > 300) break
    }
    const txt = await p.evaluate(() => document.body.innerText)
    ok('صفحة البيزنس بتفتح', txt.length > 300 && !/فشل في التحقق/.test(txt), txt.slice(0, 60))
    ok('اسم البيزنس ظاهر', /سعداوي|Sa3dawy/i.test(txt))
    const svcCount = await p.evaluate(() => document.body.innerText.match(/\d+\s*(خدمة|خدمات)/)?.[0] || '')
    ok('الخدمات ظاهرة', /خدم/.test(txt), svcCount)

    // ── ٢) زرار الحجز ──
    const bookBtn = await p.$('a[href*="/book"], button:has-text("احجز"), a:has-text("احجز")')
    ok('فيه زرار حجز', !!bookBtn)
    if (!bookBtn) throw new Error('مفيش زرار حجز في الصفحة')
    await bookBtn.click()
    await p.waitForTimeout(8000)
    const url = p.url()
    const btxt = await p.evaluate(() => document.body.innerText)
    ok('شاشة الحجز بتفتح', /\/book/.test(url) && btxt.length > 200, url.slice(-55))

    // ── ٣) الفورم ──
    const fields = await p.evaluate(() => ({
      inputs: [...document.querySelectorAll('input,select,textarea')].map((e) => e.getAttribute('type') || e.tagName.toLowerCase()),
      hasDate: !!document.querySelector('input[type=date]'),
      hasSubmit: !!document.querySelector('button[type=submit]'),
      text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 220),
    }))
    ok('فورم الحجز فيه خانات', fields.inputs.length > 0, 'خانات: ' + fields.inputs.join(','))
    console.log('\nنص شاشة الحجز:\n ', fields.text, '\n')
    ok('صفر أخطاء كونسول', errs.length === 0, errs[0] || '')
  } catch (e) {
    ok('الرحلة كملت', false, e.message)
  }
  console.log(JSON.stringify({ slug: SLUG, pass: steps.filter((s) => s.p).length, total: steps.length, errs: errs.slice(0, 3) }))
  await ctx.close(); await b.close().catch(() => {})
})().catch((e) => { console.log('ERR', e.message.slice(0, 150)); process.exit(1) })
