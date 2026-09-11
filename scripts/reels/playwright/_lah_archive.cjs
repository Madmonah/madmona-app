const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = b.contexts()[0]
  const page = ctx.pages().find(p => p.url().includes('lahajati.ai')) || await ctx.newPage()
  await page.goto('https://lahajati.ai/en/audio-archive', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)
  const info = await page.evaluate(() => {
    const a = document.querySelector('a[href*="audio_file"]')
    let row = a; for (let i = 0; i < 6 && row && (row.innerText || '').length < 120; i++) row = row.parentElement
    const pts = (document.body.innerText.match(/(\d[\d,]{2,})\s*(?=\n)/g) || []).slice(0, 3)
    return { row: (row?.innerText || '').replace(/\s+/g, ' ').slice(0, 300), head: document.body.innerText.slice(0, 160).replace(/\s+/g, ' ') }
  })
  console.log(JSON.stringify(info))
  await b.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
