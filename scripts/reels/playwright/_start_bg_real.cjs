// E2E من كروم حقيقي (CDP 9223) — نقطة تفتيش فيرسل بترفض الهيدلس، فالفحص الحقيقي لازم يتعمل من متصفح عادي.
// السيناريو: فورم → شاشة الكود → التاب يبقى في الخلفية (زي ما المستخدم يروح واتساب) → الكود يوصل → يرجع → لازم تكمّل لوحدها.
const { chromium } = require('playwright'); const fs = require('fs')
const SECRET = (fs.readFileSync('E:/madmona-app/.env.vercel-prod', 'utf8').match(/WA_SERVICE_SECRET="([^"]+)"/) || [])[1]
const PHONE = process.argv[2] || '01999888793'
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const ctx = b.contexts()[0]
  const p = await ctx.newPage()
  await p.goto('https://www.madmonacairo.com/start?utm_source=e2e_real', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForSelector('form', { timeout: 40000 })
  await p.fill('input[placeholder*="عيادة د"]', 'عيادة اختبار خلفية (تتمسح)')
  await p.fill('input[inputmode="tel"]', PHONE)
  await p.fill('input[type="password"]', 'Nagah' + Date.now().toString().slice(-6))
  await p.click('button[type="submit"]')
  await p.waitForSelector('text=ابعت الكود ده', { timeout: 45000 })
  const code = (await p.textContent('div[dir="ltr"]')).trim()
  // التاب يروح للخلفية (المستخدم فتح واتساب)
  const other = await ctx.newPage(); await other.goto('https://example.com'); await other.bringToFront()
  await p.waitForTimeout(2000)
  const hidden = await p.evaluate(() => document.visibilityState)
  const wh = { event: 'message.received', sessionId: '201114621551', data: { from: '2' + PHONE.replace(/^0/, '') + '@c.us', to: '201114621551@c.us', body: code, fromMe: false, id: 'bgr-' + Date.now(), timestamp: Math.floor(Date.now() / 1000), type: 'chat' } }
  const r = await fetch('https://www.madmonacairo.com/api/whatsapp/openwa?token=' + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wh) }).then(x => x.json()).catch(e => ({ err: e.message }))
  await p.waitForTimeout(4000)
  await p.bringToFront()   // 🔙 رجع للصفحة
  await p.waitForURL(/\/admin\/business-finance\//, { timeout: 60000 }).catch(() => {})
  await p.waitForTimeout(3000)
  const url = p.url(); const text = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 130)
  console.log(JSON.stringify({ code, hiddenWhileSending: hidden, webhook: JSON.stringify(r).slice(0, 70), landedOnPanel: /business-finance/.test(url), url: url.slice(0, 95), text }))
  await other.close(); await p.close()
})().catch(e => console.log('ERR', e.message.slice(0, 200)))
