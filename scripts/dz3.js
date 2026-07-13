// جولة تانية — يخوت + فيلات التجمع/الشيخ زايد (A+ برضه)
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\dz-leads2.json';
const LOG = 'E:\\madmona-app\\scripts\\dz3.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };
const wt = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TO')), ms))]);

const BIZ = /(real\s?estate|realty|properties|property|developments?|group|company|broker|remax|re\/max|coldwell|century|avalon|gate|egy\b|homes?|realtor|consult|invest|marketing|agency|llc|onyx|اونيكس|ايه بلاس|عقار|تسويق|شركة|مجموعة|مكتب)/i;

const JOBS = [
  { u: 'https://www.dubizzle.com.eg/en/motors/boats-watercraft/', min: 1000000, tag: 'يخت/مركب' },
  { u: 'https://www.dubizzle.com.eg/en/motors/boats-watercraft/?page=2', min: 1000000, tag: 'يخت/مركب' },
  { u: 'https://www.dubizzle.com.eg/en/properties/villas-for-sale/cairo/', min: 30000000, tag: 'فيلا القاهرة' },
  { u: 'https://www.dubizzle.com.eg/en/properties/villas-for-sale/cairo/?page=2', min: 30000000, tag: 'فيلا القاهرة' },
  { u: 'https://www.dubizzle.com.eg/en/properties/villas-for-sale/giza/', min: 30000000, tag: 'فيلا الجيزة' },
];

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(30000);

  const ads = new Map();
  for (const j of JOBS) {
    try {
      await wt(page.goto(j.u, { waitUntil: 'domcontentloaded' }), 30000);
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
      for (const f of found) if (f.href && !ads.has(f.href) && f.price >= j.min && !f.verified) ads.set(f.href, { ...f, tag: j.tag });
      log(`${j.tag} -> ${ads.size}`);
    } catch (e) { log(`list ERR ${e.message}`); }
  }

  log(`CANDIDATES=${ads.size}`);
  const leads = [];
  for (const a of ads.values()) {
    try {
      await wt(page.goto(a.href, { waitUntil: 'domcontentloaded' }), 25000);
      await sleep(1600);
      const meta = await wt(page.evaluate(() => {
        const t = document.body.innerText;
        const m = t.match(/Posted by\s*\n?\s*([^\n]{2,60})/i);
        const ttl = t.match(/EGP\s*[\d,]+[\s\S]{0,200}?\n([^\n]{20,110})\n/);
        return { seller: (m ? m[1] : '').trim(), isBiz: /Verified Business/i.test(t), title: (ttl ? ttl[1] : '').trim() };
      }), 12000);
      if (!meta.seller || meta.isBiz || BIZ.test(meta.seller)) { continue; }

      await wt(page.evaluate(() => {
        const btn = [...document.querySelectorAll('button,[role="button"]')].find(e => /Show Phone Number|إظهار رقم/i.test(e.innerText || ''));
        if (btn) btn.click();
      }), 8000).catch(() => {});
      await sleep(2400);
      const phone = await wt(page.evaluate(() => {
        const tel = document.querySelector('a[href^="tel:"]');
        if (tel) return tel.href.replace('tel:', '').replace(/\D/g, '');
        const m = document.body.innerText.match(/(01[0125]\d{8})/);
        return m ? m[1] : '';
      }), 8000).catch(() => '');
      if (phone) {
        leads.push({ name: meta.seller, phone, price_m: +(a.price / 1e6).toFixed(1), kind: a.tag, title: meta.title, url: a.href });
        log(`✅ ${meta.seller} | ${phone} | ${(a.price / 1e6).toFixed(1)}M | ${a.tag}`);
        fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
      }
    } catch (e) { log(`ERR ${String(e.message).slice(0, 35)}`); }
    await sleep(900);
  }
  fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
  log(`DONE leads=${leads.length}`);
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
