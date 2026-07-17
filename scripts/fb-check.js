// بيستخدم التاب المفتوح — مش بيفتح جديد
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  console.log('TABS:', pages.length);
  for (const p of pages) console.log(' ·', await p.url());

  const page = pages.find(p => /facebook\.com/.test(p.url())) || pages[pages.length - 1];
  await page.bringToFront().catch(() => {});
  await sleep(1500);
  const t = await page.evaluate(() => document.body.innerText.slice(0, 250));
  const loggedIn = !/Log in to Facebook|تسجيل الدخول إلى فيسبوك|Create new account/i.test(t);
  console.log('\nLOGGED IN?', loggedIn ? 'YES ✅' : 'NO ⛔');
  console.log(t.slice(0, 150).replace(/\n/g, ' | '));
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
