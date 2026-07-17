const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1280, height: 1100, deviceScaleFactor: 1 });
  await page.goto('https://www.madmonacairo.com/marketplace', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(7000);
  // نجيب كل كروت الإعلانات: العنوان + الصورة + اللينك
  const cards = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a[href*="/marketplace/"]').forEach(a => {
      const img = a.querySelector('img');
      const t = (a.innerText || '').split('\n').filter(Boolean)[0] || '';
      if (img && img.src) out.push({ href: a.href, img: img.src, title: t.slice(0, 60) });
    });
    return out;
  });
  console.log(JSON.stringify(cards.slice(0, 12), null, 1));
  await page.close(); b.disconnect();
})().catch(e => console.log('ERR', e.message));
