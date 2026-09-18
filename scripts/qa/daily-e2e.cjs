// 🧪 اختبار يومي كامل (١٨/٩/٢٠٢٦ — محمد: «جرّب دايمًا تعمل حساب جديد كل يوم من الموبايل ومن الديسكتوب،
//    وتجرب تضيف كل يوم منتج وتشيك على صفحة الحساب وتجرب فيتشر، وبعدين تمسح الحساب»).
//
// الرحلة لكل مقاس (موبايل ٣٩٠×٨٤٤ · ديسكتوب ١٤٤٠×٩٠٠):
//   ١) /start → فورم كامل (هوية + لوجو-لون + فرع) → توثيق واتساب (محاكاة الويبهوك) → الحساب والشركة يتعملوا
//   ٢) الوجهة بعد الإنشاء = /account (التطبيق)
//   ٣) كارت «بيزنسي» موجود ويفتح لوحة الشركة
//   ٤) إضافة منتج من «المنتجات والخدمات» والتأكد إنه ظهر
//   ٥) فيتشر اليوم (حسب اليوم): الفروع · الموظفين · المصاريف · الكتالوج
//   ٦) تسجيل خروج ودخول تاني بالرقم + الباسورد
// التنضيف (حذف الحساب) بيتعمل بسكريبت SQL منفصل: scripts/qa/cleanup.sql بنفس الرقم.
//
// ⚠️ لازم كروم حقيقي (CDP 9223) — نقطة تفتيش فيرسل بترفض الهيدلس (درس ١٨/٩).
// التشغيل: node scripts/qa/daily-e2e.cjs [mobile|desktop] [phone]
const { chromium } = require('playwright')
const fs = require('fs')
const SECRET = (fs.readFileSync('E:/madmona-app/.env.vercel-prod', 'utf8').match(/WA_SERVICE_SECRET="([^"]+)"/) || [])[1]
const SITE = 'https://www.madmonacairo.com'
const mode = process.argv[2] === 'desktop' ? 'desktop' : 'mobile'
const PHONE = process.argv[3] || ('0199988' + String(Date.now()).slice(-4))
const PW = 'Qa' + String(Date.now()).slice(-6) + 'x'
const VIEW = mode === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 }
const steps = []
const ok = (name, pass, note = '') => { steps.push({ step: name, pass: !!pass, note: String(note).slice(0, 90) }); console.log((pass ? '✅' : '❌') + ' ' + name + (note ? ' — ' + note : '')) }

