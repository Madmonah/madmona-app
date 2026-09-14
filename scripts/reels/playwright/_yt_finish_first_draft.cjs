// ▶️ يكمّل نشر أول صف درافت في قايمة الشورتس (لما مفيش id): hover الصف → «Edit draft» → نفس خطوات _yt_finish_draft.cjs
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://studio.youtube.com/channel/UCQJFRUo9XMkSAthYw_I-c8g/videos/short', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(9000)
  const row = page.locator('ytcp-video-row').first()
  const vis = await row.locator('[class*=visibility], ytcp-video-visibility-select').first().innerText().catch(() => '')
  if (!/Draft/i.test(vis)) { console.log(JSON.stringify({ skip: true, vis })); await page.close(); await b.close(); return }
  await row.hover(); await page.waitForTimeout(1200)
  const ed = row.locator('ytcp-button').filter({ hasText: /Edit draft/i }).first()
  if (await ed.count()) await ed.click({ timeout: 10000 }); else await row.locator('#video-title').first().click({ timeout: 10000 })
  await page.waitForSelector('ytcp-uploads-dialog', { state: 'attached', timeout: 30000 }); await page.waitForTimeout(4000)
  const nk = page.locator('tp-yt-paper-radio-button[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]').first()
  if (await nk.count()) await nk.click().catch(() => {})
  await page.waitForTimeout(800)
  for (let i = 0; i < 3; i++) { await page.locator('#next-button').click(); await page.waitForTimeout(1800) }
  await page.locator('tp-yt-paper-radio-button[name=PUBLIC]').first().click()
  let t = ''
  for (let i = 0; i < 100; i++) { t = await page.evaluate(() => document.body.innerText); if (/Checks complete/i.test(t)) break; await page.waitForTimeout(2000) }
  const checks = /Checks complete/i.test(t)
  await page.locator('#done-button').click(); await page.waitForTimeout(7000)
  t = await page.evaluate(() => document.body.innerText)
  if (/still checking/i.test(t)) { const pub = page.locator('ytcp-button, button').filter({ hasText: /^Publish$/ }).first(); if (await pub.count()) { await pub.click(); await page.waitForTimeout(7000); t = await page.evaluate(() => document.body.innerText) } }
  const link = (t.match(/youtube\.com\/shorts\/[A-Za-z0-9_-]+|youtu\.be\/[A-Za-z0-9_-]+/) || [''])[0]
  console.log(JSON.stringify({ checks, published: /published/i.test(t), link }))
  await page.locator('ytcp-video-share-dialog #close-button, tp-yt-iron-icon[icon="close"]').first().click().catch(() => {})
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
