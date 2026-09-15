// E2E (١٥/٩/٢٠٢٦) محمد: «تاب ستارت وتاب برو لسه فيهم مشكلة في تسجيل الدخول — عايز حل جذري ومجرّب: سجّل خروج بعد الدخول وارجع سجّل دخول تاني».
// اللوب كامل على الإنتاج بمتصفح حقيقي: /start → إنشاء (محاكاة واتساب) → اللوحة → خروج من /account → /start (فورم؟) → /login بالرقم+الباسورد → اللوحة
// → خروج → /pro → «ابدأ» → /start بنفس الرقم (existing) → اللوحة → خروج → /login بصيغة +20 → اللوحة.
const { chromium } = require('playwright'); const fs = require('fs');
const SECRET = (fs.readFileSync('E:/madmona-app/.env.vercel-prod', 'utf8').match(/WA_SERVICE_SECRET="([^"]+)"/) || [])[1];
const PHONE = process.argv[2] || '01999888793'; const WEAK = 'Test1234!'; const PASS = 'Madmona!Loop2026x'; const NAME = 'مطعم اختبار اللوب (يتمسح)';
const BASE = 'https://www.madmonacairo.com';
const out = { steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log('▶', name, JSON.stringify(data).slice(0, 300)); };

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, locale: 'ar-EG' });
  const p = await ctx.newPage();
  const api = []; p.on('response', async r => { if (/api[/](start|auth[/]wa|login|auth[/]upgrade)/.test(r.url())) { try { api.push(r.url().split('/').slice(-2).join('/').slice(0, 40) + ' ' + r.status() + ' ' + (await r.text()).slice(0, 140)) } catch {} } });
  p.on('dialog', d => d.accept());
  const body = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300);
  const auth = async () => p.evaluate(() => ({ token: !!localStorage.getItem('madmona_token'), sb: Object.keys(localStorage).filter(k => k.startsWith('sb-')).length, ownerTok: !!localStorage.getItem('madmona_owner_token') }));
  const waitPanel = async () => { await p.waitForURL(/\/admin\/business-finance\/[0-9a-f-]{36}/, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(7000); return { url: p.url().replace(BASE, ''), text: await body(), auth: await auth() }; };

  // ١) /start → إنشاء
  await p.goto(`${BASE}/start?utm_source=e2e&utm_medium=loop`, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForSelector('form', { timeout: 30000 });
  await p.fill('input[placeholder*="عيادة د"]', NAME);
  await p.selectOption('select', 'restaurant');
  await p.fill('input[inputmode="tel"]', PHONE);
  await p.fill('input[type="password"]', WEAK);
  await p.click('button[type="submit"]');
  await p.waitForSelector('text=ابعت الكود ده', { timeout: 30000 });
  const code = (await p.textContent('div[dir="ltr"]')).trim();
  const digits = '2' + PHONE.replace(/\D/g, '').replace(/^0/, '0'); // 01xxxxxxxxx → 201xxxxxxxxx
  const wh = { event: 'message.received', sessionId: '201114621551', data: { from: `20${PHONE.replace(/^0/, '')}@c.us`, to: '201114621551@c.us', body: code, fromMe: false, id: 'e2e-' + Date.now(), timestamp: Math.floor(Date.now() / 1000), type: 'chat' } };
  const r = await fetch(`${BASE}/api/whatsapp/openwa?token=` + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wh) }).then(x => x.json());
  await Promise.race([p.waitForSelector('.text-red-600', { timeout: 60000 }), p.waitForURL(/business-finance/, { timeout: 60000 })]).catch(() => {});
  await p.waitForTimeout(2000);
  const weakErr = await p.$eval('.text-red-600', e => e.textContent).catch(() => null);
  const btnTxt = await p.$eval('button[type="submit"]', e => e.textContent).catch(() => null);
  step('1a.weak_password_rejected', { code, webhook: JSON.stringify(r).slice(0, 80), url: p.url().replace(BASE, ''), weakErr, btnTxt });
  await p.fill('input[type="password"]', PASS); await p.click('button[type="submit"]');
  step('1b.strong_retry_no_reverify', { panel: await waitPanel() });
  const sid = (p.url().match(/business-finance\/([0-9a-f-]{36})/) || [])[1];

  // ٢) اللوحة الرئيسية بجلستنا
  await p.goto(`${BASE}/admin/business-finance/${sid}`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(6000);
  step('2.panel_home', { url: p.url().replace(BASE, ''), text: await body() });

  // ٣) خروج من /account
  await p.goto(`${BASE}/account`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(4000);
  const before = await body();
  const btn = await p.$('button:has-text("خروج"), a:has-text("خروج")');
  if (btn) { await btn.click(); await p.waitForTimeout(6000); }
  step('3.logout', { hadButton: !!btn, before: before.slice(0, 120), url: p.url().replace(BASE, ''), auth: await auth() });

  // ٤) /start وأنا خارج → لازم الفورم
  await p.goto(`${BASE}/start`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(5000);
  step('4.start_logged_out', { url: p.url().replace(BASE, ''), form: !!(await p.$('form')), text: (await body()).slice(0, 160) });

  // ٥) /login بالرقم + الباسورد
  await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(4000);
  step('5a.login_page', { url: p.url().replace(BASE, ''), hasForm: !!(await p.$('input[type="password"]')) });
  await p.fill('input[autocomplete="username"]', PHONE); await p.fill('input[type="password"]', PASS); await p.press('input[type="password"]', 'Enter');
  step('5b.login_phone', { panel: await waitPanel() });

  // ٦) خروج تاني
  await p.goto(`${BASE}/account`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(4000);
  const btn2 = await p.$('button:has-text("خروج"), a:has-text("خروج")'); if (btn2) { await btn2.click(); await p.waitForTimeout(6000); }
  step('6.logout2', { hadButton: !!btn2, auth: await auth() });

  // ٧) /pro → ابدأ → /start → نفس الرقم (existing) → اللوحة
  await p.goto(`${BASE}/pro`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(3000);
  const startLink = await p.$('a[href^="/start"]'); const startHref = startLink ? await startLink.getAttribute('href') : null;
  await p.goto(`${BASE}${startHref || '/start'}`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForSelector('form', { timeout: 30000 });
  await p.fill('input[placeholder*="عيادة د"]', NAME); await p.fill('input[inputmode="tel"]', PHONE); await p.fill('input[type="password"]', PASS); await p.click('button[type="submit"]');
  await p.waitForSelector('text=ابعت الكود ده', { timeout: 30000 });
  const code2 = (await p.textContent('div[dir="ltr"]')).trim();
  const wh2 = { ...wh, data: { ...wh.data, body: code2, id: 'e2e-' + Date.now() } };
  const r2 = await fetch(`${BASE}/api/whatsapp/openwa?token=` + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wh2) }).then(x => x.json());
  step('7.pro_start_existing', { startHref, webhook: JSON.stringify(r2).slice(0, 80), panel: await waitPanel() });

  // ٨) خروج → /login بصيغة +20
  await p.goto(`${BASE}/account`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(4000);
  const btn3 = await p.$('button:has-text("خروج"), a:has-text("خروج")'); if (btn3) { await btn3.click(); await p.waitForTimeout(6000); }
  await p.goto(`${BASE}/login?next=%2Fadmin%2Fbusiness-partners`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(4000);
  await p.fill('input[autocomplete="username"]', '+20' + PHONE.replace(/^0/, '')); await p.fill('input[type="password"]', PASS); await p.press('input[type="password"]', 'Enter');
  step('8.login_plus20_with_admin_next', { panel: await waitPanel() });

  // ٩) باسورد غلط
  await p.goto(`${BASE}/account`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(3000);
  const btn4 = await p.$('button:has-text("خروج"), a:has-text("خروج")'); if (btn4) { await btn4.click(); await p.waitForTimeout(5000); }
  await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(3000);
  await p.fill('input[autocomplete="username"]', PHONE); await p.fill('input[type="password"]', 'wrongpass1'); await p.press('input[type="password"]', 'Enter'); await p.waitForTimeout(5000);
  step('9.wrong_password', { url: p.url().replace(BASE, ''), text: (await body()).slice(0, 160) });

  out.api = api; out.sid = sid;
  fs.writeFileSync('output/_login_loop2.json', JSON.stringify(out, null, 1));
  console.log('SID', sid); console.log('API', JSON.stringify(api, null, 0).slice(0, 2500));
  await b.close();
})().catch(e => { console.log('ERR', e.message); fs.writeFileSync('output/_login_loop2.json', JSON.stringify(out, null, 1)); process.exit(1); });
