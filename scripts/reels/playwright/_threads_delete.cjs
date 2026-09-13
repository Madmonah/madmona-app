// 🧵 حذف بوست ثريدز مكرر (كروم السوشيال 9223). argv: <postUrl>
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  const url = process.argv[2]
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000)
  // زرار More بتاع البوست نفسه = آخر svg[aria-label=More] جوّه المقال الأول (الأولين في السايدبار)
  const clicked = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll('svg[aria-label="More"]')]
    const s = svgs[svgs.length - 1]; if (!s) return false
    const btn = s.closest('[role=button]') || s.parentElement; btn.click(); return true
  })
  await page.waitForTimeout(1500)
  const menu = await page.evaluate(() => [...document.querySelectorAll('[role=menuitem],[role=button]')].map(e => e.innerText.trim()).filter(t => /delete|حذف/i.test(t)))
  const del = page.locator('[role=menuitem]:has-text("Delete"), div[role=button]:has-text("Delete")').first()
  await del.click({ timeout: 8000 }); await page.waitForTimeout(1500)
  const conf = page.locator('[role=dialog] [role=button]:has-text("Delete"), [role=dialog] button:has-text("Delete")').last()
  await conf.click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(4000)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(4000)
  const body = await page.evaluate(() => document.body.innerText.slice(0, 400))
  console.log(JSON.stringify({ clicked, menu, gone: /isn.t available|not available|Sorry/i.test(body) || !/طلعت حرب/.test(body) }))
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
