// 🔗 قراءة لينك البايو في إنستجرام وتيك توك (كروم السوشيال 9223)
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage(); const out = {}
  await page.goto('https://www.instagram.com/madmona.cairo/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000)
  out.instagram = await page.evaluate(() => { const a = [...document.querySelectorAll('header a[href*="l.instagram.com"], header a[rel*="nofollow"]')].map(x => x.innerText.trim() + ' → ' + x.href.slice(0, 120)); const bio = (document.querySelector('header section')||{innerText:''}).innerText.replace(/\s+/g,' ').slice(0,200); return { links: a, bio } })
  await page.goto('https://www.tiktok.com/@madmonacairo', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000)
  out.tiktok = await page.evaluate(() => ({ bio: (document.querySelector('[data-e2e=user-bio]')||{innerText:''}).innerText.slice(0,200), link: (document.querySelector('[data-e2e=user-link]')||{innerText:'', href:''}).innerText }))
  console.log(JSON.stringify(out)); await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 160)); process.exit(1) })
