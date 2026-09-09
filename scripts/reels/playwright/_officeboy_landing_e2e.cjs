// إثبات (٩/٩ بليل): أوفيس بوي → بعد الدخول «شغلي» مش /me · /me بتحوّله · تاب «شغلي» في الهوم
// حتى لو الجهاز ماسك توكن بس · كارت عهدتي ظاهر ومكالماتي مخفي
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = b.contexts()[0]; const p = await ctx.newPage(); await p.setViewportSize({ width: 412, height: 900 });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 100)));
  const W = 'https://www.madmonacairo.com';
  await p.goto(W + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.evaluate(() => { try { localStorage.clear() } catch { } });
  await p.goto(W + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForSelector('input[autocomplete="username"]', { timeout: 20000 });
  await p.fill('input[autocomplete="username"]', '01999888779'); await p.fill('input[autocomplete="current-password"]', 'Madmona!2026');
  await p.click('button:has-text("دخول")'); await p.waitForTimeout(9000);
  const out = { landedOn: p.url() };
  await p.goto(W + '/me', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(8000);
  const tMe = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  out.me = { url: p.url(), commissionShown: /عمولة الشهر/.test(tMe) };
  await p.goto(W + '/account/work', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(9000);
  const tW = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  out.work = { custody: /عهدتي/.test(tW), attendance: /الحضور والانصراف/.test(tW), calls: /مكالماتي/.test(tW), requests: /الطلبات/.test(tW) };
  // جهاز ماسك توكن بس (زي تليفون محمد قبل الإصلاح): امسح جلسة Supabase وسيب التوكن
  await p.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); });
  await p.goto(W + '/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(12000);
  out.homeTokenOnly = await p.evaluate(() => ({
    tab5: [...document.querySelectorAll('nav a')].map(a => (a.innerText || '').trim().replace(/\n/g, ' ') + '→' + a.getAttribute('href')).slice(-1)[0],
    sbRestored: Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')),
  }));
  out.errors = errs.slice(0, 3);
  await p.evaluate(() => { try { localStorage.clear() } catch { } });
  console.log(JSON.stringify(out, null, 1));
  await p.close(); await b.close();
})().catch(e => console.log('ERR', e.message));
