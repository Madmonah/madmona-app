const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wt = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TO')), ms))]);
const OUT = 'E:\\madmona-app\\scripts\\dz5-urls.json';

const JOBS = [];
for (let p = 1; p <= 12; p++) JOBS.push({ u: `https://www.dubizzle.com.eg/en/properties/villas-for-sale/north-coast/?page=${p}`, min: 20e6, tag: 'فيلا الساحل' });
for (let p = 1; p <= 8; p++) JOBS.push({ u: `https://www.dubizzle.com.eg/en/properties/vacation-homes-for-sale/north-coast/?page=${p}`, min: 15e6, tag: 'شاليه الساحل' });
for (let p = 1; p <= 6; p++) JOBS.push({ u: `https://www.dubizzle.com.eg/en/properties/villas-for-sale/cairo/?page=${p}`, min: 30e6, tag: 'فيلا القاهرة' });
for (let p = 1; p <= 5; p++) JOBS.push({ u: `https://www.dubizzle.com.eg/en/properties/villas-for-sale/giza/?page=${p}`, min: 30e6, tag: 'فيلا الجيزة' });

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const ads = new Map();
  let page = null, i = 0;
  for (const j of JOBS) {
    if (!page || i % 8 === 0) { if (page) await page.close().catch(() => {}); page = await b.newPage(); page.setDefaultNavigationTimeout(25000); }
    i++;
    try {
      await wt(page.goto(j.u, { waitUntil: 'domcontentloaded' }), 25000);
      await sleep(2400);
      await page.evaluate(() => window.scrollTo(0, 5000)).catch(() => {});
      await sleep(1500);
      const found = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href*="/ad/"]').forEach(a => {
          const box = a.closest('li') || a.parentElement?.parentElement;
          const t = box?.innerText || '';
          const pm = t.match(/EGP\s*([\d,]+)/);
          out.push({ href: a.href.split('?')[0], price: pm ? +pm[1].replace(/,/g, '') : 0, verified: /Verified Business/i.test(t) });
        });
        return out;
      });
      let add = 0;
      for (const f of found) if (f.href && !ads.has(f.href) && f.price >= j.min && !f.verified) { ads.set(f.href, { ...f, tag: j.tag }); add++; }
      console.log(`${j.tag} +${add} (tot ${ads.size})`);
    } catch (e) { console.log('ERR', String(e.message).slice(0, 25)); }
  }
  fs.writeFileSync(OUT, JSON.stringify([...ads.values()], null, 1));
  console.log('SAVED urls =', ads.size);
  if (page) await page.close().catch(() => {});
  b.disconnect();
})().catch(e => console.log('FATAL', e.message));
