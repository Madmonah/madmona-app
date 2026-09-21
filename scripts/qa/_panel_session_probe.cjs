// 🔬 (٢١/٩/٢٠٢٦) ليه شاشات اللوحة بتقول «سجّل دخولك الأول» وصاحب البيزنس داخل؟
// بيعمل حساب من /start وبيقيس **جوه المتصفح** على أول شاشة لوحة:
//   • فيه مفاتيح جلسة في localStorage؟
//   • getSession() بترجّع مستخدم ولا null؟ وبتاخد قد إيه؟ (قفل navigator.locks)
//   • madmona_token موجود؟
const { chromium } = require('playwright')
const SITE = 'https://www.madmonacairo.com'
const PHONE = '0199988' + String(Date.now()).slice(-4)
const PW = 'Qa' + String(Date.now()).slice(-6) + 'xZ'

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,0'] })
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG' })).newPage()
  await p.goto(`${SITE}/start?utm_source=qa_probe`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await p.waitForSelector('form', { timeout: 60000 })
  await p.fill('input[placeholder*="عيادة د"]', `QA probe ${new Date().toISOString().slice(0, 10)} (تتمسح)`)
  await p.fill('input[inputmode="tel"]', PHONE)
  await p.fill('input[inputmode="email"]', `qa.probe.${Date.now()}@madmonacairo-test.com`)
  await p.fill('input[type="password"]', PW)
  await p.click('button[type="submit"]')
  await p.waitForURL(/\/account/, { timeout: 120000 }).catch(() => {})
  await p.waitForTimeout(5000)

  const before = await p.evaluate(() => ({
    مفاتيح_الجلسة: Object.keys(localStorage).filter((k) => /sb-.*auth-token/.test(k)),
    توكن_واتساب: !!localStorage.getItem('madmona_token'),
  }))
  console.log('على /account:', JSON.stringify(before))

  const link = await p.$('a[href*="/admin/business-finance/"]')
  const sid = link ? ((await link.getAttribute('href')) || '').match(/business-finance\/([0-9a-f-]{36})/)?.[1] : null
  if (!sid) { console.log('مالقيتش لوحة الشركة'); await b.close(); return }

  await p.goto(`${SITE}/admin/business-finance/${sid}/branches`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(9000)
  const probe = await p.evaluate(async () => {
    const out = {
      مفاتيح_الجلسة: Object.keys(localStorage).filter((k) => /sb-.*auth-token/.test(k)),
      توكن_واتساب: !!localStorage.getItem('madmona_token'),
      نص_الشاشة: document.body.innerText.replace(/\s+/g, ' ').slice(0, 80),
    }
    // نفس نداء AdminGuard بالظبط، بمهلة
    try {
      const mod = await import('/_next/static/chunks/main-app.js').catch(() => null)
      out.ملاحظة = mod ? 'الموديول اتحمّل' : 'مش قادر أستورد الموديول من الصفحة'
    } catch { out.ملاحظة = 'استيراد فشل' }
    return out
  })
  console.log('على شاشة اللوحة:', JSON.stringify(probe, null, 1))
  console.log('\nالرقم:', PHONE, '· الشركة:', sid)
  await b.close()
})().catch((e) => console.log('ERR', e.message.slice(0, 150)))
