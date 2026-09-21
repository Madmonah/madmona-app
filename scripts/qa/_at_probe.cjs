const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-EG', isMobile: true })).newPage()
  for (const u of ['/at/SA3-HQ', '/book/SA3-HQ']) {
    const r = await p.goto('https://www.madmonacairo.com' + u, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>null)
    for (let i=0;i<12;i++){ await p.waitForTimeout(2500); const t=await p.title(); const l=await p.evaluate(()=>document.body.innerText.length).catch(()=>0); if(!/Checkpoint/i.test(t)&&l>200) break }
    const txt = await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,110)).catch(()=>'')
    console.log(u, '→ HTTP', r?.status(), '·', txt)
  }
  await b.close()
})().catch(e=>console.log('ERR',e.message.slice(0,120)))
