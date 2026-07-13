// عربيات لوكشري من المالك — بالبراند مش بالفلتر
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wt = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TO')), ms))]);
const OUT = 'E:\\madmona-app\\scripts\\leads-cars.json';
const LOG = 'E:\\madmona-app\\scripts\\dzcars.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const BIZ = /(motors|cars?|auto|trading|import|showroom|gallery|center|centre|group|company|est\b|llc|معرض|توكيل|شركة|تجاري|استيراد|سنتر)/i;
const MIN = 4000000; // ٤ مليون+ = لوكشري
const MAX_ADS = 3;

const BRANDS = ['mercedes-benz','bmw','porsche','land-rover','lexus','audi','jaguar','bentley','maserati','volvo'];
const JOBS = [];
for (const br of BRANDS) for (let p = 1; p <= 2; p++)
  JOBS.push({ u: `https://www.dubizzle.com.eg/en/vehicles/cars-for-sale/${br}/?page=${p}`, tag: 'عربية لوكشري' });

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const ads = new Map();
  let page = null, i = 0;
  for (const j of JOBS) {
    if (!page || i % 8 === 0) { if (page) await page.close().catch(() => {}); page = await b.newPage(); page.setDefaultNavigationTimeout(22000); }
    i++;
    try {
      await wt(page.goto(j.u, { waitUntil: 'domcontentloaded' }), 22000);
      await sleep(2400);
      await page.evaluate(() => window.scrollTo(0, 5000)).catch(() => {});
      await sleep(1400);
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
      for (const f of found) if (f.href && !ads.has(f.href) && f.price >= MIN && !f.verified) { ads.set(f.href, { ...f, tag: j.tag }); add++; }
      log(`${j.u.split('/').slice(-2)[0]} +${add} (tot ${ads.size})`);
    } catch (e) { log('list ERR'); }
  }
  log(`CANDIDATES=${ads.size}`);

  const leads = [];
  let cnt = 0;
  for (const a of ads.values()) {
    if (cnt % 10 === 0) { if (page) await page.close().catch(() => {}); page = await b.newPage(); page.setDefaultNavigationTimeout(20000); }
    cnt++;
    try {
      await wt(page.goto(a.href, { waitUntil: 'domcontentloaded' }), 20000);
      await sleep(1200);
      const meta = await wt(page.evaluate(() => {
        const t = document.body.innerText;
        const nm = t.match(/Posted by\s*\n?\s*([^\n]{2,60})/i);
        const ac = t.match(/Active Ads\s*\n?\s*(\d+)/i);
        const ttl = t.match(/EGP\s*[\d,]+[\s\S]{0,200}?\n([^\n]{15,90})\n/);
        return { seller: (nm ? nm[1] : '').trim(), activeAds: ac ? +ac[1] : 999,
          isBiz: /Verified Business/i.test(t), title: (ttl ? ttl[1] : '').trim() };
      }), 9000);
      if (!meta.seller || meta.isBiz || BIZ.test(meta.seller) || meta.activeAds > MAX_ADS) continue;

      await wt(page.evaluate(() => {
        const btn = [...document.querySelectorAll('button,[role="button"]')].find(e => /Show Phone Number|إظهار رقم/i.test(e.innerText || ''));
        if (btn) btn.click();
      }), 6000).catch(() => {});
      await sleep(2000);
      const phone = await wt(page.evaluate(() => {
        const tel = document.querySelector('a[href^="tel:"]');
        if (tel) return tel.href.replace('tel:', '').replace(/\D/g, '');
        const m = document.body.innerText.match(/(01[0125]\d{8})/);
        return m ? m[1] : '';
      }), 6000).catch(() => '');
      if (phone) {
        leads.push({ name: meta.seller, phone, price_m: +(a.price / 1e6).toFixed(1), kind: 'عربية لوكشري',
          activeAds: meta.activeAds, title: meta.title, url: a.href });
        log(`✅ ${meta.seller} | ${phone} | ${(a.price / 1e6).toFixed(1)}M`);
        fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
      }
    } catch (e) { /* skip */ }
    await sleep(500);
  }
  fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
  log(`DONE cars=${leads.length}`);
  if (page) await page.close().catch(() => {});
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
