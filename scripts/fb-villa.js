// 🏡 فيسبوك — فيلات إيجار يومي في التجمع/القاهرة الجديدة (أرقام مباشرة)
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wt = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TO')), ms))]);
const OUT = 'E:\\madmona-app\\scripts\\fb-villa.json';
const LOG = 'E:\\madmona-app\\scripts\\fb-villa.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const QUERIES = [
  'فيلا للايجار اليومي التجمع الخامس',
  'فيلا ايجار يومي التجمع',
  'فيلا للايجار اليومي القاهرة الجديدة',
  'فيلا ايجار يومي التجمع الخامس حمام سباحة',
  'ايجار فيلا يوم التجمع الخامس',
  'فيلا للايجار اليومي نيو كايرو',
  'فيلا يومي التجمع من المالك',
  'ايجار يومي فيلا مدينتي التجمع',
  'فيلا للايجار اليومي بحمام سباحة التجمع',
  'فلل للايجار اليومي التجمع الخامس',
];

const BIZ = /(عقار|عقارية|تسويق|شركة|مجموعة|مكتب|بروكر|broker|real\s?estate|properties|realty|group|development|استثمار|للتسويق|هوم|homes|رحلات|منظم)/i;
const TAG = /التجمع|القاهرة الجديدة|نيو كايرو|new cairo|5th|الخامس|قطامية|مدينتي|الرحاب|هايد بارك|ميفيدا/i;

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  // نستخدم التاب المفتوح بتاع فيسبوك بدل ما نفتح جديد
  const pages = await b.pages();
  const page = pages.find(p => /facebook\.com/.test(p.url())) || await b.newPage();
  page.setDefaultNavigationTimeout(40000);

  const seen = new Map();
  for (const q of QUERIES) {
    const url = `https://www.facebook.com/search/posts?q=${encodeURIComponent(q)}`;
    try {
      await wt(page.goto(url, { waitUntil: 'domcontentloaded' }), 40000);
      await sleep(7000);
      for (let i = 0; i < 10; i++) { await page.mouse.wheel({ deltaY: 2800 }).catch(() => {}); await sleep(2000); }

      const posts = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('div[role="article"]').forEach(a => {
          const t = a.innerText || '';
          if (t.length < 40) return;
          const name = (t.split('\n')[0] || '').trim();
          const raw = t.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48));
          const phones = [...new Set((raw.match(/(?:\+?20)?0?1[0125]\d{8}/g) || []))]
            .map(p => '0' + p.replace(/^\+?20/, '').replace(/^0/, '').replace(/^/, '1').slice(1))
            .map(p => p.length === 11 ? p : null).filter(Boolean);
          const p2 = [...new Set((raw.match(/01[0125]\d{8}/g) || []))];
          const all = [...new Set([...phones, ...p2])].filter(x => /^01[0125]\d{8}$/.test(x));
          if (!all.length) return;
          const price = (raw.match(/(\d{1,3}[,.]?\d{3})\s*(?:جنيه|ج|الف|k)?/i) || [])[1] || null;
          out.push({ name, phones: all, price, text: t.slice(0, 400).replace(/\n/g, ' | ') });
        });
        return out;
      });

      let add = 0;
      for (const p of posts) {
        for (const ph of p.phones) {
          if (seen.has(ph)) continue;
          seen.set(ph, {
            phone: ph, name: p.name, query: q, price: p.price, text: p.text,
            isBiz: BIZ.test(p.name) || BIZ.test(p.text.slice(0, 150)),
            inTagamoa: TAG.test(p.text) || TAG.test(q),
          });
          add++;
        }
      }
      log(`"${q}" -> +${add} (tot ${seen.size})`);
      fs.writeFileSync(OUT, JSON.stringify([...seen.values()], null, 1), 'utf8');
    } catch (e) { log(`ERR ${q}: ${String(e.message).slice(0, 50)}`); }
    await sleep(3500);
  }

  const all = [...seen.values()];
  log(`\nDONE total=${all.length} · tagamoa=${all.filter(x => x.inTagamoa).length} · owners=${all.filter(x => !x.isBiz).length}`);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1), 'utf8');
  b.disconnect();  // سايبين التاب مفتوح
})().catch(e => log('FATAL ' + e.message));
