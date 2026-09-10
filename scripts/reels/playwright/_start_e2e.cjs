// E2E: /start → فورم → توثيق واتساب (محاكاة الويبهوك) → الشركة تتعمل → setup
const { chromium } = require('playwright'); const fs = require('fs');
const SECRET = (fs.readFileSync('E:/madmona-app/.env.vercel-prod', 'utf8').match(/WA_SERVICE_SECRET="([^"]+)"/) || [])[1];
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 }, locale: 'ar-EG' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120))); p.on('framenavigated', fr => { if (fr === p.mainFrame()) errs.push('NAV ' + fr.url().slice(0, 80)) }); p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push('CON ' + m.text().slice(0, 140)) }); p.on('request', r => { if (/api[/](start|auth)/.test(r.url())) errs.push('REQ ' + r.method() + ' ' + r.url().split('/').slice(-2).join('/').slice(0, 60)) }); p.on('response', async r => { if (/api[/]start|api[/]auth[/]wa/.test(r.url()) ) { try { errs.push(r.url().split('/').slice(-2).join('/') + ' ' + r.status() + ' ' + (await r.text()).slice(0, 160)) } catch {} } });
  await p.goto('https://www.madmonacairo.com/start?utm_source=e2e', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForSelector('form', { timeout: 30000 });
  await p.fill('input[placeholder*="عيادة د"]', 'عيادة اختبار ستارت (تتمسح)');
  await p.fill('input[placeholder="اسمك"]', 'دكتور اختبار');
  await p.fill('input[inputmode="tel"]', '01999888790');
  await p.fill('input[placeholder="مصر الجديدة"]', 'المعادي');
  await p.click('button[type="submit"]');
  await p.waitForSelector('text=ابعت الكود ده', { timeout: 30000 });
  const code = (await p.textContent('div[dir="ltr"]')).trim();
  console.log('code', code);
  const wh = { event: 'message.received', sessionId: '201114621551', data: { from: '201999888790@c.us', to: '201114621551@c.us', body: code, fromMe: false, id: 'e2e-' + Date.now(), timestamp: Math.floor(Date.now() / 1000), type: 'chat' } };
  const r = await fetch('https://www.madmonacairo.com/api/whatsapp/openwa?token=' + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wh) }).then(x => x.json());
  console.log('webhook', JSON.stringify(r).slice(0, 120));
  await p.waitForURL(/\/admin\/business-finance\/[0-9a-f-]{36}\/setup/, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(4000); await p.screenshot({ path: 'output/_start_end.png' });
  const uiErr = await p.$eval('.text-red-600', e => e.textContent).catch(() => null); const url = p.url(); const text = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200);
  console.log(JSON.stringify({ url, uiErr, text: text.slice(0,80), errs }));
  await b.close();
})().catch(e => console.log('ERR', e.message));
