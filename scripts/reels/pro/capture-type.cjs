// 🎥 لقطة حقيقية بكتابة جوّه فورم /start (من غير إرسال) — فريم لكل حرف + ثبات.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const out = path.join(__dirname, 'shots', 'start-type')
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true })
let n = 0
const snap = async (p, reps = 1) => { for (let r = 0; r < reps; r++) await p.screenshot({ path: path.join(out, String(n++).padStart(4, '0') + '.png') }) }

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: 'ar-EG' })
  const p = await ctx.newPage()
  await p.goto('https://www.madmonacairo.com/start?utm_source=internal', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {})
  await p.waitForTimeout(3500)
  await p.evaluate(() => window.scrollTo(0, 230))
  await snap(p, 12)
  const name = p.locator('input').first()
  await name.click()
  for (const ch of 'عيادة د. سارة – المعادي') { await p.keyboard.type(ch); await snap(p, 2) }
  await snap(p, 10)
  const phone = p.locator('input[type=tel], input[inputmode=tel], input[placeholder*="01"]').first()
  await phone.click().catch(() => {})
  for (const ch of '01012345678') { await p.keyboard.type(ch); await snap(p, 2) }
  await snap(p, 14)
  console.log(JSON.stringify({ frames: n, dir: out }))
  await b.close()
})().catch(e => { console.error('ERR', e.message.slice(0, 300)); process.exit(1) })
