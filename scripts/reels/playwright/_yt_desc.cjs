// ✏️ تحديث وصف فيديو يوتيوب منشور من كروم السوشيال (CDP 9223).
// ليه اتعمل (١٦/٩): الفيديوهات اتصححت أرقامها والكابشنات كانت لسه بالأرقام القديمة
// — والوصف المنشور على يوتيوب مابيتغيرش لوحده. argv: <videoId> <slug>
// الوصف بيتاخد من output/caption-<slug>-youtube.txt (سطر ١ = العنوان، الباقي وصف).
const { chromium } = require('playwright')
const fs = require('fs')
const D = 'E:/madmona-app/scripts/reels/playwright/'
const [, , vid, slug] = process.argv
if (!vid || !slug) { console.error('usage: node _yt_desc.cjs <videoId> <slug>'); process.exit(1) }

const raw = fs.readFileSync(D + 'output/caption-' + slug + '-youtube.txt', 'utf8').replace(/\r/g, '')
const lines = raw.split('\n')
const desc = lines.slice(1).join('\n').trim()

;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const page = await b.contexts()[0].newPage()
  await page.goto(`https://studio.youtube.com/video/${vid}/edit`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(9000)

  // صندوق الوصف في استوديو يوتيوب contenteditable جوّه #description-textarea
  const box = page.locator('#description-textarea #textbox').first()
  await box.waitFor({ state: 'visible', timeout: 45000 })
  await box.click()
  await page.waitForTimeout(800)
  await page.keyboard.press('Control+A')
  await page.waitForTimeout(400)
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(800)
  await page.evaluate((t) => {
    const el = document.querySelector('#description-textarea #textbox')
    if (el) { el.focus(); document.execCommand('insertText', false, t) }
  }, desc)
  await page.waitForTimeout(2500)

  const got = await page.evaluate(() => (document.querySelector('#description-textarea #textbox') || {}).innerText || '')
  const ok = got.includes(desc.slice(0, 25))

  // زرار الحفظ
  const save = page.locator('#save').first()
  await save.click({ timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(7000)
  const toast = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 120))
  console.log(JSON.stringify({ vid, slug, typed: ok, len: got.length, toast: toast.slice(0, 80) }))
  await page.close()
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
