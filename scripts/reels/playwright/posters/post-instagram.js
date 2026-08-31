// post-instagram.js — post to Instagram via user's logged-in Chrome
const fs = require('fs')
const { connect, saveScreenshot } = require('../browser-lib')

async function postIG(mp4, caption) {
  const { browser, ctx } = await connect()
  const page = await ctx.newPage()
  await page.bringToFront()

  console.log('[ig] opening IG home…')
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)

  // Click Create (+ icon in sidebar) — svg[aria-label="New post"] or link[href*="/create/"]
  console.log('[ig] clicking Create…')
  const createBtn = page.locator('svg[aria-label*="New post"], svg[aria-label*="Create"], svg[aria-label*="إنشاء"], svg[aria-label*="منشور جديد"]').first()
  if (await createBtn.count()) {
    await createBtn.click(); await page.waitForTimeout(2500)
  } else {
    // Fallback: /create URL direct
    await page.goto('https://www.instagram.com/create/reel/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
  }

  await saveScreenshot(page, 'ig-01-create')

  // Some menus offer Post/Story/Reel — pick Reel if visible
  const reelOpt = page.locator('span:has-text("Reel"), div:has-text("Reel"):visible').first()
  if (await reelOpt.count()) { await reelOpt.click().catch(() => {}); await page.waitForTimeout(2000) }

  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(mp4)
  console.log('[ig] uploaded, waiting for processing…')
  await page.waitForTimeout(25000)
  await saveScreenshot(page, 'ig-02-after-upload')

  // Click Next twice (aspect / edits / caption)
  for (let i = 0; i < 3; i++) {
    const next = page.locator('div[role="button"]:has-text("Next"), div:has-text("Next"):visible, button:has-text("Next")').first()
    if (await next.count()) {
      console.log(`[ig] Next (${i+1})…`)
      await next.click().catch(() => {}); await page.waitForTimeout(3500)
    } else break
  }
  await saveScreenshot(page, 'ig-03-caption-step')

  // Caption
  const capInput = page.locator('div[contenteditable="true"]').first()
  if (await capInput.count()) {
    console.log('[ig] writing caption…')
    await capInput.click(); await capInput.fill(caption); await page.waitForTimeout(2000)
  }

  // Share
  const shareBtn = page.locator('div[role="button"]:has-text("Share"), button:has-text("Share")').first()
  if (await shareBtn.count()) {
    console.log('[ig] sharing…')
    await shareBtn.click(); await page.waitForTimeout(15000)
  } else {
    console.log('[ig] WARN: share button not found')
    await saveScreenshot(page, 'ig-no-share')
  }
  await saveScreenshot(page, 'ig-04-after-share')

  const url = page.url()
  await page.close()
  await browser.close()
  return { platform: 'instagram', url }
}

async function main() {
  const mp4 = process.argv[2] || process.env.MP4_PATH
  const caption = process.argv[3] || process.env.CAPTION || '✨ من مضمونة\n🔗 https://madmonacairo.com\n#مضمونة'
  if (!mp4 || !fs.existsSync(mp4)) { console.error('Provide MP4 path'); process.exit(1) }
  try {
    const r = await postIG(mp4, caption)
    console.log('✓ ' + JSON.stringify(r))
  } catch (e) { console.error('✗ ' + e.message); process.exit(1) }
}
main()
