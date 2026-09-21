// إعادة فحص عيّنة شاشات مع تتبّع حالة الجلسة قبل كل شاشة (٢١/٩/٢٠٢٦)
const { chromium } = require('playwright')
const SITE = 'https://www.madmonacairo.com'
const SID = process.argv[2]
const SCREENS = ['branches','team','expenses','products','identity','settings','crm','custody','reports','dashboard']
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG', storageState: 'E:/madmona-app/scripts/qa/_probe_state.json' })
  const p = await ctx.newPage()
  for (const s of SCREENS) {
    await p.goto(`${SITE}/admin/business-finance/${SID}/${s}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{})
    let txt = '', sess = null
    for (let i = 0; i < 8; i++) {
      await p.waitForTimeout(2000)
      txt = await p.evaluate(() => document.body.innerText).catch(() => '')
      if (txt.length > 260) break
    }
    sess = await p.evaluate(() => !!Object.keys(localStorage).find(k => /sb-.*auth-token/.test(k))).catch(()=>null)
    const ok = txt.length > 260 && !/سجّل دخولك/.test(txt)
    console.log(ok ? '✅' : '❌', s, '· جلسة:', sess, '·', txt.replace(/\s+/g,' ').slice(0,55))
  }
  await b.close()
})().catch(e => console.log('ERR', e.message.slice(0,120)))
