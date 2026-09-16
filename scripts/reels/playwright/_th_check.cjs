const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 25000 })
  const p = await b.contexts()[0].newPage()
  await p.goto('https://www.threads.com/@madmona.cairo', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(9000)
  const out = await p.evaluate(() => {
    const links = [...document.querySelectorAll('a[href*="/post/"]')].slice(0, 5).map(a => a.href.split('/post/')[1].split('?')[0])
    const txt = document.body.innerText.replace(/\s+/g, ' ')
    return { links: [...new Set(links)], hasMoney: txt.includes('٥٪ مقدم بس'), hasRoi: txt.includes('تكسب ولا تخسر'), hasWhen: txt.includes('إمتى تكسب من العقارات') }
  })
  console.log(JSON.stringify(out))
  await p.close()
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
