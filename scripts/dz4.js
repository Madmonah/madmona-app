// v4 — فلتر قوي: Active Ads count + Member-since + كلمات. + مصادر أوسع
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\leads-v4.json';
const LOG = 'E:\\madmona-app\\scripts\\dz4.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };
const wt = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TO')), ms))]);

// أي اسم فيه دي = شركة (موسّع)
const BIZ = /(real\s?estate|realty|properties|property|develop|group|company|co\b|broker|remax|re\/max|coldwell|century|avalon|gate|egy\b|home|realtor|consult|invest|market|agency|llc|ltd|inc\b|onyx|abrag|assets|villa\s|villas|estates?|solutions|partners|capital|holding|هوم|أبراج|ابراج|اونيكس|ايه بلاس|عقار|تسويق|شركة|مجموعة|مكتب|للاستثمار|ديفلوب)/i;
const MAX_ADS = 3;   // مالك حقيقي: 3 إعلانات أو أقل

const JOBS = [];
for (let p = 1; p <= 10; p++) JOBS.push({ u: `https://www.dubizzle.com.eg/en/properties/villas-for-sale/north-coast/?page=${p}`, min: 20e6, tag: 'فيلا الساحل' });
for (let p = 1; p <= 6; p++) JOBS.push({ u: `https://www.dubizzle.com.eg/en/properties/vacation-homes-for-sale/north-coast/?page=${p}`, min: 15e6, tag: 'شاليه الساحل' });
for (let p = 1; p <= 5; p++) JOBS.push({ u: `https://www.dubizzle.com.eg/en/properties/villas-for-sale/cairo/?page=${p}`, min: 30e6, tag: 'فيلا القاهرة' });
for (let p = 1; p <= 4; p++) JOBS.push({ u: `https://www.dubizzle.com.eg/en/properties/villas-for-sale/giza/?page=${p}`, min: 30e6, tag: 'فيلا الجيزة' });
for (let p = 1; p <= 3; p++) JOBS.push({ u: `https://www.dubizzle.com.eg/en/motors/boats-watercraft/?page=${p}`, min: 500000, tag: 'يخت/مركب' });

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(28000);

  const ads = new Map();
  for (const j of JOBS) {
    try {
      await wt(page.goto(j.u, { waitUntil: 'domcontentloaded' }), 28000);
      await sleep(2600);
      await page.evaluate(() => window.scrollTo(0, 5000)).catch(() => {});
      await sleep(1600);
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
      let added = 0;
      for (const f of found) if (f.href && !ads.has(f.href) && f.price >= j.min && !f.verified) { ads.set(f.href, { ...f, tag: j.tag }); added++; }
      log(`${j.tag} p${j.u.match(/page=(\d+)/)?.[1] || 1} +${added} (tot ${ads.size})`);
    } catch (e) { log(`list ERR ${String(e.message).slice(0, 30)}`); }
  }

  log(`=== CANDIDATES=${ads.size} ===`);
  const leads = [], rejected = [];
  let n = 0;
  for (const a of ads.values()) {
    n++;
    try {
      await wt(page.goto(a.href, { waitUntil: 'domcontentloaded' }), 24000);
      await sleep(1500);
      const meta = await wt(page.evaluate(() => {
        const t = document.body.innerText;
        const nm = t.match(/Posted by\s*\n?\s*([^\n]{2,60})/i);
        const ac = t.match(/Active Ads\s*\n?\s*(\d+)/i);
        const ms = t.match(/Member Since\s*\n?\s*(\d{4})/i);
        const ttl = t.match(/EGP\s*[\d,]+[\s\S]{0,220}?\n([^\n]{20,110})\n/);
        const loc = t.match(/\n([^\n]{3,40}),\s*(?:North Coast|Ras Al Hekma|Sidi Abdel Rahman|Alamein|Cairo|Giza)\s*\n/);
        return {
          seller: (nm ? nm[1] : '').trim(),
          activeAds: ac ? +ac[1] : 999,
          since: ms ? ms[1] : '',
          isBiz: /Verified Business/i.test(t),
          title: (ttl ? ttl[1] : '').trim(),
          loc: (loc ? loc[0].trim() : ''),
        };
      }), 12000);

      const why = !meta.seller ? 'no-name'
        : meta.isBiz ? 'verified-business'
        : BIZ.test(meta.seller) ? 'biz-name'
        : meta.activeAds > MAX_ADS ? `ads=${meta.activeAds}`
        : null;

      if (why) { rejected.push({ name: meta.seller, why, ads: meta.activeAds }); log(`✗ ${meta.seller || '?'} (${why})`); continue; }

      await wt(page.evaluate(() => {
        const btn = [...document.querySelectorAll('button,[role="button"]')].find(e => /Show Phone Number|إظهار رقم/i.test(e.innerText || ''));
        if (btn) btn.click();
      }), 7000).catch(() => {});
      await sleep(2300);
      const phone = await wt(page.evaluate(() => {
        const tel = document.querySelector('a[href^="tel:"]');
        if (tel) return tel.href.replace('tel:', '').replace(/\D/g, '');
        const m = document.body.innerText.match(/(01[0125]\d{8})/);
        return m ? m[1] : '';
      }), 7000).catch(() => '');

      if (phone) {
        leads.push({ name: meta.seller, phone, price_m: +(a.price / 1e6).toFixed(1), kind: a.tag,
          activeAds: meta.activeAds, since: meta.since, loc: meta.loc, title: meta.title, url: a.href });
        log(`✅ ${meta.seller} | ${phone} | ${(a.price / 1e6).toFixed(1)}M | ads=${meta.activeAds} | ${a.tag}`);
        fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
      }
    } catch (e) { log(`ERR ${String(e.message).slice(0, 30)}`); }
    await sleep(800);
  }
  fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
  log(`DONE leads=${leads.length} rejected=${rejected.length}`);
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
