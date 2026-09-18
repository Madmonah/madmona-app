// E2E (١٨/٩/٢٠٢٦ — محمد: «بيبعت الرسالة ومفيش توثيق والصفحة بتقف»)
// بيحاكي الموبايل بالظبط: المستخدم بيسيب التاب ويروح واتساب (التاب بيبقى hidden والتايمرز بتتجمّد)،
// الكود بيوصل وهو بره، وبعدين بيرجع للتاب → لازم الصفحة تكمّل لوحدها وتدخل لوحة الشركة.
const { chromium } = require('playwright'); const fs = require('fs')
const SECRET = (fs.readFileSync('E:/madmona-app/.env.vercel-prod', 'utf8').match(/WA_SERVICE_SECRET="([^"]+)"/) || [])[1]
const PHONE = process.argv[2] || '01999888792'
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, locale: 'ar-EG' })
  const p = await ctx.newPage()
  await p.goto('https://www.madmonacairo.com/start?utm_source=e2e_bg', { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForSelector('form', { timeout: 30000 })
  await p.fill('input[placeholder*="عيادة د"]', 'عيادة اختبار خلفية (تتمسح)')
  await p.fill('input[inputmode="tel"]', PHONE)
  await p.fill('input[type="password"]', 'Nagah' + Date.now().toString().slice(-6))
  await p.click('button[type="submit"]')
  await p.waitForSelector('text=ابعت الكود ده', { timeout: 40000 })
  const code = (await p.textContent('div[dir="ltr"]')).trim()
  // 📱 المستخدم فتح واتساب: التاب بيبقى مخفي — تاب تاني بياخد التركيز
  const other = await ctx.newPage(); await other.goto('https://example.com'); await other.bringToFront()
  await p.waitForTimeout(1500)
  const hidden = await p.evaluate(() => document.visibilityState)
  const wh = { event: 'message.received', sessionId: '201114621551', data: { from: '2' + PHONE.replace(/^0/, '') + '@c.us', to: '201114621551@c.us', body: code, fromMe: false, id: 'bg-' + Date.now(), timestamp: Math.floor(Date.now() / 1000), type: 'chat' } }
  const r = await fetch('https://www.madmonacairo.com/api/whatsapp/openwa?token=' + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wh) }).then(x => x.json()).catch(e => ({ err: e.message }))
  await p.waitForTimeout(4000)
  // 🔙 رجع للصفحة — المفروض تكمّل لوحدها
  await p.bringToFront()
  await p.waitForURL(/\/admin\/business-finance\/[0-9a-f-]{36}/, { timeout: 60000 }).catch(() => {})
  await p.waitForTimeout(3000)
  const url = p.url()
  const text = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 120)
  console.log(JSON.stringify({ code, hidden, webhook: JSON.stringify(r).slice(0, 80), landed: /business-finance/.test(url), url: url.slice(0, 90), text }))
  await b.close()
})().catch(e => console.log('ERR', e.message))
