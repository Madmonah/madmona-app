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
    // 🐞 (١٢/٩) الـsvg بيظهر متأخر ومتقلّب — استنى لحد ٣٠ ث، والكليك على أقرب [role=button] له
    let r = 'no-svg'
    for (let i = 0; i < 15 && r !== 'clicked'; i++) {
      await page.waitForTimeout(2000)
      r = await page.evaluate(() => { const s = [...document.querySelectorAll('svg[aria-label]')].find(s => /^(more options|more|المزيد)$/i.test((s.getAttribute('aria-label') || '').trim())); if (!s) return 'no-svg'; (s.closest('[role=button]') || s.parentElement).click(); return 'clicked' })
    }
    if (r !== 'clicked') { const labels = await page.evaluate(() => [...new Set([...document.querySelectorAll('svg[aria-label]')].map(s => s.getAttribute('aria-label')))].slice(0, 20)); throw new Error('More options not found; svgs=' + JSON.stringify(labels)) }
    await page.waitForTimeout(2000)
    const menu = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] button, [role=dialog] [role=button]')].map(b => b.innerText.trim()).filter(Boolean).slice(0, 10))
    console.log('menu:', JSON.stringify(menu))
    // على حساب الأعمال: «Manage post» أول → جوّاه Delete
    const clickText = (re) => page.evaluate((src) => { const rx = new RegExp(src, 'i'); const el = [...document.querySelectorAll('[role=dialog] button, [role=dialog] [role=button], [role=dialog] [role=menuitem]')].find(b => rx.test(b.innerText.trim())); if (!el) return false; el.click(); return true }, re.source)
    if (await clickText(/^(Manage post|إدارة المنشور)$/)) { await page.waitForTimeout(1500); console.log('sub:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[role=dialog] button, [role=dialog] [role=button]')].map(b => b.innerText.trim()).filter(Boolean).slice(0, 10)))) }
    if (!(await clickText(/^(Delete|حذف)$/))) throw new Error('Delete item not in menu')
    await page.waitForTimeout(2000)
    await clickText(/^(Delete|حذف)$/)
    await page.waitForTimeout(4000)
    console.log('instagram deleted; now at', page.url())
  }
  await page.close().catch(() => {})
  await browser.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
