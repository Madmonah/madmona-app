// 🔑 E2E (١٤/٩): /start بباسورد → توثيق واتساب (محاكاة الويبهوك) → الشركة → /api/login بالرقم+باسورد وبالإيميل+باسورد. حساب اختبار بيتمسح بعدها.
const { chromium } = require('playwright'); const fs = require('fs'); const crypto = require('crypto');
const SECRET = (fs.readFileSync('E:/madmona-app/.env.vercel-prod', 'utf8').match(/WA_SERVICE_SECRET="([^"]+)"/) || [])[1];
const PHONE = '01999888791', EMAIL = 'e2e.start.pw@example.com', PW = 'T' + crypto.randomBytes(6).toString('hex');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 }, locale: 'ar-EG' })).newPage();
  await p.goto('https://www.madmonacairo.com/start?utm_source=e2e', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForSelector('form', { timeout: 30000 });
  await p.fill('input[placeholder*="عيادة د"]', 'عيادة اختبار باسورد (تتمسح)');
  await p.fill('input[placeholder="اسمك"]', 'اختبار باسورد');
  await p.fill('input[inputmode="tel"]', PHONE);
  await p.fill('input[type="password"]', PW);
  await p.fill('input[inputmode="email"]', EMAIL);
  await p.fill('input[placeholder="مصر الجديدة"]', 'المعادي');
  const disabled = await p.$eval('button[type="submit"]', b => b.disabled);
  await p.click('button[type="submit"]');
  await p.waitForSelector('text=ابعت الكود ده', { timeout: 30000 });
  const code = (await p.textContent('div[dir="ltr"]')).trim();
  const wh = { event: 'message.received', sessionId: '201114621551', data: { from: '20' + PHONE.slice(1) + '@c.us', to: '201114621551@c.us', body: code, fromMe: false, id: 'e2e-' + Date.now(), timestamp: Math.floor(Date.now() / 1000), type: 'chat' } };
  const r = await fetch('https://www.madmonacairo.com/api/whatsapp/openwa?token=' + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wh) }).then(x => x.json()).catch(e => ({ err: e.message }));
  await p.waitForURL(/\/admin\/business-finance\/[0-9a-f-]{36}\/setup/, { timeout: 90000 }).catch(() => {});
  const url = p.url();
  await b.close();
  const login = async (identifier) => fetch('https://www.madmonacairo.com/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier, password: PW }) }).then(x => x.json()).then(j => ({ ok: j.ok, source: j.source, hasAT: !!j.access_token })).catch(e => ({ err: e.message }));
  const wrong = await fetch('https://www.madmonacairo.com/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: PHONE, password: PW + 'x' }) }).then(x => x.json()).then(j => j.ok).catch(() => null);
  console.log(JSON.stringify({ submitDisabled: disabled, code, webhook: r && (r.brain ? r.brain.login : r.ok), setup: /setup/.test(url), byPhone: await login(PHONE), byEmail: await login(EMAIL), wrongPw: wrong }));
})().catch(e => console.log('ERR', e.message));
