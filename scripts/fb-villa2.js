// 🏡 فيسبوك — فيلات إيجار يومي التجمع | سكرول حقيقي داخل الصفحة
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\fb-villa.json';
const LOG = 'E:\\madmona-app\\scripts\\fb-villa.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const QUERIES = [
  'فيلا للايجار اليومي التجمع الخامس',
  'فيلا ايجار يومي التجمع',
  'فيلا للايجار اليومي القاهرة الجديدة',
  'فيلا للايجار اليومي بحمام سباحة التجمع',
  'ايجار فيلا يوم التجمع الخامس',
  'فيلا للايجار اليومي نيو كايرو',
  'فيلا يومي التجمع من المالك',
  'فلل للايجار اليومي التجمع الخامس',
  'فيلا للايجار اليومي مدينتي',
  'ايجار يومي فيلا الرحاب التجمع',
];

const BIZ = /(عقار|عقارية|تسويق|شركة|مجموعة|مكتب|بروكر|broker|real\s?estate|properties|realty|group|development|استثمار|للتسويق|هوم|homes)/i;
const TAG = /التجمع|القاهرة الجديدة|نيو كايرو|new cairo|الخامس|قطامية|مدينتي|الرحاب|هايد بارك|ميفيدا|بيت الوطن/i;

async function harvest(page, seen, q) {
  const posts = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('div[role="article"]').forEach(a => {
      const t = a.innerText || '';
      if (t.length < 30) return;
      const norm = t.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48));
      const phones = [...new Set(norm.match(/01[0125]\d{8}/g) || [])];
      if (!phones.length) return;
      const link = (a.querySelector('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid"]') || {}).href || '';
      out.push({ name: (t.split('\n')[0] || '').trim(), phones, text: t.slice(0, 500).replace(/\n/g, ' | '), link });
    });
    return out;
  }).catch(() => []);

  let add = 0;
  for (const p of posts) {
    for (const ph of p.phones) {
      if (seen.has(ph)) continue;
      const priceM = p.text.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
        .match(/(\d{1,3}[.,]?\d{3})\s*(?:جنيه|ج\.?م|ج\b)/) ||
        p.text.match(/(\d{1,2})\s*(?:الف|ألف)/);
      seen.set(ph, {
        phone: ph, name: p.name, query: q, link: p.link,
        price: priceM ? priceM[1] : null,
        text: p.text,
        isBiz: BIZ.test(p.name) || BIZ.test(p.text.slice(0, 160)),
        inTagamoa: TAG.test(p.text) || TAG.test(q),
      });
      add++;
    }
  }
  return add;
}

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => /facebook\.com/.test(p.url())) || await b.newPage();
  page.setDefaultNavigationTimeout(45000);

  const seen = new Map();
  for (const q of QUERIES) {
    try {
      await page.goto('https://www.facebook.com/search/posts?q=' + encodeURIComponent(q),
        { waitUntil: 'domcontentloaded' });
      await sleep(6000);

      // سكرول حقيقي: window.scrollBy + End key — بيحمّل بوستات جديدة
      let last = 0;
      for (let i = 0; i < 22; i++) {
        await page.evaluate(() => window.scrollBy(0, 2200));
        await page.keyboard.press('End').catch(() => {});
        await sleep(1800);
        const n = await page.evaluate(() => document.querySelectorAll('div[role="article"]').length).catch(() => 0);
        await harvest(page, seen, q);
        if (n === last && i > 6) break;   // بطّل تحميل
        last = n;
      }
      log(`"${q}" · articles≈${last} · total phones ${seen.size}`);
      fs.writeFileSync(OUT, JSON.stringify([...seen.values()], null, 1), 'utf8');
    } catch (e) { log(`ERR "${q}": ${String(e.message).slice(0, 60)}`); }
    await sleep(3000);
  }

  const all = [...seen.values()];
  log(`\nDONE total=${all.length} · tagamoa=${all.filter(x => x.inTagamoa).length} · owners=${all.filter(x => !x.isBiz).length}`);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1), 'utf8');
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
