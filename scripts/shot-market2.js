const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1300, height: 1600 });
  await page.goto('https://www.madmonacairo.com/real-estate/market', { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(5000);
  // ندوّر على مشروع اسمه Marassi أو ZED
  const found = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(x => /Marassi|مراسي|ZED|زيد إيست/.test(x.textContent||'') && x.children.length < 3);
    if (el) el.scrollIntoView({block:'center'});
    return !!el;
  });
  await sleep(3500);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\market2.png' });
  await page.close(); b.disconnect(); console.log('found ZED/Marassi:', found);
})().catch(e => console.log('ERR', e.message));
