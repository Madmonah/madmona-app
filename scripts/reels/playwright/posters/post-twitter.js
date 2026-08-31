// post-twitter.js — post to X via user's logged-in Chrome
const fs = require('fs')
const { connect, saveScreenshot } = require('../browser-lib')

async function postX(mp4, caption) {
  const { browser, ctx } = await connect()
  const page = await ctx.newPage()
  await page.bringToFront()

  console.log('[x] opening compose…')
  await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)

  // Type caption
  const textbox = page.locator('div[role="textbox"], div[contenteditable="true"]').first()
  if (await textbox.count()) {
    console.log('[x] typing caption…')
    await textbox.click(); await textbox.fill(caption.slice(0, 260)); await page.waitForTimeout(1500)
  }

  // Attach media
  const fileInput = page.locator('input[type="file"]').first()
  console.log('[x] attaching MP4…')
  await fileInput.setInputFiles(mp4)
  await page.waitForTimeout(20000)  // wait upload
  await saveScreenshot(page, 'x-after-upload')

  // Post button
  const postBtn = page.locator('button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"], div[data-testid="tweetButton"]').first()
  if (await postBtn.count()) {
    console.log('[x] posting…')
    await postBtn.click({ force: true }); await page.waitForTimeout(8000)
  } else {
    console.log('[x] WARN: post button not found')
    await saveScreenshot(page, 'x-no-post')
  }
  await saveScreenshot(page, 'x-after-post')

  const url = page.url()
  await page.close()
  await browser.close()
  return { platform: 'x', url }
}

async function main() {
  const mp4 = process.argv[2] || process.env.MP4_PATH
  const caption = process.argv[3] || process.env.CAPTION || '✨ من مضمونة\n🔗 https://madmonacairo.com'
  if (!mp4 || !fs.existsSync(mp4)) { console.error('Provide MP4 path'); process.exit(1) }
  try {
    const r = await postX(mp4, caption)
    console.log('✓ ' + JSON.stringify(r))
  } catch (e) { console.error('✗ ' + e.message); process.exit(1) }
}
main()
