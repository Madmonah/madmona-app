const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const page = await b.contexts()[0].newPage()
  for (const c of process.argv.slice(2)) {
    await page.goto(`https://www.instagram.com/p/${c}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(7000)
    const t = await page.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' '))
    console.log(c, JSON.stringify({ new77946: t.includes('٧٧٬٩٤٦'), old69271: t.includes('٦٩٬٢٧١'), old7m: t.includes('وسيط') }))
  }
  await page.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1) })
