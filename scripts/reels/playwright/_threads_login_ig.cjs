// 🧵 ثريدز من كروم السوشيال: لو خارج من الجلسة يدخل بـ«Continue with Instagram» (جلسة إنستجرام الموجودة — من غير أي باسورد)
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(6000)
  let t = await page.evaluate(() => document.body.innerText)
  if (/Continue with Instagram/i.test(t)) {
    await page.getByText('Continue with Instagram', { exact: false }).first().click()
    await page.waitForTimeout(8000)
    t = await page.evaluate(() => document.body.innerText)
    // صفحة تأكيد «Continue as madmona.cairo» لو ظهرت
    const cont = page.getByRole('button', { name: /Continue as|Continue/i }).first()
    if (await cont.count()) { await cont.click().catch(() => {}); await page.waitForTimeout(8000); t = await page.evaluate(() => document.body.innerText) }
  }
  await page.screenshot({ path: 'output/_threads_state.jpg', type: 'jpeg', quality: 55 })
  console.log(JSON.stringify({ url: page.url().slice(0, 80), loggedIn: !/Log in or sign up|Continue with Instagram/i.test(t), snippet: t.replace(/\s+/g, ' ').slice(0, 200) }))
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 160)); process.exit(1) })