;(async () => {
  // 🖥️ (١٨/٩/٢٠٢٦) متصفح خاص بالاختبار بدل كروم السوشيال (بيقع كل شوية) — **headed** لأن نقطة
  //    تفتيش فيرسل بترفض الهيدلس (403) والمستخدم الحقيقي بياخد 200.
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const ctx = await b.newContext({ viewport: VIEW, locale: 'ar-EG', isMobile: mode === 'mobile', hasTouch: mode === 'mobile' })
  const p = await ctx.newPage()
  let supplierId = null
  try {
    // ── ١) التسجيل ──
    await p.goto(`${SITE}/start?utm_source=qa_${mode}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await p.waitForSelector('form', { timeout: 40000 })
    await p.fill('input[placeholder*="عيادة د"]', `QA ${mode} ${new Date().toISOString().slice(0, 10)} (تتمسح)`)
    await p.fill('input[inputmode="tel"]', PHONE)
    await p.fill('input[type="password"]', PW)
    const hasIdentity = await p.$('input[type="color"]')
    ok('شاشة التسجيل فيها الهوية (لون/لوجو/فروع)', !!hasIdentity)
    const branch = await p.$('input[placeholder="الفرع الرئيسي"]')
    if (branch) await branch.fill('الفرع الرئيسي')
    await p.click('button[type="submit"]')
    await p.waitForSelector('text=ابعت الكود ده', { timeout: 45000 })
    const code = (await p.textContent('div[dir="ltr"]')).trim()
    // ⚠️ كود الدولة كامل (20) — واتساب بيبعت 20xxxxxxxxxx؛ من غيره الإيميل الداخلي بيطلع غلط والدخول بيفشل (اتكشف ١٨/٩)
    const wh = { event: 'message.received', sessionId: '201114621551', data: { from: '20' + PHONE.replace(/^0/, '') + '@c.us', to: '201114621551@c.us', body: code, fromMe: false, id: 'qa-' + Date.now(), timestamp: Math.floor(Date.now() / 1000), type: 'chat' } }
    const wr = await fetch(`${SITE}/api/whatsapp/openwa?token=${SECRET}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wh) }).then(x => x.json()).catch(e => ({ err: e.message }))
    ok('الكود وصل واتوثّق', wr?.brain?.login === 'verified', JSON.stringify(wr).slice(0, 50))
    // ── ٢) الوجهة = التطبيق ──
    await p.waitForURL(/\/account/, { timeout: 90000 }).catch(() => {})
    ok('بعد الإنشاء بيروح «حسابي» في التطبيق', /\/account/.test(p.url()), p.url().slice(0, 60))
    await p.waitForTimeout(4000)
    // ── ٣) كارت بيزنسي → لوحة الشركة ──
    // الكارت بيفتح لوحده لو بيزنس واحد؛ لو لأ ندوس على اسم الشركة الأول
    let bizLink = await p.$('a[href*="/admin/business-finance/"]')
    if (!bizLink) {
      const row = await p.$('button:has-text("صاحب البيزنس")')
      if (row) { await row.click(); await p.waitForTimeout(2500) }
      bizLink = await p.$('a[href*="/admin/business-finance/"]')
    }
    if (!bizLink) { await p.waitForTimeout(6000); bizLink = await p.$('a[href*="/admin/business-finance/"]') }
    const href = bizLink ? await bizLink.getAttribute('href') : ''
    supplierId = (href || '').match(/business-finance\/([0-9a-f-]{36})/)?.[1] || null
    const nameShown = /QA (mobile|desktop)/.test(await p.evaluate(() => document.body.innerText).catch(() => ''))
    ok('كارت «بيزنسي» في حسابي فيه اسم الشركة', nameShown)
    ok('زرار لوحة الشركة ظاهر من غير دوسة زيادة', !!supplierId, supplierId || 'مفيش')
    if (supplierId) {
      // ── ٤) إضافة منتج ──
      await p.goto(`${SITE}/admin/business-finance/${supplierId}/products`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await p.waitForTimeout(7000)
      const addBtn = await p.$('button:has-text("ضيف منتج"), button:has-text("منتج جديد"), button:has-text("إضافة")')
      ok('شاشة المنتجات والخدمات بتفتح', !!addBtn || /منتجات|خدمات/.test(await p.evaluate(() => document.body.innerText).catch(() => '')))
      if (addBtn) {
        await addBtn.click(); await p.waitForTimeout(2500)
        const nameInput = await p.$('[role=dialog] input, form input')
        if (nameInput) {
          await nameInput.fill('منتج اختبار يومي')
          const price = await p.$('input[inputmode="decimal"], input[type="number"]')
          if (price) await price.fill('150')
          const save = await p.$('button:has-text("حفظ"), button:has-text("احفظ")')
          if (save) { await save.click(); await p.waitForTimeout(5000) }
        }
        const body = await p.evaluate(() => document.body.innerText)
        ok('المنتج اتسجّل وظهر', /منتج اختبار يومي/.test(body))
      }
      // ── ٥) فيتشر اليوم ──
      const feats = ['branches', 'team', 'expenses', 'marketplace-catalog']
      const feat = feats[new Date().getDate() % feats.length]
      await p.goto(`${SITE}/admin/business-finance/${supplierId}/${feat}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await p.waitForTimeout(6000)
      const txt = await p.evaluate(() => document.body.innerText).catch(() => '')
      ok(`فيتشر اليوم (${feat}) بيفتح`, txt.length > 200 && !/مالكش صلاحية|حصل خطأ|شركة غير موجودة/.test(txt), txt.slice(0, 60).replace(/\s+/g, ' '))
    }
    // ── ٦) خروج ودخول تاني ──
    await p.goto(`${SITE}/account`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(4000)
    const out = await p.$('button:has-text("تسجيل خروج"), button:has-text("خروج")')
    if (out) { await out.click(); await p.waitForTimeout(6000) }
    await p.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(3000)
    const idIn = await p.$('input[dir="ltr"]')
    if (idIn) {
      await idIn.fill(PHONE)
      const pwIn = await p.$('input[type="password"]')
      if (pwIn) await pwIn.fill(PW)
      const sub = await p.$('button[type="submit"]')
      if (sub) { await sub.click(); await p.waitForTimeout(9000) }
    }
    const loggedIn = await p.evaluate(() => Object.keys(localStorage).some(k => /sb-.*-auth-token|madmona_token/.test(k)))
    ok('الدخول تاني بالرقم + الباسورد', loggedIn && !/\/login/.test(p.url()), p.url().slice(0, 60))
  } catch (e) {
    ok('الرحلة كملت من غير أخطاء', false, e.message)
  }
  const pass = steps.filter(s => s.pass).length
  console.log(JSON.stringify({ mode, phone: PHONE, supplierId, pass, total: steps.length, failed: steps.filter(s => !s.pass).map(s => s.step) }))
  fs.writeFileSync(`E:/madmona-app/scripts/qa/last-${mode}.json`, JSON.stringify({ at: new Date().toISOString(), mode, phone: PHONE, pw: PW, supplierId, steps }, null, 2))
  await ctx.close(); await b.close().catch(() => {})
})().catch(e => { console.log('ERR', e.message); process.exit(1) })
