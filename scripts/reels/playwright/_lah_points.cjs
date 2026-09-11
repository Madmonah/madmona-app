const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = b.contexts()[0]
  const page = ctx.pages().find(p => p.url().includes('lahajati.ai')) || await ctx.newPage()
  await page.goto('https://lahajati.ai/en/tools/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)
  const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
  const m = t.match(/.{0,40}(\d[\d,]{2,}).{0,40}/g) || []
  console.log(JSON.stringify({ id: (t.match(/ID:\s*\d+/) || [''])[0], nums: m.slice(0, 8) }))
  await b.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
