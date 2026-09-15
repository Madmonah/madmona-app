// حسابات جوجل المتاحة في شاشة اختيار الحساب لزرار لهجتي (قراءة بس — مابيضغطش أي حساب)
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 })
  const ctx = b.contexts()[0]
  const p = await ctx.newPage()
  await p.goto('https://lahajati.ai/auth/google', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(8000)
  const ids = await p.evaluate(() => [...document.querySelectorAll('[data-identifier], [data-email]')].map(e => (e.getAttribute('data-identifier') || e.getAttribute('data-email'))))
  const text = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 260)
  console.log(JSON.stringify({ url: p.url().slice(0, 90), ids, text }))
  await p.close(); await b.close().catch(() => {})
})().catch(e => { console.log('ERR', e.message); process.exit(1) })
