// يفتح التطبيق بجلسة موظف حقيقية (madmona_token من ملف) ويمسح الشاشات: أرقام تليفون غريبة؟ زرار 📷؟ عهدتي؟
// node _as_employee_scan.cjs <tokenfile> <ownPhoneCore>
const { chromium } = require('playwright'); const fs = require('fs');
const TOKEN = fs.readFileSync(process.argv[2], 'utf8').trim(); const OWN = process.argv[3] || '';
const SAFE = ['1002229982', '1026222337', '1114621551', OWN.slice(-10)];
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = b.contexts()[0]; const p = await ctx.newPage(); await p.setViewportSize({ width: 412, height: 900 });
  const W = 'https://www.madmonacairo.com';
  await p.goto(W + '/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('madmona_token', t) } catch { } }, TOKEN);
  const out = {};
  for (const path of ['/account/work', '/', '/home', '/account', '/chat', '/crm', '/me', '/admin/listings']) {
    await p.goto(W + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(path === '/account/work' ? 12000 : 8000);
    const txt = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
    const nums = [...new Set((txt.match(/(?:\+?20|0)?1[0125][0-9]{8}/g) || []).map(n => n.replace(/\D/g, '').slice(-10)))].filter(n => !SAFE.includes(n));
    out[path] = { url: p.url(), foreignPhones: nums, camera: await p.evaluate(() => !!document.querySelector('button[aria-label="صوّر إثبات"]')),
      custody: /عهدتي/.test(txt), calls: /مكالماتي/.test(txt), tab5: await p.evaluate(() => [...document.querySelectorAll('nav a')].map(a => (a.innerText || '').trim().replace(/\n/g, ' ')).slice(-1)[0]) };
    await p.screenshot({ path: `output/_emp_scan_${path.replace(/\W+/g, '_') || 'root'}.png`, fullPage: true }).catch(() => { });
  }
  out.session = await p.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')));
  await p.evaluate(() => { try { localStorage.clear() } catch { } });
  console.log(JSON.stringify(out, null, 1));
  await p.close(); await b.close();
})().catch(e => console.log('ERR', e.message));
