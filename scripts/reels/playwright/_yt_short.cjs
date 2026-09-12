// ▶️ رفع شورت على قناة Madmona من كروم السوشيال (CDP 9223 — YouTube Studio مفتوح هناك) بدل إضافة كروم محمد.
// argv: <slug> [mp4path]  → العنوان/الوصف من output/caption-<slug>-youtube.txt (سطر ١ = العنوان ≤١٠٠ حرف، الباقي الوصف)
// (١٢/٩) محمد: «ركّز على شورتس يوتيوب» — يوتيوب جاب ٥٤ زائر في أسبوع (أقوى قناة). الوصف فيه لينك بـutm_source=youtube&utm_medium=shorts.
// بعد النشر: يطبع رابط الشورت. الكومنت المثبّت بـ_yt_comment.cjs.
const { chromium } = require('playwright')
const fs = require('fs'), path = require('path')
const D = 'E:/madmona-app/scripts/reels/playwright/'
const slug = process.argv[2]
const mp4 = process.argv[3] || (D + 'output/reel-' + slug + '.mp4')
const cap = fs.readFileSync(D + 'output/caption-' + slug + '-youtube.txt', 'utf8').replace(/\r/g, '').trim()
const [title, ...rest] = cap.split('\n')
const desc = rest.join('\n').trim()
if ([...title].length > 100) throw new Error('title > 100 chars: ' + [...title].length)
if (!fs.existsSync(mp4)) throw new Error('mp4 missing: ' + mp4)
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = b.contexts()[0]
  const page = await ctx.newPage()
  await page.goto('https://studio.youtube.com/channel/UCQJFRUo9XMkSAthYw_I-c8g/videos/upload?d=ud', { waitUntil: 'domcontentloaded', timeout: 60000 })
  // الـinput مخفي (aria-hidden) — استنى وجوده في الـDOM بس، مش ظهوره
  await page.waitForSelector('ytcp-uploads-dialog input[type=file]', { state: 'attached', timeout: 60000 })
  await page.setInputFiles('ytcp-uploads-dialog input[type=file]', mp4)
  const tb = page.locator('#title-textarea #textbox, ytcp-social-suggestions-textbox#title-textarea #textbox').first()
  await tb.waitFor({ state: 'visible', timeout: 60000 })
  await page.waitForTimeout(2500)
  await tb.click(); await page.keyboard.press('Control+A'); await page.keyboard.type(title, { delay: 5 })
  const db = page.locator('#description-textarea #textbox, ytcp-social-suggestions-textbox#description-textarea #textbox').first()
  await db.click(); await page.keyboard.type(desc, { delay: 2 })
  // مش للأطفال (إجباري)
  await page.locator('tp-yt-paper-radio-button[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]').first().click()
  await page.waitForTimeout(800)
  const invalid = await page.locator('ytcp-form-input-container[invalid]').count()
  if (invalid) throw new Error('form invalid (title too long?)')
  for (let i = 0; i < 3; i++) { await page.locator('#next-button').click(); await page.waitForTimeout(1800) }
  await page.locator('tp-yt-paper-radio-button[name=PUBLIC]').first().click()
  // استنى الفحص يخلص (٢–٣ دقايق أحيانًا)
  let link = ''
  for (let i = 0; i < 90; i++) {
    const t = await page.evaluate(() => document.body.innerText)
    link = await page.evaluate(() => document.querySelector('a.ytcp-video-info, ytcp-video-info a')?.href || '')
    if (/Checks complete/i.test(t)) break
    await page.waitForTimeout(2000)
  }
  await page.locator('#done-button').click()
  await page.waitForTimeout(6000)
  let published = await page.evaluate(() => /Video published|Short published/i.test(document.body.innerText))
  // 🐞 (١٢/٩) لو الفحص ماخلصش في الوقت، Done بيسيب الفيديو درافت Private — «still checking» → اضغط Publish صراحةً، وإلا كمّل بـ_yt_finish_draft.cjs <id>
  if (!published) { const t = await page.evaluate(() => document.body.innerText); if (/still checking/i.test(t)) { const pub = page.locator('ytcp-button, button').filter({ hasText: /^Publish$/ }).first(); if (await pub.count()) { await pub.click(); await page.waitForTimeout(6000); published = await page.evaluate(() => /Video published|Short published/i.test(document.body.innerText)) } } }
  if (!published) console.error('⚠️ مش متأكد إنه اتنشر — شغّل: node _yt_finish_draft.cjs <videoId>')
  console.log(JSON.stringify({ slug, link, published, title }))
  await page.locator('ytcp-video-share-dialog #close-button, tp-yt-iron-icon[icon="close"]').first().click().catch(() => {})
  await page.close().catch(() => {}); await b.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
