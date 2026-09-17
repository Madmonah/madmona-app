// لقطة واحدة من صفحة HTML بمقاس محدد: node _shot.cjs <html> <out.jpg> <w> <h>
const { chromium } = require('playwright'); const path = require('path')
const [, , html, out, w = '1080', h = '1350'] = process.argv
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const p = await b.newPage({ viewport: { width: +w, height: +h } })
  await p.goto('file:///' + path.resolve(html).split(path.sep).join('/'))
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1200)
  await p.screenshot({ path: out, type: 'jpeg', quality: 94 }); await b.close(); console.log('ok', out)
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
