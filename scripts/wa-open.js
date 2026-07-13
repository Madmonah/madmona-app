const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await new Promise(r => setTimeout(r, 12000));
  const t = await page.evaluate(() => document.body.innerText.slice(0, 600));
  console.log(t);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\wa-shot.png' });
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
