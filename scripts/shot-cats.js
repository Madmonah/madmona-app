const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  // deviceScaleFactor:1 عشان زووم الويندوز ميأثرش على اللقطة
  await page.setViewport({ width: 1280, height: 1100, deviceScaleFactor: 1 });
  await page.goto('https://www.madmonacairo.com/marketplace', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(7000);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\cats.png' });
  await page.close(); b.disconnect(); console.log('ok');
})().catch(e => console.log('ERR', e.message));
