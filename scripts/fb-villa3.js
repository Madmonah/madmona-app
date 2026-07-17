// 🏡 فيسبوك — أرقام فيلات إيجار يومي (بنسحب من نص الصفحة كله مع السياق)
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
  'فيلا للايجار اليومي الرحاب',
  'فيلا ايجار يومي حمام سباحة القاهرة الجديدة',
  'شاليه فيلا ايجار يومي التجمع',
];

const BIZ = /(عقار|عقارية|تسويق|شركة|مجموعة|مكتب|بروكر|broker|real\s?estate|properties|realty|group|development|استثمار|للتسويق)/i;
const TAG = /التجمع|القاهرة الجديدة|نيو كايرو|new cairo|الخامس|قطامية|مدينتي|الرحاب|هايد بارك|ميفيدا|بيت الوطن|الشويفات|النرجس|اللوتس/i;

async function harvest(page, seen, q) {
  const found = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const norm = body.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48));
    const re = /01[0125]\d{8}/g;
    const out = [];
    let m;
    while ((m = re.exec(norm)) !== null) {
      const start = Math.max(0, m.index - 450);
      const ctx = norm.slice(start, m.index + 150).replace(/\n+/g, ' | ');
      out.push({ phone: m[0], ctx });
    }
    return out;
  }).catch(() => []);

  let add = 0;
  for (const f of found) {
    if (seen.has(f.phone)) continue;
    const priceM = f.ctx.match(/(\d{1,3}[.,]?\d{3})\s*(?:جنيه|ج\.?م)/) || f.ctx.match(/(\d{1,3})\s*(?:الف|ألف|k)/i);
    seen.set(f.phone, {
      phone: f.phone, query: q, price: priceM ? priceM[1] : null,
      ctx: f.ctx,
      isBiz: BIZ.test(f.ctx),
      inTagamoa: TAG.test(f.ctx) || TAG.test(q),
      daily: /يوم|يومي|daily/i.test(f.ctx),
      pool: /حمام سباحة|بيسين|pool/i.test(f.ctx),
    });
    add++;
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
      await sleep(6500);

      let lastLen = 0, stall = 0;
      for (let i = 0; i < 25; i++) {
        await page.evaluate(() => window.scrollBy(0, 2500)).catch(() => {});
        await sleep(1900);
        await harvest(page, seen, q);
        const len = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
        if (len === lastLen) { stall++; if (stall >= 3 && i > 5) break; } else stall = 0;
        lastLen = len;
      }
      log(`"${q}" · pageLen=${lastLen} · phones=${seen.size}`);
      fs.writeFileSync(OUT, JSON.stringify([...seen.values()], null, 1), 'utf8');
    } catch (e) { log(`ERR "${q}": ${String(e.message).slice(0, 60)}`); }
    await sleep(2500);
  }

  const all = [...seen.values()];
  log(`\nDONE total=${all.length} · tagamoa=${all.filter(x => x.inTagamoa).length} · daily=${all.filter(x => x.daily).length} · owners=${all.filter(x => !x.isBiz).length}`);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1), 'utf8');
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
