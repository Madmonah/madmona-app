// scripts/reels/playwright/publish-facebook.js
// Publish a video as a Facebook Reel on Mohamed's personal account.
// Uses the same persistent profile as record-design.js — Mohamed logs in once.
//
// Usage: node publish-facebook.js <mp4_path> "<caption>"

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const PROFILE_DIR = path.join(__dirname, 'profile')

async function main() {
  const mp4 = process.argv[2]
  const caption = process.argv[3] || 'مضمونة — معاملاتك مضمونة 🚀\nmadmonacairo.com\n\n#مضمونة #القاهرة_الجديدة #ريلز'

  if (!mp4 || !fs.existsSync(mp4)) throw new Error(`MP4 not found: ${mp4}`)

  console.log(`[fb] publishing: ${path.basename(mp4)}`)
  console.log(`[fb] caption: ${caption.slice(0, 60)}…`)

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false, // headed first; can switch to true once profile is fully bootstrapped
    viewport: { width: 1440, height: 900 },
    args: ['--window-size=1500,940'],
  })

  const page = context.pages()[0] || await context.newPage()
  await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle', timeout: 30000 })

  // Verify logged in — the composer input only appears when authed
  const composer = await page.waitForSelector('[aria-label*="What\'s on your mind" i], [placeholder*="What\'s on your mind" i]', { timeout: 15000 })
    .catch(() => null)
  if (!composer) throw new Error('not logged into Facebook — run once headed and log in')

  // Open Create Reel modal — the icon is the third one after the composer text
  console.log('[fb] opening Create Reel modal…')
  // Find "Reel" icon in composer row — has a red video icon with the Reels logo
  const reelIcon = await page.locator('[aria-label*="Reel" i]:visible').first()
  if (!(await reelIcon.count())) {
    // Fallback: navigate directly to compose URL
    await page.goto('https://www.facebook.com/?compose_reel=1', { waitUntil: 'networkidle' })
  } else {
    await reelIcon.click()
  }
  await page.waitForTimeout(3000)

  // Wait for modal + file input
  const fileInput = await page.waitForSelector('input[type="file"][accept*="video"]', { timeout: 15000 })
  console.log('[fb] uploading video…')
  await fileInput.setInputFiles(mp4)

  // Wait for FB to finish processing (Next button becomes enabled)
  console.log('[fb] waiting for upload to finish (up to 3 min)…')
  await page.waitForSelector('div[role="button"]:has-text("Next"):not([aria-disabled="true"])', { timeout: 180000 })

  console.log('[fb] clicking Next…')
  await page.locator('div[role="button"]:has-text("Next"):not([aria-disabled="true"])').first().click()
  await page.waitForTimeout(2000)

  // Second Next (crop/adjust step, if present)
  const next2 = await page.locator('div[role="button"]:has-text("Next"):not([aria-disabled="true"])').first()
  if (await next2.count()) { await next2.click(); await page.waitForTimeout(2000) }

  // Caption textarea
  console.log('[fb] adding caption…')
  const captionBox = await page.locator('[contenteditable="true"][aria-label*="Description" i], [contenteditable="true"][aria-label*="Say something" i]').first()
  if (await captionBox.count()) {
    await captionBox.click()
    await page.keyboard.type(caption, { delay: 5 })
  }

  // Publish
  console.log('[fb] publishing…')
  const publishBtn = await page.locator('div[role="button"]:has-text("Publish"):not([aria-disabled="true"]), div[role="button"]:has-text("Share"):not([aria-disabled="true"])').first()
  await publishBtn.click()
  await page.waitForTimeout(8000)

  console.log('[fb] ✓ published — check your feed')
  await context.close()
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
