const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto('https://www.youtube.com/watch?v=' + process.argv[2], { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(7000); await page.mouse.wheel(0, 1200); await page.waitForTimeout(4000)
  const r = await page.evaluate(() => { const t = document.body.innerText; return { title: document.title.slice(0, 60), comments: (t.match(/.{0,50}[Cc]omments?.{0,80}/) || [''])[0].replace(/\s+/g, ' '), processing: /processing|unavailable|private/i.test(t), simplebox: !!document.querySelector('#simplebox-placeholder'), threads: document.querySelectorAll('ytd-comment-thread-renderer').length, signed: !!document.querySelector('#avatar-btn') } })
  console.log(JSON.stringify(r)); await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 120)); process.exit(1) })
