// 💬 قراءة كومنتات تيك توك/إنستجرام/ثريدز على بوست (كروم السوشيال 9223). argv: <tiktokUrl> <igCode> <threadsUrl>
const { chromium } = require('playwright')
;(async () => {
  const [tt, ig, th] = process.argv.slice(2)
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = b.contexts()[0]; const out = {}
  const page = await ctx.newPage()
  if (tt) { await page.goto(tt, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000)
    await page.locator('[data-e2e=comment-icon]').first().click({ timeout: 10000 }).catch(() => {}); await page.waitForTimeout(4000)
    out.tiktok = await page.evaluate(() => [...document.querySelectorAll('[data-e2e=comment-level-1]')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 80)).slice(0, 10)) }
  if (ig) { await page.goto('https://www.instagram.com/p/' + ig + '/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(7000)
    out.instagram = await page.evaluate(() => [...document.querySelectorAll('ul ul li, ul > div > li')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 80)).filter(t => t).slice(0, 10)) }
  if (th) { await page.goto(th, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000)
    out.threads = await page.evaluate(() => { const t = document.body.innerText; const i = t.indexOf('Replies'); return t.slice(i, i + 400).replace(/\s+/g, ' ') }) }
  console.log(JSON.stringify(out)); await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 160)); process.exit(1) })
