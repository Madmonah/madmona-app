const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const ctx = b.contexts()[0]
  const page = ctx.pages().find(p => p.url().includes('lahajati.ai')) || await ctx.newPage()
  await page.goto('https://lahajati.ai/en/tools/text-to-speech-superior-v2', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.voice-card', { timeout: 30000 })
  const card = await page.evaluate(() => { const c = [...document.querySelectorAll('.voice-card')].find(c => c.innerText.trim().startsWith('بهجت')); c.click(); return c.innerText.replace(/\s+/g, ' ').slice(0, 120) + ' | attrs: ' + [...c.attributes].map(a => a.name + '=' + a.value.slice(0, 30)).join(' ') })
  await page.waitForTimeout(2500)
  const st = await page.evaluate(() => {
    const sels = [...document.querySelectorAll('select')].map(s => ({ id: s.id, val: s.value, selText: s.options[s.selectedIndex]?.text.slice(0, 40), n: s.options.length }))
    const pts = document.body.innerText.match(/[\d,]{3,}\s*(نقطة|نقاط|Points?|points)/i)?.[0] || ''
    const hdr = [...document.querySelectorAll('header, nav')].map(e => e.innerText.replace(/\s+/g, ' ')).join(' | ').slice(0, 300)
    return { sels, pts, hdr }
  })
  console.log(JSON.stringify({ card, ...st }))
  await b.close().catch(() => {})
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
