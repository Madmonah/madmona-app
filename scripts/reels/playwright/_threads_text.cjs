const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  const out = []
  for (const u of process.argv.slice(2)) {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(5000)
    const t = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 260))
    const more = await page.locator('svg[aria-label="More"]').count()
    out.push({ u: u.split('/').pop(), more, t })
  }
  console.log(JSON.stringify(out)); await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
