const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1200, height: 1000 });
  await page.goto('https://www.madmonacairo.com/real-estate/market', { waitUntil: 'networkidle2', timeout: 50000 });
  await sleep(6000);
  await page.evaluate(() => window.scrollBy(0, 380)); await sleep(2500);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\filters.png' });
  await page.close(); b.disconnect(); console.log('ok');
})().catch(e => console.log('ERR', e.message));
