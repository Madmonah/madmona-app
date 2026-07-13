// يجمع إعلانات فيلات/شاليهات الساحل من المالك مباشرة (A+ = سعر عالي)
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\dz-leads.json';
const LOG = 'E:\\madmona-app\\scripts\\dz.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const MIN_PRICE = 20000000; // ٢٠ مليون+ = A+
const PAGES = parseInt(process.argv[2] || '4', 10);

// كلمات بتدل على شركة/بروكر مش مالك
const BIZ = /(real\s?estate|realty|properties|property|developments?|group|company|co\.|est\.|broker|remax|re\/max|coldwell|century|avalon|gate|egy|homes?|realtors?|consult|invest|marketing|agency|عقار|عقاري|تسويق|شركة|مجموعة|مكتب|ديفلوب|بروكر)/i;

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();

  // 1) اجمع لينكات الإعلانات
  const ads = new Map();
  for (let p = 1; p <= PAGES; p++) {
    const url = `https://www.dubizzle.com.eg/en/properties/villas-for-sale/north-coast/?page=${p}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(3500);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2500);
      const found = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href*="/ad/"]').forEach(a => {
          const box = a.closest('li') || a.parentElement?.parentElement;
          const t = (box?.innerText || '');
          const pm = t.match(/EGP\s*([\d,]+)/);
          out.push({
            href: a.href.split('?')[0],
            price: pm ? parseInt(pm[1].replace(/,/g, ''), 10) : 0,
            verified: /Verified Business/i.test(t),
            title: (t.split('\n').find(x => x.length > 25) || '').slice(0, 90),
          });
        });
        return out;
      });
      for (const f of found) if (f.href && !ads.has(f.href)) ads.set(f.href, f);
      log(`page ${p}: total=${ads.size}`);
    } catch (e) { log(`page ${p} ERR ${e.message}`); }
  }

  // 2) فلتر: سعر A+ ومش Verified Business
  const cands = [...ads.values()].filter(a => a.price >= MIN_PRICE && !a.verified);
  log(`candidates (>=${MIN_PRICE / 1e6}M, not verified biz) = ${cands.length} of ${ads.size}`);

  // 3) افتح كل إعلان، اطلع اسم البايع، لو مالك -> هات الرقم
  const leads = [];
  for (let i = 0; i < cands.length; i++) {
    const a = cands[i];
    try {
      await page.goto(a.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(2500);

      const meta = await page.evaluate(() => {
        const t = document.body.innerText;
        const m = t.match(/Posted by\s*\n?\s*([^\n]{2,60})/i);
        const loc = t.match(/Villas For Sale in ([^\n/]{2,40})\s*$/m);
        const bua = t.match(/([\d,]+)\s*m²/);
        const beds = t.match(/(\d+)\s*beds?/i);
        return {
          seller: (m ? m[1] : '').trim(),
          isBiz: /Verified Business/i.test(t),
          area: (loc ? loc[1] : '').trim(),
          bua: bua ? bua[1] : '',
          beds: beds ? beds[1] : '',
        };
      });

      if (!meta.seller || meta.isBiz || BIZ.test(meta.seller)) { continue; }

      // دوس Show Phone Number
      const clicked = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button, [role="button"]')]
          .find(e => /Show Phone Number|إظهار رقم/i.test(e.innerText || ''));
        if (!btn) return false; btn.click(); return true;
      });
      await sleep(3000);

      const phone = await page.evaluate(() => {
        const tel = document.querySelector('a[href^="tel:"]');
        if (tel) return tel.href.replace('tel:', '');
        const m = document.body.innerText.match(/(01[0-2,5]\d{8})/);
        return m ? m[1] : '';
      });

      if (phone) {
        leads.push({ name: meta.seller, phone, price: a.price, area: meta.area, bua: meta.bua, beds: meta.beds, title: a.title, url: a.href });
        log(`✅ ${meta.seller} | ${phone} | ${(a.price / 1e6).toFixed(1)}M | ${meta.area}`);
      } else {
        log(`— ${meta.seller} | no phone`);
      }
    } catch (e) { log(`ad ERR ${e.message.slice(0, 50)}`); }
    await sleep(1500);
    if (i % 10 === 0) fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
  }

  fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
  log(`DONE leads=${leads.length}`);
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
