// أحدث روابط فيديوهات تيك توك من صفحة البروفايل العامة (كروم السوشيال)
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const p = await b.contexts()[0].newPage()
  await p.goto('https://www.tiktok.com/@madmonacairo', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(9000)
  const ids = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/video/"]')].map(a => a.href))].slice(0, 6))
  console.log(JSON.stringify(ids)); await p.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
