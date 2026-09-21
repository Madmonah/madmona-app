const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-EG', isMobile: true })).newPage()
  const bad = []
  p.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(0, 110)) })
  await p.goto('https://www.madmonacairo.com/s/sa3dawy', { waitUntil: 'domcontentloaded', timeout: 90000 })
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(3000); const t = await p.title(); const l = await p.evaluate(()=>document.body.innerText.length).catch(()=>0); if (!/Checkpoint/i.test(t) && l > 300) break }
  await p.waitForTimeout(4000)
  const info = await p.evaluate(() => ({
    قسم_book_موجود: !!document.getElementById('book'),
    كل_الأقسام: [...document.querySelectorAll('[id]')].map(e=>e.id).filter(Boolean).slice(0,25),
    أزرار_الحجز: [...document.querySelectorAll('a,button')].filter(e=>/احجز|حجز/.test(e.innerText||'')).map(e=>({نص:(e.innerText||'').trim().slice(0,28),href:e.getAttribute('href')||'—'})).slice(0,8),
    عدد_الخدمات_المعروضة: document.querySelectorAll('[data-service],[data-service-id]').length,
    نص_كامل: document.body.innerText.replace(/\s+/g,' ').slice(0,700),
  }))
  console.log(JSON.stringify(info, null, 1))
  console.log('\nطلبات فاشلة:'); bad.slice(0,6).forEach(x=>console.log('  ', x))
  await b.close()
})().catch(e => console.log('ERR', e.message.slice(0,140)))
