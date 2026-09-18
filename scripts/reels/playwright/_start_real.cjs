// فحص /start من كروم حقيقي (CDP 9223) — مش headless — عشان نعرف هل نقطة تفتيش فيرسل بتظهر للمستخدم الحقيقي
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const p = await b.contexts()[0].newPage()
  const r = await p.goto('https://www.madmonacairo.com/start', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(6000)
  const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 160))
  console.log(JSON.stringify({ status: r.status(), hasForm: !!(await p.$('form')), newBtn: /بعتّ الكود/.test(await p.content()), t }))
  await p.close()
})().catch(e => console.log('ERR', e.message.slice(0, 150)))
