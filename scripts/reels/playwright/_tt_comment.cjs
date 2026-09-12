// 💬 كومنت أول بلينك على فيديو تيك توك من كروم السوشيال (CDP 9223). argv: <videoUrl> <slug>
// (١٢/٩) تيك توك أكبر مشاهدات (٤٤٤/٣٦٦/١٩٦) وصفر زوار — مفيش لينك في البايو ولا في الكابشن.
const { chromium } = require('playwright')
const fs = require('fs')
const D = 'E:/madmona-app/scripts/reels/playwright/'
const [, , url, slug] = process.argv
let txt = fs.existsSync(D + 'output/caption-' + slug + '-comment.txt') ? fs.readFileSync(D + 'output/caption-' + slug + '-comment.txt', 'utf8').trim() : `اللينك 👇 https://www.madmonacairo.com/pro?utm_source=tiktok&utm_medium=comment&utm_campaign=erp1000&utm_content=${slug}`
txt = txt.replace(/utm_source=facebook/g, 'utm_source=tiktok')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(7000)
  const already = await page.evaluate(() => /utm_medium=comment|madmonacairo\.com/.test(document.body.innerText))
  if (already) { console.log(JSON.stringify({ url, posted: 'already' })); await page.close(); await b.close(); return }
  const ico = page.locator('[data-e2e="comment-icon"]').first(); if (await ico.count()) { await ico.click().catch(() => {}); await page.waitForTimeout(3000) }
  const box = page.locator('[data-e2e="comment-input"] [contenteditable=true], [data-e2e="comment-input"], [data-e2e="comment-text"] [contenteditable=true], .public-DraftEditor-content').first()
  await box.click({ timeout: 20000 }); await page.waitForTimeout(800)
  await page.keyboard.type(txt, { delay: 8 })
  await page.waitForTimeout(1200)
  await page.locator('[data-e2e="comment-post"]').first().click({ timeout: 10000 })
  await page.waitForTimeout(6000)
  const posted = await page.evaluate(() => /madmonacairo\.com/.test(document.body.innerText))
  await page.screenshot({ path: 'output/_tt_comment.jpg', type: 'jpeg', quality: 55 })
  console.log(JSON.stringify({ url, posted }))
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 160)); process.exit(1) })
