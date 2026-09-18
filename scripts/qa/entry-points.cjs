// 🚪 (١٨/٩/٢٠٢٦ — محمد: «اتأكد من كل الشغل تاني من شاشات حقيقية اللي العميل ممكن يدخل يعمل حساب منها»)
// بيفحص **كل باب** حقيقي بيوصّل لإنشاء حساب/دخول، من متصفح حقيقي وبمقاسين:
//   ١) /pro  → زرار «ابدأ مجانًا» → لازم يودّي /start وفيه الفورم الكامل
//   ٢) /start  (حساب جديد) — الهوية واللوجو والفروع والباسورد
//   ٣) /start?tab=login  (عندي حساب)
//   ٤) /login  (الشاشة الموحّدة: جوجل + رقم/إيميل + واتساب)
//   ٥) /auth/signup القديمة → لازم تحوّل على /login (كانت بتبعت OTP بارد)
//   ٦) /supplier/register → /start
//   ٧) «حسابي» للزائر: زرار إنشاء حساب بيودّي فين
//   ٨) /for/clinics و /system: أزرار البداية بتودّي /start
// مابيعملش أي حساب — فحص أبواب بس.
const { chromium } = require('playwright')
const SITE = 'https://www.madmonacairo.com'
const rows = []
const ok = (name, pass, note = '') => { rows.push({ name, pass, note: String(note).slice(0, 70) }); console.log((pass ? '✅' : '❌') + ' ' + name + (note ? ' — ' + note : '')) }

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  for (const mode of ['mobile', 'desktop']) {
    const ctx = await b.newContext({ viewport: mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 }, locale: 'ar-EG', isMobile: mode === 'mobile', hasTouch: mode === 'mobile' })
    const p = await ctx.newPage()
    const M = (t) => `[${mode}] ${t}`

    // ١) /pro → /start
    await p.goto(`${SITE}/pro`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000)
    const proCta = await p.$('a[href*="/start"]')
    ok(M('/pro فيه زرار بيودّي /start'), !!proCta)
    if (proCta) {
      await proCta.click(); await p.waitForTimeout(7000)
      ok(M('/pro → شاشة التسجيل بتفتح'), /\/start|\/supplier\/register/.test(p.url()) && !!(await p.$('form')), p.url().slice(-40))
    }

    // ٢) /start — الفورم الكامل
    await p.goto(`${SITE}/start`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(6000)
    const html = await p.content()
    ok(M('/start: اسم + نشاط + واتساب + باسورد'), !!(await p.$('input[inputmode="tel"]')) && !!(await p.$('input[type="password"]')) && !!(await p.$('select')))
    ok(M('/start: اللوجو واللون والفروع (زي شاشة الأدمن)'), !!(await p.$('input[type="color"]')) && /ارفع لوجو/.test(html) && /الفروع/.test(html))
    ok(M('/start: مفيش كلام اشتراك في التسجيل'), !/١٠٠٠ ج|اشتراك شهري/.test(html))

    // ٣) تاب الدخول
    await p.goto(`${SITE}/start?tab=login`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000)
    ok(M('/start?tab=login: رقم/إيميل + باسورد + جوجل'), !!(await p.$('input[type="password"]')) && /جوجل/.test(await p.content()))

    // ٤) /login
    await p.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000)
    const lg = await p.content()
    ok(M('/login: جوجل + باسورد + واتساب'), /جوجل/.test(lg) && !!(await p.$('input[type="password"]')) && /واتساب/.test(lg))

    // ٥) الصفحة القديمة
    await p.goto(`${SITE}/auth/signup`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000)
    ok(M('/auth/signup القديمة بتحوّل على /login'), /\/login/.test(p.url()), p.url().slice(-30))

    // ٦) /supplier/register
    await p.goto(`${SITE}/supplier/register`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000)
    ok(M('/supplier/register بيوصّل للتسجيل'), /\/start|\/supplier\/register/.test(p.url()) && !!(await p.$('form, a[href*="/start"]')), p.url().slice(-30))

    // ٧) حسابي للزائر
    await p.goto(`${SITE}/account`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(6000)
    const acc = await p.content()
    const signupLink = await p.$('a[href*="/login"], a[href*="/start"]')
    ok(M('«حسابي» للزائر فيه باب دخول/إنشاء'), !!signupLink && !/auth\/signup/.test(acc))

    // ٨) صفحات البيع
    for (const page of ['/for/clinics', '/system']) {
      await p.goto(SITE + page, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(4000)
      ok(M(`${page} فيه زرار بيودّي /start`), !!(await p.$('a[href*="/start"]')))
    }
    await ctx.close()
  }
  const pass = rows.filter(r => r.pass).length
  console.log(JSON.stringify({ pass, total: rows.length, failed: rows.filter(r => !r.pass).map(r => r.name) }))
  await b.close()
})().catch(e => { console.log('ERR', e.message.slice(0, 140)); process.exit(1) })
