// 🗑️ حذف منشور من تيك توك (Studio) و/أو إنستجرام من كروم السوشيال (CDP 9223) — للنسخ اللي نزلت بصوت غلط.
// argv: tiktok <videoId> | instagram <reelShortcode|url>
const { chromium } = require('playwright')
const [, , platform, target] = process.argv
;(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = browser.contexts()[0]
  const page = await ctx.newPage()
  if (platform === 'tiktok') {
    await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(12000)
    const row = page.locator(`a[href*="/video/${target}"]`).first()
    if (!(await row.count())) throw new Error('video row not found')
    const container = row.locator('xpath=ancestor::*[.//button][1]')
    // زرار «...» / More في نفس الصف
    const more = page.locator(`[data-e2e*="more"], button:has(svg)`).filter({ has: page.locator('svg') })
    const rowEl = await row.elementHandle()
    const rowBox = await rowEl.boundingBox()
    const btns = await page.$$('button')
    let clicked = false
    for (const b of btns) {
      const bb = await b.boundingBox().catch(() => null)
      if (!bb || !rowBox) continue
      if (Math.abs(bb.y - rowBox.y) < 80 && bb.x > rowBox.x) {
        const t = (await b.innerText().catch(() => '')).trim()
        const al = (await b.getAttribute('aria-label').catch(() => '')) || ''
        if (/more|المزيد|\.\.\.|options/i.test(t + ' ' + al) || (!t && bb.width < 60)) { await b.click(); clicked = true; break }
      }
    }
    if (!clicked) throw new Error('more button not found near row')
    await page.waitForTimeout(1500)
    const del = page.locator('text=/^(Delete|حذف)$/').first()
    if (!(await del.count())) throw new Error('Delete menu item not found')
    await del.click()
    await page.waitForTimeout(1500)
    const confirm = page.locator('button:has-text("Delete"), button:has-text("حذف")').last()
    await confirm.click()
    await page.waitForTimeout(4000)
    console.log('tiktok deleted?', !(await page.locator(`a[href*="/video/${target}"]`).count()))
  } else if (platform === 'instagram') {
    const url = target.startsWith('http') ? target : `https://www.instagram.com/reel/${target}/`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(6000)
    const more = page.locator('svg[aria-label="More options"], svg[aria-label="المزيد"]').first()
    if (!(await more.count())) throw new Error('More options not found')
    await more.locator('xpath=ancestor::*[@role="button"][1]').click()
    await page.waitForTimeout(1500)
    await page.locator('button:has-text("Delete"), button:has-text("حذف")').first().click()
    await page.waitForTimeout(1500)
    await page.locator('button:has-text("Delete"), button:has-text("حذف")').first().click()
    await page.waitForTimeout(4000)
    console.log('instagram delete clicked; now at', page.url())
  }
  await page.close().catch(() => {})
  await browser.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
