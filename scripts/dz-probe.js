const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.goto('https://www.dubizzle.com.eg/en/properties/villas-for-sale/north-coast/', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(5000);

  // اجمع كروت الإعلانات
  const cards = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a[href*="/ad/"]').forEach(a => {
      const box = a.closest('li') || a.parentElement;
      const t = (box?.innerText || '').replace(/\n/g, ' | ');
      out.push({ href: a.href, txt: t.slice(0, 200) });
    });
    return out.slice(0, 6);
  });
  console.log(JSON.stringify(cards, null, 1));
  console.log('TOTAL_LINKS=', (await page.$$('a[href*="/ad/"]')).length);
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
