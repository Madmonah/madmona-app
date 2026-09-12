const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://www.threads.com/@madmona.cairo', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(7000)
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('a[href*="/post/"]')].map(a => { const art = a.closest('[data-pressable-container], div'); return { h: a.href.replace(/\?.*/, ''), nokia: /\u0646\u0648\u0643\u064a\u0627/.test((a.closest('div[data-pressable-container]') || a.parentElement.parentElement.parentElement || {}).innerText || '') } }).filter((v, i, s) => s.findIndex(x => x.h === v.h) === i).slice(0, 4))))
  console.log(JSON.stringify({ nokiaOnPage: /\u0646\u0648\u0643\u064a\u0627/.test(await page.evaluate(() => document.body.innerText)) }))
  await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 160)); process.exit(1) })
