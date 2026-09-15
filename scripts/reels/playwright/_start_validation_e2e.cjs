// زرار /start بيشتغل دايمًا وبيقول الناقص (١٥/٩/٢٠٢٦)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  await p.goto('https://www.madmonacairo.com/start', { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForSelector('form', { timeout: 30000 });
  await p.fill('input[placeholder*="عيادة د"]', 'محل اختبار'); await p.fill('input[inputmode="tel"]', '01099999999'); await p.fill('input[type="password"]', '123456');
  const disabled = await p.$eval('button[type="submit"]', e => e.disabled); const hint = await p.$eval('input[type="password"] + span', e => e.textContent);
  await p.click('button[type="submit"]'); await p.waitForTimeout(1500);
  const err = await p.$eval('.text-red-600', e => e.textContent).catch(() => null);
  console.log(JSON.stringify({ disabled, hint: hint.slice(0, 60), err }));
  await b.close();
})().catch(e => console.log('ERR', e.message));
