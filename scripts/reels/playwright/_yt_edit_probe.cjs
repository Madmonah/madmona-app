const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 })
  const page = await b.contexts()[0].newPage()
  await page.goto(`https://studio.youtube.com/video/${process.argv[2]}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(9000)
  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /^(Private|Public|Unlisted|Visibility)$/.test((e.textContent || '').trim()))
    return { url: location.href.slice(0, 80), els: els.slice(0, 8).map(e => { let p = e, chain = []; for (let i = 0; i < 5 && p; i++) { chain.push(p.tagName.toLowerCase() + (p.id ? '#' + p.id : '') + (p.className && typeof p.className === 'string' ? '.' + p.className.split(' ')[0] : '')); p = p.parentElement } return { t: e.textContent.trim(), chain } }), bodyHas: /Visibility/.test(document.body.innerText) }
  })
  console.log(JSON.stringify(r, null, 0)); await page.close(); await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 160)); process.exit(1) })
