// 🔬 (٢١/٩/٢٠٢٦) إعادة فحص: حساب واحد → ١٢ شاشة بالتتابع مع تتبّع الجلسة قبل كل واحدة.
// الهدف: نعرف هل العطل ثابت ولا بيبدأ بعد عدد معيّن من التنقلات (تزاحم/قفل).
const { chromium } = require('playwright')
const SITE = 'https://www.madmonacairo.com'
const PHONE = '0199988' + String(Date.now()).slice(-4)
const PW = 'Qa' + String(Date.now()).slice(-6) + 'xZ'
const SCREENS = ['branches','team','expenses','products','identity','settings','crm','custody','reports','dashboard','schedule','requests']
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG' })).newPage()
  await p.goto(`${SITE}/start?utm_source=qa_retest`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await p.waitForSelector('form', { timeout: 60000 })
  await p.fill('input[placeholder*="عيادة د"]', `QA retest ${new Date().toISOString().slice(0,10)} (تتمسح)`)
  await p.fill('input[inputmode="tel"]', PHONE)
  await p.fill('input[inputmode="email"]', `qa.retest.${Date.now()}@madmonacairo-test.com`)
  await p.fill('input[type="password"]', PW)
  await p.click('button[type="submit"]')
  await p.waitForURL(/\/account/, { timeout: 120000 }).catch(()=>{})
  await p.waitForTimeout(5000)
  const link = await p.$('a[href*="/admin/business-finance/"]')
  const SID = link ? ((await link.getAttribute('href'))||'').match(/business-finance\/([0-9a-f-]{36})/)?.[1] : null
  if (!SID) { console.log('مالقيتش اللوحة'); await b.close(); return }
  console.log('الشركة:', SID, '\n')
  let i = 0
  for (const s of SCREENS) {
    i++
    await p.goto(`${SITE}/admin/business-finance/${SID}/${s}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(()=>{})
    let txt = ''
    for (let k = 0; k < 8; k++) { await p.waitForTimeout(2000); txt = await p.evaluate(()=>document.body.innerText).catch(()=>''); if (txt.length > 260) break }
    const sess = await p.evaluate(()=>!!Object.keys(localStorage).find(k=>/sb-.*auth-token/.test(k))).catch(()=>null)
    const ok = txt.length > 260 && !/سجّل دخولك/.test(txt)
    console.log(`${ok?'✅':'❌'} ${String(i).padStart(2)} ${s.padEnd(20)} جلسة:${sess}  ${txt.replace(/\s+/g,' ').slice(0,50)}`)
  }
  console.log('\nالرقم:', PHONE)
  await b.close()
})().catch(e => console.log('ERR', e.message.slice(0,140)))
