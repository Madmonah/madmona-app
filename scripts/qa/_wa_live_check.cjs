// 🔌 فحص: هل السيرفر اللايف بيوصل لـOpenWA؟ (لازم متصفح حقيقي — نقطة تفتيش فيرسل بترفض curl)
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-EG' })).newPage()
  await p.goto('https://www.madmonacairo.com/start', { waitUntil: 'domcontentloaded', timeout: 60000 })
  // لازم الصفحة تعدّي نقطة تفتيش فيرسل الأول (بتحط كوكي) وإلا الـAPI بيرجّع HTML
  await p.waitForSelector('form', { timeout: 90000 })
  await p.waitForTimeout(3000)
  const r = await p.evaluate(async () => {
    const res = await fetch('/api/auth/wa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start' }) })
    return res.json()
  })
  console.log(JSON.stringify({ wa_live: r.wa_live, wa_number: r.wa_number, alternatives: (r.alternatives || []).map(a => a.number), code: r.code }))
  await b.close()
})().catch(e => console.log('ERR', e.message.slice(0, 150)))
