// 🎥 تصوير حقيقي للموقع على موبايل (١٧/٩/٢٠٢٦) — محمد: «الريلز كلها شبه بعض… مفيش تنويع وجرافيك احترافي».
// بدل كروت النص: فريمات PNG حقيقية من الموقع اللايف بسكرول ناعم، تتركّب بعدين في موكاب موبايل بـffmpeg.
// argv: <name> <url> <scrollPx> <frames>
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const [, , name, url, scrollPx = '1400', frames = '150'] = process.argv
const out = path.join(__dirname, 'shots', name)
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true })

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: 'ar-EG' })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  await p.waitForTimeout(4000)
  // اخفي أي بانر كوكيز/تثبيت عشان اللقطة تبقى نضيفة
  await p.addStyleTag({ content: '[class*="install"],[class*="cookie"],[id*="cookie"]{display:none!important}' }).catch(() => {})
  const total = +frames, dist = +scrollPx
  const hold = Math.round(total * 0.18) // ثبات في الأول قبل السكرول
  for (let i = 0; i < total; i++) {
    const t = Math.max(0, (i - hold) / (total - hold))
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 // easeInOutCubic
    await p.evaluate(y => window.scrollTo(0, y), Math.round(e * dist))
    await p.screenshot({ path: path.join(out, String(i).padStart(4, '0') + '.png') })
  }
  console.log(JSON.stringify({ name, frames: total, dir: out }))
  await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 300)); process.exit(1) })
