// E2E (١٥/٩/٢٠٢٦) محمد: «عايز تاب لتسجيل الدخول في شاشة /start».
// اللوب على الإنتاج: /start (حساب جديد) → اللوحة → خروج → /start → اضغط تاب «عندي حساب» → رقم+باسورد → اللوحة
// → خروج → /start?tab=login بإيميل الحساب الداخلي → اللوحة → خروج → باسورد غلط → رسالة.
const { chromium } = require('playwright'); const fs = require('fs');
const SECRET = (fs.readFileSync('E:/madmona-app/.env.vercel-prod', 'utf8').match(/WA_SERVICE_SECRET="([^"]+)"/) || [])[1];
const PHONE = process.argv[2] || '01999888795'; const PASS = 'Madmona!Tab2026q'; const NAME = 'محل اختبار تاب الدخول (يتمسح)';
const BASE = 'https://www.madmonacairo.com';
const log = (n, d) => console.log('▶', n, JSON.stringify(d).slice(0, 260));
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 }, locale: 'ar-EG' })).newPage();
  p.on('dialog', d => d.accept());
  const auth = () => p.evaluate(() => ({ token: !!localStorage.getItem('madmona_token'), sb: Object.keys(localStorage).filter(k => k.startsWith('sb-')).length }));
  const panel = async () => { await p.waitForURL(/\/admin\/business-finance\/[0-9a-f-]{36}/, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(5000); return { url: p.url().replace(BASE, ''), auth: await auth() }; };
  const logout = async () => { await p.goto(`${BASE}/account`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(4000); const x = await p.$('button:has-text("خروج"), a:has-text("خروج")'); if (x) { await x.click(); await p.waitForTimeout(6000); } return { had: !!x, auth: await auth() }; };

  // ١) إنشاء
  await p.goto(`${BASE}/start?utm_source=e2e&utm_medium=logintab`, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForSelector('form', { timeout: 30000 });
  const tabs = await p.$$eval('[role=tab]', els => els.map(e => e.textContent.trim()));
  await p.fill('input[placeholder*="عيادة د"]', NAME); await p.fill('input[inputmode="tel"]', PHONE); await p.fill('input[type="password"]', PASS);
  await p.click('button[type="submit"]');
  await p.waitForSelector('text=ابعت الكود ده', { timeout: 30000 });
  const code = (await p.textContent('div[dir="ltr"]')).trim();
  const wh = { event: 'message.received', sessionId: '201114621551', data: { from: `20${PHONE.replace(/^0/, '')}@c.us`, to: '201114621551@c.us', body: code, fromMe: false, id: 'e2e-' + Date.now(), timestamp: Math.floor(Date.now() / 1000), type: 'chat' } };
  await fetch(`${BASE}/api/whatsapp/openwa?token=` + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wh) });
  log('1.create', { tabs, panel: await panel() });
  const sid = (p.url().match(/business-finance\/([0-9a-f-]{36})/) || [])[1];

  // ٢) خروج → /start → اضغط تاب الدخول → رقم + باسورد
  log('2a.logout', await logout());
  await p.goto(`${BASE}/start`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForSelector('[role=tab]', { timeout: 30000 });
  await p.click('[role=tab]:has-text("عندي حساب")'); await p.waitForTimeout(800);
  const h1 = await p.textContent('h1');
  await p.fill('input[autocomplete="username"]', PHONE); await p.fill('input[autocomplete="current-password"]', PASS);
  await p.click('button[type="submit"]:has-text("ادخل على لوحتي")');
  log('2b.login_tab_phone', { h1, panel: await panel() });

  // ٣) خروج → /start?tab=login بالإيميل الداخلي
  log('3a.logout', await logout());
  await p.goto(`${BASE}/start?tab=login`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForSelector('input[autocomplete="username"]', { timeout: 30000 });
  await p.fill('input[autocomplete="username"]', `20${PHONE.replace(/^0/, '')}@madmonacairo.com`); await p.fill('input[autocomplete="current-password"]', PASS);
  await p.click('button[type="submit"]:has-text("ادخل على لوحتي")');
  log('3b.login_tab_email_param', { panel: await panel() });

  // ٤) خروج → باسورد غلط
  log('4a.logout', await logout());
  await p.goto(`${BASE}/start?tab=login`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForSelector('input[autocomplete="username"]', { timeout: 30000 });
  await p.fill('input[autocomplete="username"]', PHONE); await p.fill('input[autocomplete="current-password"]', 'wrongpass9');
  await p.click('button[type="submit"]:has-text("ادخل على لوحتي")'); await p.waitForTimeout(5000);
  const err = await p.$eval('.text-red-600', e => e.textContent).catch(() => null);
  log('4b.wrong_password', { url: p.url().replace(BASE, ''), err });

  console.log('SID', sid);
  await b.close();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
