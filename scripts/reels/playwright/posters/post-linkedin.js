// post-linkedin.js — post to LinkedIn via user's logged-in Chrome
const fs = require('fs')
const { connect, saveScreenshot } = require('../browser-lib')

async function postLI(mp4, caption) {
  const { browser, ctx } = await connect()
  const page = await ctx.newPage()
  await page.bringToFront()

  console.log('[li] opening feed…')
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)

  // Click "Start a post"
  console.log('[li] Start a post…')
  const startBtn = page.locator('button:has-text("Start a post"), button:has-text("ابدأ منشورا")').first()
  if (await startBtn.count()) { await startBtn.click(); await page.waitForTimeout(2500) }

  // Click video icon
  console.log('[li] Video…')
  const vidBtn = page.locator('button:has-text("Video"), button[aria-label*="video"]').first()
  if (await vidBtn.count()) { await vidBtn.click(); await page.waitForTimeout(2500) }

  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(mp4)
  console.log('[li] uploaded, processing…')
  await page.waitForTimeout(25000)
  await saveScreenshot(page, 'li-after-upload')

  // Done / Next
  const doneBtn = page.locator('button:has-text("Done"), button:has-text("Next")').first()
  if (await doneBtn.count()) { await doneBtn.click(); await page.waitForTimeout(3000) }

  // Caption
  const capInput = page.locator('div[role="textbox"], div[contenteditable="true"]').first()
  if (await capInput.count()) {
    await capInput.click(); await capInput.fill(caption); await page.waitForTimeout(2000)
  }

  // Post
  const postBtn = page.locator('button:has-text("Post"), button.share-actions__primary-action').first()
  if (await postBtn.count()) {
    console.log('[li] posting…')
    await postBtn.click(); await page.waitForTimeout(10000)
  } else {
    await saveScreenshot(page, 'li-no-post')
  }
  await saveScreenshot(page, 'li-after-post')

  const url = page.url()
  await page.close()
  await browser.close()
  return { platform: 'linkedin', url }
}

async function main() {
  const mp4 = process.argv[2] || process.env.MP4_PATH
  const caption = process.argv[3] || process.env.CAPTION || '✨ من مضمونة\n🔗 https://madmonacairo.com'
  if (!mp4 || !fs.existsSync(mp4)) { console.error('Provide MP4 path'); process.exit(1) }
  try {
    const r = await postLI(mp4, caption)
    console.log('✓ ' + JSON.stringify(r))
  } catch (e) { console.error('✗ ' + e.message); process.exit(1) }
}
main()
