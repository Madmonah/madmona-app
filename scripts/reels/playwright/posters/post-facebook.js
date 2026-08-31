// post-facebook.js — post to Facebook via user's logged-in Chrome
// Uses facebook.com/reel/create (works for personal profiles + pages)
const path = require('path')
const fs = require('fs')
const { connect, saveScreenshot } = require('../browser-lib')

async function postFB(mp4, caption) {
  const { browser, ctx } = await connect()
  const page = await ctx.newPage()
  await page.bringToFront()

  console.log('[fb] opening reel composer…')
  await page.goto('https://www.facebook.com/reel/create/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)

  // Some FB flows show a landing/consent screen; check and continue
  // Try direct video upload via file input
  const fileInput = await page.locator('input[type="file"]').first()
  console.log('[fb] uploading MP4…')
  await fileInput.setInputFiles(mp4)

  // Wait for the video to appear/process (up to 3 min)
  console.log('[fb] waiting for processing…')
  await page.waitForTimeout(20000)  // initial upload
  await saveScreenshot(page, 'fb-after-upload')

  // Try Next / التالي
  const nextBtn = page.locator('div[role="button"]:has-text("Next"), div[role="button"]:has-text("التالي")').first()
  if (await nextBtn.count()) {
    console.log('[fb] Next…')
    await nextBtn.click(); await page.waitForTimeout(4000)
  }

  // Caption input
  const capInput = page.locator('div[contenteditable="true"]').first()
  if (await capInput.count()) {
    console.log('[fb] writing caption…')
    await capInput.click(); await capInput.fill(caption)
    await page.waitForTimeout(2000)
  }

  // Next again
  if (await nextBtn.count()) { await nextBtn.click(); await page.waitForTimeout(4000) }

  // Publish / نشر
  const publishBtn = page.locator('div[role="button"]:has-text("Publish"), div[role="button"]:has-text("Share"), div[role="button"]:has-text("نشر")').first()
  if (await publishBtn.count()) {
    console.log('[fb] publishing…')
    await publishBtn.click()
    await page.waitForTimeout(15000)
  } else {
    console.log('[fb] WARN: publish button not found — leaving tab open for manual review')
    await saveScreenshot(page, 'fb-no-publish')
  }

  await saveScreenshot(page, 'fb-after-publish')
  const url = page.url()
  console.log('[fb] final URL: ' + url)
  await page.close()
  await browser.close()
  return { platform: 'facebook', url }
}

async function main() {
  const mp4 = process.argv[2] || process.env.MP4_PATH
  const caption = process.argv[3] || process.env.CAPTION || '✨ من مضمونة\n🔗 https://madmonacairo.com\n#مضمونة'
  if (!mp4 || !fs.existsSync(mp4)) { console.error('Provide MP4 path as arg 1 or env MP4_PATH'); process.exit(1) }
  try {
    const r = await postFB(mp4, caption)
    console.log('✓ ' + JSON.stringify(r))
  } catch (e) {
    console.error('✗ ' + e.message); process.exit(1)
  }
}
main()
