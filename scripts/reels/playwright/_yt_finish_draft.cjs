// ▶️ يكمّل نشر شورت اتحفظ درافت في Studio (١٢/٩): /video/<id>/edit → «Edit draft» → Next×3 → Public → استنى Checks complete → Publish. argv: <videoId>
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto(`https://studio.youtube.com/video/${process.argv[2]}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(8000)
  const ed = page.locator('ytcp-button, button').filter({ hasText: /^Edit draft$/ }).first()
  await ed.click({ timeout: 20000 }); await page.waitForTimeout(5000)
  await page.waitForSelector('ytcp-uploads-dialog', { state: 'attached', timeout: 30000 })
  // مش للأطفال لو لسه مش محدد
  const nk = page.locator('tp-yt-paper-radio-button[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]').first()
  if (await nk.count()) await nk.click().catch(() => {})
  await page.waitForTimeout(800)
  for (let i = 0; i < 3; i++) { await page.locator('#next-button').click(); await page.waitForTimeout(1800) }
  await page.locator('tp-yt-paper-radio-button[name=PUBLIC]').first().click()
  let t = ''
  for (let i = 0; i < 100; i++) { t = await page.evaluate(() => document.body.innerText); if (/Checks complete/i.test(t)) break; await page.waitForTimeout(2000) }
  console.log('checks:', /Checks complete/i.test(t))
  await page.locator('#done-button').click()
  await page.waitForTimeout(7000)
  t = await page.evaluate(() => document.body.innerText)
  console.log(JSON.stringify({ published: /Video published|Short published|published/i.test(t), stillChecking: /still checking/i.test(t) }))
  if (/still checking/i.test(t)) { const pub = page.locator('ytcp-button, button').filter({ hasText: /^Publish$/ }).first(); if (await pub.count()) { await pub.click(); await page.waitForTimeout(6000); console.log('forced publish') } }
  await page.locator('ytcp-video-share-dialog #close-button, tp-yt-iron-icon[icon="close"]').first().click().catch(() => {})
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
