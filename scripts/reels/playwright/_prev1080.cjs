const { chromium } = require('playwright')
;(async () => {
  const [file, at, tag] = [process.argv[2], Number(process.argv[3]), process.argv[4]]
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  await p.goto('file:///E:/madmona-app/scripts/reels/playwright/reels/' + file, { waitUntil: 'load' })
  await p.waitForTimeout(1200)
  await p.evaluate(() => { if (window.__replay) window.__replay() })
  await p.waitForTimeout(at * 1000)
  await p.screenshot({ path: 'E:/madmona-app/scripts/reels/playwright/output/_pv_' + tag + '.png', scale: 'css' })
  await b.close(); console.log('shot', tag)
})().catch(e => { console.log('ERR', e.message); process.exit(1) })
