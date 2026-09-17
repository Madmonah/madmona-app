// روابط فيديوهات تيك توك مع أول كلام الكابشن من TikTok Studio (كروم السوشيال)
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const p = await b.contexts()[0].newPage()
  await p.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(12000)
  const rows = await p.evaluate(() => [...document.querySelectorAll('a[href*="/video/"]')].map(a => (a.href.match(/video\/(\d+)/) || [])[1] + ' ' + (a.innerText || '').replace(/\s+/g, ' ').slice(0, 40)).filter(x => !/^undefined/.test(x)).slice(0, 8))
  console.log(JSON.stringify(rows)); await p.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
