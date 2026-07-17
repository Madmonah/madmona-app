// 🏡 فيلات الإيجار اليومي — القاهرة (20 إعلان بس في السوق كله)
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\villa-daily.json';

const LISTS = [
  'https://www.dubizzle.com.eg/en/properties/villas-for-rent/cairo/q-villas-for-daily-rent/',
  'https://www.dubizzle.com.eg/en/properties/villas-for-rent/new-cairo/q-villas-for-daily-rent/',
];

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  // 1) اجمع لينكات الإعلانات
  const urls = new Set();
  for (const L of LISTS) {
    const p = await b.newPage();
    p.setDefaultNavigationTimeout(35000);
    try {
      await p.goto(L, { waitUntil: 'domcontentloaded' });
      await sleep(4500);
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2500);
      const hrefs = await p.evaluate(() =>
        [...document.querySelectorAll('a')].map(a => a.getAttribute('href') || '')
          .filter(h => /\/ad\/.*\.html/.test(h)));
      hrefs.forEach(h => urls.add('https://www.dubizzle.com.eg' + h.split('?')[0]));
      console.log(L.slice(45) + ' -> ' + hrefs.length);
    } catch (e) { console.log('ERR list', e.message); }
    await p.close().catch(() => {});
  }
  const list = [...urls];
  console.log('\nUNIQUE ADS:', list.length);

  // 2) افتح كل إعلان وخد التفاصيل
  const out = [];
  let page = null;
  for (let i = 0; i < list.length; i++) {
    if (!page || i % 8 === 0) {
      if (page) await page.close().catch(() => {});
      page = await b.newPage();
      page.setDefaultNavigationTimeout(30000);
    }
    try {
      await page.goto(list[i], { waitUntil: 'domcontentloaded' });
      await sleep(2200);
      const d = await page.evaluate(() => {
        const t = document.body.innerText;
        const g = (re) => { const m = t.match(re); return m ? m[1].trim() : null; };
        return {
          title: document.title.replace(/\s*\|\s*dubizzle.*/i, '').trim(),
          price: g(/EGP\s*([\d,]+)/),
          freq: g(/Rental Frequency\s*\n\s*([^\n]+)/i),
          type: g(/Type\s*\n\s*([^\n]+)/i),
          area: g(/Area \(m²\)\s*\n\s*([^\n]+)/i),
          beds: g(/Bedrooms\s*\n\s*([^\n]+)/i),
          baths: g(/Bathrooms\s*\n\s*([^\n]+)/i),
          furnished: g(/Furnished\s*\n\s*([^\n]+)/i),
          seller: g(/Posted by\s*\n\s*([^\n]{2,60})/i),
          activeAds: g(/Active Ads\s*\n\s*(\d+)/i),
          verifiedBiz: /Verified Business/i.test(t),
          location: g(/Location\s*\n\s*([^\n]+)/i),
          textDump: t.slice(0, 1200),
        };
      });
      d.url = list[i];
      out.push(d);
      console.log(`${i + 1}/${list.length} ${d.price || '?'} · ${d.freq || '?'} · ${(d.title || '').slice(0, 55)}`);
    } catch (e) { console.log(`${i + 1} ERR ${e.message}`); }
    await sleep(900);
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('\nSAVED', out.length, '->', OUT);
})();
