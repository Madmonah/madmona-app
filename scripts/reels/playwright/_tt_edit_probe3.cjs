const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://www.tiktok.com/@madmonacairo', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(10000)
  await page.locator('[data-e2e="edit-profile-entrance"]').first().click(); await page.waitForTimeout(4000)
  const o = await page.evaluate(() => [...document.querySelectorAll('[role=dialog], [class*="Modal"], [class*="modal"]')].map(d => ({ text: d.innerText.replace(/\s+/g, ' ').slice(0, 220), inputs: [...d.querySelectorAll('input,textarea')].map(e => e.tagName + ':' + (e.getAttribute('data-e2e') || e.placeholder || '') + '=' + (e.value || '').slice(0, 30)) })).filter(d => /Edit profile|Bio|Website|Name/.test(d.text)).slice(0, 3))
  console.log(JSON.stringify(o)); await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
