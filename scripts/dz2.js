// v2 — أسرع وأمتن: timeout على كل خطوة + يكتب النتيجة أول بأول
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\dz-leads.json';
const LOG = 'E:\\madmona-app\\scripts\\dz2.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TO')), ms))]);

const MIN_PRICE = 20000000;
const BIZ = /(real\s?estate|realty|properties|property|developments?|group|company|broker|remax|re\/max|coldwell|century|avalon|gate|egy\b|homes?|realtor|consult|invest|marketing|agency|onyx|اونيكس|ايه بلاس|عقار|تسويق|شركة|مجموعة|مكتب)/i;

const URLS = [
  'https://www.dubizzle.com.eg/en/properties/villas-for-sale/north-coast/',
  'https://www.dubizzle.com.eg/en/properties/villas-for-sale/north-coast/?page=2',
  'https://www.dubizzle.com.eg/en/properties/villas-for-sale/north-coast/?page=3',
  'https://www.dubizzle.com.eg/en/properties/villas-for-sale/north-coast/?page=4',
  'https://www.dubizzle.com.eg/en/properties/vacation-homes-for-sale/north-coast/',
  'https://www.dubizzle.com.eg/en/properties/vacation-homes-for-sale/north-coast/?page=2',
];

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setDefaultNavigationTimeout(30000);

  const ads = new Map();
  for (const u of URLS) {
    try {
      await withTimeout(page.goto(u, { waitUntil: 'domcontentloaded' }), 30000);
      await sleep(3000);
      await page.evaluate(() => window.scrollTo(0, 4000)).catch(() => {});
      await sleep(2000);
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
      for (const f of found) if (f.href && !ads.has(f.href)) ads.set(f.href, f);
      log(`${u.slice(-28)} -> ${ads.size}`);
    } catch (e) { log(`list ERR ${e.message}`); }
  }

  const cands = [...ads.values()].filter(a => a.price >= MIN_PRICE && !a.verified);
  log(`CANDIDATES=${cands.length} / ${ads.size}`);

  const leads = [];
  for (let i = 0; i < cands.length; i++) {
    const a = cands[i];
    try {
      await withTimeout(page.goto(a.href, { waitUntil: 'domcontentloaded' }), 25000);
      await sleep(1800);
      const meta = await withTimeout(page.evaluate(() => {
        const t = document.body.innerText;
        const m = t.match(/Posted by\s*\n?\s*([^\n]{2,60})/i);
        const loc = t.match(/Villas For Sale in ([^\n/]{2,40})\s*\n/);
        const bua = t.match(/([\d,]+)\s*m²/);
        const bd = t.match(/(\d+)\s*beds?/i);
        const ttl = t.match(/EGP\s*[\d,]+[\s\S]{0,200}?\n([^\n]{25,110})\n/);
        return { seller: (m ? m[1] : '').trim(), isBiz: /Verified Business/i.test(t),
          area: (loc ? loc[1] : '').trim(), bua: bua ? bua[1] : '', beds: bd ? bd[1] : '',
          title: (ttl ? ttl[1] : '').trim() };
      }), 12000);

      if (!meta.seller || meta.isBiz || BIZ.test(meta.seller)) { log(`skip: ${meta.seller || '?'}`); continue; }

      await withTimeout(page.evaluate(() => {
        const btn = [...document.querySelectorAll('button,[role="button"]')].find(e => /Show Phone Number|إظهار رقم/i.test(e.innerText || ''));
        if (btn) btn.click();
      }), 8000).catch(() => {});
      await sleep(2500);

      const phone = await withTimeout(page.evaluate(() => {
        const tel = document.querySelector('a[href^="tel:"]');
        if (tel) return tel.href.replace('tel:', '').replace(/\D/g, '');
        const m = document.body.innerText.match(/(01[0125]\d{8})/);
        return m ? m[1] : '';
      }), 8000).catch(() => '');

      if (phone) {
        leads.push({ name: meta.seller, phone, price_egp: a.price, price_m: +(a.price / 1e6).toFixed(1), area: meta.area, bua_m2: meta.bua, beds: meta.beds, title: meta.title, url: a.href });
        log(`✅ ${meta.seller} | ${phone} | ${(a.price / 1e6).toFixed(1)}M`);
        fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
      } else log(`— ${meta.seller} | no phone`);
    } catch (e) { log(`ad ERR ${String(e.message).slice(0, 40)}`); }
    await sleep(900);
  }
  fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
  log(`DONE leads=${leads.length}`);
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
