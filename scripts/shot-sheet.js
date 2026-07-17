const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1400, height: 2200 });
  await page.goto('file:///E:/madmona-app/scripts/sheet.html', { waitUntil: 'domcontentloaded' });
  await sleep(9000);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\sheet1.png' });
  await page.evaluate(() => window.scrollBy(0, 2200)); await sleep(4000);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\sheet2.png' });
  await page.close();
  b.disconnect();
  console.log('shots ready');
})().catch(e => console.log('ERR', e.message));
