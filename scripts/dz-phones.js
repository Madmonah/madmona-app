// 📞 أرقام فيلات الإيجار اليومي من دوبيزل — من روابط tel: و wa.me
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\villa-phones.json';
const LOG = 'E:\\madmona-app\\scripts\\dz-phones.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const LISTS = [
  'https://www.dubizzle.com.eg/en/properties/villas-for-rent/cairo/q-villas-for-daily-rent/',
  'https://www.dubizzle.com.eg/en/properties/villas-for-rent/new-cairo/q-villas-for-daily-rent/',
  'https://www.dubizzle.com.eg/en/properties/villas-for-rent/cairo/q-villas-for-daily-rent/?page=2',
];

const TAG = /5th settlement|fifth settlement|new cairo|التجمع|القاهرة الجديدة|katameya|قطامية|mivida|hyde park|festival|guezira|lake view|concord/i;

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(45000);

  const seen = new Map();

  for (const L of LISTS) {
    try {
      await page.goto(L, { waitUntil: 'domcontentloaded' });
      await sleep(5000);
      for (let i = 0; i < 12; i++) { await page.evaluate(() => window.scrollBy(0, 2200)); await sleep(1400); }

      const items = await page.evaluate(() => {
        const out = [];
        // كل كارت إعلان
        document.querySelectorAll('a[href*="/ad/"]').forEach(a => {
          const card = a.closest('li, article, div[class]');
          if (!card) return;
          const tel = card.querySelector('a[href^="tel:"]');
          const wa = card.querySelector('a[href*="wa.me"], a[href*="whatsapp"]');
          if (!tel && !wa) return;
          const raw = (tel ? tel.getAttribute('href') : wa.getAttribute('href')) || '';
          const digits = raw.replace(/\D/g, '');
          const txt = (card.innerText || '').slice(0, 300).replace(/\n/g, ' | ');
          out.push({ digits, txt, url: a.href.split('?')[0] });
        });
        return out;
      }).catch(() => []);

      for (const it of items) {
        let d = it.digits;
        if (d.startsWith('20')) d = '0' + d.slice(2);
        if (d.startsWith('0020')) d = '0' + d.slice(4);
        if (!/^01[0125]\d{8}$/.test(d)) continue;
        if (seen.has(d)) continue;
        const pm = it.txt.match(/EGP\s*([\d,]+)/);
        seen.set(d, {
          phone: d,
          price: pm ? Number(pm[1].replace(/,/g, '')) : null,
          title: (it.txt.split(' | ').find(s => s.length > 25) || it.txt).slice(0, 110),
          tagamoa: TAG.test(it.txt) || TAG.test(it.url),
          url: it.url,
        });
      }
      log(`${L.slice(45, 90)} -> phones ${seen.size}`);
      fs.writeFileSync(OUT, JSON.stringify([...seen.values()], null, 1), 'utf8');
    } catch (e) { log('ERR ' + String(e.message).slice(0, 60)); }
    await sleep(2000);
  }

  const all = [...seen.values()];
  log(`\nDONE total=${all.length} · tagamoa=${all.filter(x => x.tagamoa).length}`);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1), 'utf8');
  await page.close().catch(() => {});
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
