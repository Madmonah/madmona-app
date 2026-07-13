// يدور في فيسبوك على بوستات بيع فيلات/شاليهات "من المالك"
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wt = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TO')), ms))]);
const OUT = 'E:\\madmona-app\\scripts\\fb-owner-leads.json';
const LOG = 'E:\\madmona-app\\scripts\\fbg.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const QUERIES = [
  'فيلا للبيع الساحل الشمالي من المالك',
  'شاليه للبيع الساحل من المالك مباشرة',
  'فيلا للبيع مراسي من المالك',
  'شاليه للبيع مارينا من المالك',
  'فيلا للبيع هاسيندا من المالك',
  'يخت للبيع مصر',
  'لنش للبيع الساحل',
  'فيلا للايجار الساحل من المالك',
];

// شركات/بروكرز
const BIZ = /(عقار|عقارية|تسويق|شركة|مجموعة|مكتب|بروكر|broker|real\s?estate|properties|realty|group|development|استثمار|للتسويق|هوم|homes)/i;

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(35000);

  const seen = new Map();
  for (const q of QUERIES) {
    const url = `https://www.facebook.com/search/posts?q=${encodeURIComponent(q)}`;
    try {
      await wt(page.goto(url, { waitUntil: 'domcontentloaded' }), 35000);
      await sleep(6000);
      // اسكرول عشان يحمّل
      for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: 2500 }).catch(() => {}); await sleep(2200); }

      const posts = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('div[role="article"]').forEach(a => {
          const t = a.innerText || '';
          if (t.length < 40) return;
          // الاسم = أول سطر
          const name = (t.split('\n')[0] || '').trim();
          const phones = [...new Set((t.match(/01[0125]\d{8}/g) || []))];
          if (!phones.length) return;
          out.push({ name, phones, text: t.slice(0, 300).replace(/\n/g, ' | ') });
        });
        return out;
      });

      let add = 0;
      for (const p of posts) {
        for (const ph of p.phones) {
          if (seen.has(ph)) continue;
          seen.set(ph, { name: p.name, phone: ph, query: q, text: p.text, isBiz: BIZ.test(p.name) || BIZ.test(p.text.slice(0, 120)) });
          add++;
        }
      }
      log(`"${q}" -> +${add} (tot ${seen.size})`);
      fs.writeFileSync(OUT, JSON.stringify([...seen.values()], null, 1));
    } catch (e) { log(`ERR ${q}: ${String(e.message).slice(0, 40)}`); }
    await sleep(3000);
  }

  const all = [...seen.values()];
  const owners = all.filter(x => !x.isBiz);
  log(`DONE total=${all.length} owners=${owners.length} biz=${all.length - owners.length}`);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  await page.close().catch(() => {});
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
