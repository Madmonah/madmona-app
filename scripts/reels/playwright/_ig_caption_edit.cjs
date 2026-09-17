// ✏️ تعديل كابشن ريل إنستجرام منشور من كروم السوشيال (CDP 9223).
// ليه (١٧/٩): فيديوهات العقارات اتصححت أرقامها والكابشن المنشور على إنستجرام فضل بالأرقام القديمة.
// argv: <shortcode> <captionFile>
const { chromium } = require('playwright')
const fs = require('fs')
const [, , code, file] = process.argv
if (!code || !file) { console.error('usage: node _ig_caption_edit.cjs <shortcode> <captionFile>'); process.exit(1) }
const cap = fs.readFileSync(file, 'utf8').replace(/\r/g, '').trim()

;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const page = await b.contexts()[0].newPage()
  await page.goto(`https://www.instagram.com/p/${code}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(8000)
  await page.locator('svg[aria-label="More options"]').first().click({ timeout: 20000 })
  await page.waitForTimeout(2000)
  await page.locator('[role=dialog] :text-is("Edit")').first().click({ timeout: 15000 })
  await page.waitForTimeout(5000)
  const box = page.locator('[role=dialog] [contenteditable=true]').first()
  await box.waitFor({ state: 'visible', timeout: 20000 })
  await box.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(800)
  await page.evaluate((t) => document.execCommand('insertText', false, t), cap)
  await page.waitForTimeout(1500)
  const got = await box.innerText()
  const typed = got.includes(cap.slice(0, 20))
  await page.locator('[role=dialog] [role=button]:text-is("Done"), [role=dialog] div:text-is("Done")').first().click({ timeout: 15000 })
  await page.waitForTimeout(6000)
  const body = await page.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' '))
  console.log(JSON.stringify({ code, typed, saved: body.includes(cap.slice(0, 20)) }))
  await page.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 300)); process.exit(1) })
