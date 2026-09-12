const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = b.contexts()[0]
  const p = await ctx.newPage()
  await p.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(12000)
  const rows = await p.evaluate(() => [...document.querySelectorAll('a[href*="/video/"]')].slice(0, 12).map(a => {
    let r = a; for (let i = 0; i < 8 && r && !(r.innerText || '').match(/\n\d[\d,.]*K?\s*\n/); i++) r = r.parentElement
    const t = (r?.innerText || '').replace(/\s+/g, ' ')
    return { title: a.innerText.trim().slice(0, 45), nums: (t.match(/\b\d[\d,.]*K?\b/g) || []).slice(-4) }
  }))
  console.log(JSON.stringify(rows))
  await p.close(); await b.close()
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
