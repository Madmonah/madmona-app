const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = b.contexts()[0]
  const p = await ctx.newPage()
  await p.goto('https://www.instagram.com/madmona.cairo/reels/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(9000)
  const rows = await p.evaluate(() => [...document.querySelectorAll('a[href*="/reel/"]')].slice(0, 10).map(a => ({ code: a.getAttribute('href').split('/reel/')[1]?.replace('/', ''), views: (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 20) })))
  console.log(JSON.stringify(rows))
  await p.close(); await b.close()
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
