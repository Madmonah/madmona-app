// ▶️ قايمة آخر شورتس في Studio (عنوان · حالة · id)
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://studio.youtube.com/channel/UCQJFRUo9XMkSAthYw_I-c8g/videos/short', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(9000)
  const rows = await page.evaluate(() => [...document.querySelectorAll('ytcp-video-row')].slice(0, 3).map(r => ({ title: (r.querySelector('#video-title')||{innerText:''}).innerText.trim().slice(0, 40), vis: (r.querySelector('.tablecell-visibility, ytcp-video-visibility-select, [class*=visibility]')||{innerText:''}).innerText.replace(/\s+/g,' ').trim().slice(0, 30), href: (r.querySelector('a#video-title, a[href*="/video/"]')||{href:''}).href.match(/video\/([^/]+)/)?.[1] || '' })))
  console.log(JSON.stringify(rows)); await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 160)); process.exit(1) })
