// إثبات «تسجيل خروج يقفل كل الأبواب»: دخول بباسورد → البابين مفتوحين → خروج من حسابي → الاتنين مقفولين
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = b.contexts()[0]; const p = await ctx.newPage(); await p.setViewportSize({ width: 412, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 100)));
  p.on('dialog', d => d.accept());
  const state = async () => p.evaluate(() => ({
    token: !!localStorage.getItem('madmona_token'),
    sb: Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')),
  }));
  await p.goto('https://www.madmonacairo.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.evaluate(() => { try { localStorage.clear() } catch { } });
  await p.goto('https://www.madmonacairo.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForSelector('input[autocomplete="username"]', { timeout: 20000 });
  await p.fill('input[autocomplete="username"]', '01999888779'); await p.fill('input[autocomplete="current-password"]', 'Madmona!2026');
  await p.click('button:has-text("دخول")'); await p.waitForTimeout(9000);
  const out = { landedOn: p.url(), afterLogin: await state() };
  await p.goto('https://www.madmonacairo.com/account/work', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(9000);
  const t1 = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  out.workBefore = { attendance: /الحضور والانصراف/.test(t1), askLogin: /سجّل دخولك/.test(t1) };
  await p.goto('https://www.madmonacairo.com/account', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(8000);
  const btn = await p.$('button:has-text("تسجيل الخروج"), button:has-text("تسجيل خروج"), button:has-text("خروج")');
  out.logoutButtonFound = !!btn;
  if (btn) { await btn.click(); await p.waitForTimeout(7000); }
  out.afterLogoutUrl = p.url();
  out.afterLogout = await state();
  await p.goto('https://www.madmonacairo.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(7000);
  out.loginAfter = { url: p.url(), formVisible: !!(await p.$('input[autocomplete="username"]')) };
  await p.goto('https://www.madmonacairo.com/account/work', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(8000);
  const t2 = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  out.workAfter = { attendance: /الحضور والانصراف/.test(t2), askLogin: /سجّل دخولك|سجّل الدخول|تسجيل الدخول/.test(t2), url: p.url() };
  out.errors = errs.slice(0, 3);
  await p.evaluate(() => { try { localStorage.clear() } catch { } });
  console.log(JSON.stringify(out, null, 1));
  await p.close(); await b.close();
})().catch(e => console.log('ERR', e.message));
