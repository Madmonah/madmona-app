const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  await page.goto('https://www.madmonacairo.com/home', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(7000);
  const found = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(x =>
      /أخبار مضمونة/.test(x.textContent || '') && x.children.length === 0);
    if (el) el.scrollIntoView({ block: 'center' });
    return !!el;
  });
  await sleep(4000);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\news.png' });
  await page.close(); b.disconnect();
  console.log('found tab:', found);
})().catch(e => console.log('ERR', e.message));
