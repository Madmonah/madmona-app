// 💬 كومنت أول بلينك بـUTM على شورت يوتيوب من كروم السوشيال (CDP 9223) + تثبيته لو أمكن.
// argv: <videoId> <slug>  → النص من output/caption-<slug>-comment.txt مع تبديل utm_source لـyoutube&utm_medium=comment
// (١٢/٩) يوتيوب/كومنت جاب ١٠ زوار في أسبوع — يستاهل يتعمل على كل شورت.
const { chromium } = require('playwright')
const fs = require('fs')
const D = 'E:/madmona-app/scripts/reels/playwright/'
const [, , vid, slug] = process.argv
let txt = fs.existsSync(D + 'output/caption-' + slug + '-comment.txt')
  ? fs.readFileSync(D + 'output/caption-' + slug + '-comment.txt', 'utf8').trim()
  : `اللينك 👇 https://www.madmonacairo.com/pro?utm_source=youtube&utm_medium=comment&utm_campaign=erp1000&utm_content=${slug}`
txt = txt.replace(/utm_source=facebook/g, 'utm_source=youtube')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = b.contexts()[0]
  const page = await ctx.newPage()
  await page.goto(`https://www.youtube.com/watch?v=${vid}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(6000)
  await page.mouse.wheel(0, 900); await page.waitForTimeout(2500)
  const ph = page.locator('#simplebox-placeholder, ytd-comment-simplebox-renderer #placeholder-area').first()
  await ph.waitFor({ state: 'visible', timeout: 30000 })
  await ph.click(); await page.waitForTimeout(1200)
  const box = page.locator('#contenteditable-root').first()
  await box.click(); await page.keyboard.type(txt, { delay: 3 })
  await page.waitForTimeout(800)
  await page.locator('#submit-button button, ytd-button-renderer#submit-button').first().click()
  await page.waitForTimeout(4000)
  const posted = await page.evaluate((t) => document.body.innerText.includes(t.slice(0, 25)), txt)
  console.log(JSON.stringify({ vid, posted }))
  // تثبيت: قايمة الكومنت (⋮) → Pin
  try {
    const mine = page.locator('ytd-comment-thread-renderer').filter({ hasText: txt.slice(0, 20) }).first()
    await mine.hover()
    await mine.locator('#action-menu button, yt-icon-button#button').first().click({ timeout: 8000 })
    await page.waitForTimeout(1200)
    const pin = page.locator('tp-yt-paper-item, ytd-menu-service-item-renderer').filter({ hasText: /^Pin$|تثبيت/ }).first()
    if (await pin.count()) { await pin.click(); await page.waitForTimeout(1500); const conf = page.locator('#confirm-button button').first(); if (await conf.count()) await conf.click(); console.log('pinned') }
  } catch (e) { console.log('pin skipped:', e.message.slice(0, 60)) }
  await page.close().catch(() => {}); await b.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
