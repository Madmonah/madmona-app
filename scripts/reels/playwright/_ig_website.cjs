// 🔗 تغيير حقل Website في Edit profile إنستجرام (كروم السوشيال). argv: <url>
const { chromium } = require('playwright')
;(async () => {
  const url = process.argv[2]
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(7000)
  const inp = page.locator('input[placeholder="Website"]').first()
  const before = await inp.inputValue().catch(() => null)
  const disabled = await inp.isDisabled().catch(() => null)
  let clicked = false, after = null
  if (!disabled) {
    await inp.click(); await page.keyboard.press('Control+A'); await page.keyboard.type(url); await page.waitForTimeout(800)
    const submit = page.locator('button:has-text("Submit")').first()
    if (await submit.count()) { await submit.click({ timeout: 8000 }); clicked = true; await page.waitForTimeout(5000) }
    after = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').match(/(Profile saved|saved|error|Something went wrong)[^.]{0,60}/i)?.[0] || null)
  }
  console.log(JSON.stringify({ before, disabled, clicked, after }))
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
