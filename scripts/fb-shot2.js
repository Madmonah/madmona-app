const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });
  await sleep(5000);
  const t = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('LOGGED IN?', !/Log in|تسجيل الدخول|Create new account/i.test(t) ? 'YES ✅' : 'NO ⛔');
  console.log(t.slice(0, 200));
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\fb-shot2.png' });
  await page.close();
})();
