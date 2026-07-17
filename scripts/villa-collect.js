// 🏡 جمع لينكات فيلات إيجار في التجمع من دوبيزل
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\villa-urls.json';

// إيجار عقارات > فيلات > القاهرة الجديدة/التجمع
const SEARCHES = [
  'https://www.dubizzle.com.eg/en/properties/villas-for-rent/new-cairo-city/',
  'https://www.dubizzle.com.eg/ar/%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA/%D9%81%D9%8A%D9%84%D9%84-%D9%84%D9%84%D8%A5%D9%8A%D8%AC%D8%A7%D8%B1/%D8%A7%D9%84%D9%82%D8%A7%D9%87%D8%B1%D8%A9-%D8%A7%D9%84%D8%AC%D8%AF%D9%8A%D8%AF%D8%A9/',
];

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const all = new Map();

  for (const base of SEARCHES) {
    for (let p = 1; p <= 3; p++) {
      const url = p === 1 ? base : `${base}?page=${p}`;
      const page = await b.newPage();
      page.setDefaultNavigationTimeout(30000);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await sleep(3500);
        const items = await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('a[href*="/ad/"]').forEach(a => {
            const card = a.closest('li,article,div');
            const txt = (card ? card.innerText : a.innerText) || '';
            out.push({ href: a.href.split('?')[0], txt: txt.slice(0, 300) });
          });
          return out;
        });
        console.log(`p${p} ${base.slice(30, 60)} -> ${items.length}`);
        items.forEach(i => { if (!all.has(i.href)) all.set(i.href, i); });
      } catch (e) { console.log('ERR', e.message); }
      await page.close().catch(() => {});
      await sleep(1200);
    }
  }

  const arr = [...all.values()];
  fs.writeFileSync(OUT, JSON.stringify(arr, null, 2), 'utf8');
  console.log(`\nTOTAL ${arr.length} -> ${OUT}`);
  arr.slice(0, 5).forEach(a => console.log('·', a.txt.replace(/\n/g, ' | ').slice(0, 120)));
})();
