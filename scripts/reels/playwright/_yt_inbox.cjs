// ▶️ قراءة كومنتات يوتيوب الأخيرة (Studio inbox) من كروم السوشيال — بدون رد.
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://studio.youtube.com/channel/UCQJFRUo9XMkSAthYw_I-c8g/comments/inbox?filter=%5B%5D', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(9000)
  const items = await page.evaluate(() => [...document.querySelectorAll('ytcp-comment-thread, ytcp-comment')].slice(0, 15).map(e => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 160)))
  console.log(JSON.stringify({ n: items.length, items: items.slice(0, 8) }))
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 160)); process.exit(1) })
