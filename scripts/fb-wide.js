// 🏡 سحب واسع: بوستات + صفحات + جروبات (الاسم فيه أرقام) — من غير انضمام
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\fb-villa.json';
const LOG = 'E:\\madmona-app\\scripts\\fb-wide.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const POSTS = [
  'فيلا للايجار اليومي التجمع الخامس',
  'فيلا ايجار يومي التجمع',
  'فيلا للايجار اليومي القاهرة الجديدة',
  'فيلا للايجار اليومي بحمام سباحة التجمع',
  'ايجار فيلا يوم التجمع الخامس',
  'فيلا يومي التجمع من المالك',
  'فلل للايجار اليومي التجمع الخامس',
  'فيلا للايجار اليومي مدينتي',
  'فيلا للايجار اليومي الرحاب',
  'فيلا ايجار يومي حمام سباحة القاهرة الجديدة',
  'فيلا للايجار اليومي القطامية',
  'ايجار فيلا يومي مصر الجديدة التجمع',
];
const PAGES = [
  'فيلات للايجار اليومي',
  'ايجار فيلات يومي التجمع',
  'فيلا ايجار يومي',
  'ايجار يومي فيلات القاهرة',
];
const GROUPSQ = [
  'ايجار يومي فيلات',
  'فيلات للايجار اليومي',
  'ايجار يومي التجمع',
  'فيلات ايجار يومي مصر',
  'فلل للايجار اليومي',
  'ايجار يومي فيلا حمام سباحة',
];

const BIZ = /(عقار|عقارية|تسويق|شركة|مجموعة|مكتب|بروكر|broker|real\s?estate|properties|realty|group|development|استثمار)/i;
const TAG = /التجمع|القاهرة الجديدة|نيو كايرو|new cairo|الخامس|قطامية|مدينتي|الرحاب|هايد بارك|ميفيدا|بيت الوطن|الشويفات|النرجس|اللوتس/i;

async function harvest(page, seen, src) {
  const found = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const norm = body.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48));
    const re = /01[0125]\d{8}/g;
    const out = []; let m;
    while ((m = re.exec(norm)) !== null) {
      out.push({ phone: m[0], ctx: norm.slice(Math.max(0, m.index - 500), m.index + 130).replace(/\n+/g, ' | ') });
    }
    return out;
  }).catch(() => []);

  let add = 0;
  for (const f of found) {
    if (seen.has(f.phone)) continue;
    const pm = f.ctx.match(/(\d{1,3}[.,]?\d{3})\s*(?:جنيه|ج\.?م)/) || f.ctx.match(/(\d{1,3})\s*(?:الف|ألف)/);
    seen.set(f.phone, {
      phone: f.phone, source: src, price: pm ? pm[1] : null,
      inTagamoa: TAG.test(f.ctx), daily: /يوم|يومي/.test(f.ctx),
      pool: /حمام سباحة|بيسين|pool/i.test(f.ctx),
      isBiz: BIZ.test(f.ctx), ctx: f.ctx,
    });
    add++;
  }
  return add;
}

async function sweep(page, seen, url, src, rounds) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    let lastLen = 0, stall = 0;
    for (let i = 0; i < rounds; i++) {
      await page.evaluate(() => window.scrollBy(0, 2600)).catch(() => {});
      await sleep(1700);
      await harvest(page, seen, src);
      const len = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
      if (len === lastLen) { stall++; if (stall >= 4 && i > 6) break; } else stall = 0;
      lastLen = len;
    }
    log(`${src} · len=${lastLen} · phones=${seen.size}`);
  } catch (e) { log(`ERR ${src}: ${String(e.message).slice(0, 50)}`); }
  fs.writeFileSync(OUT, JSON.stringify([...seen.values()], null, 1), 'utf8');
  await sleep(2200);
}

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => /facebook\.com/.test(p.url())) || await b.newPage();
  page.setDefaultNavigationTimeout(50000);

  const seen = new Map();
  for (const q of POSTS)
    await sweep(page, seen, 'https://www.facebook.com/search/posts?q=' + encodeURIComponent(q), `POST "${q}"`, 20);
  for (const q of GROUPSQ)
    await sweep(page, seen, 'https://www.facebook.com/search/groups?q=' + encodeURIComponent(q), `GROUP "${q}"`, 12);
  for (const q of PAGES)
    await sweep(page, seen, 'https://www.facebook.com/search/pages?q=' + encodeURIComponent(q), `PAGE "${q}"`, 12);

  const all = [...seen.values()];
  log(`\nDONE total=${all.length} · tagamoa=${all.filter(x => x.inTagamoa).length} · daily=${all.filter(x => x.daily).length} · owners=${all.filter(x => !x.isBiz).length}`);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1), 'utf8');
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
