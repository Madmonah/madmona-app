// 🏡 يسحب الأرقام من جروبات الإيجار اليومي
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\fb-villa.json';
const LOG = 'E:\\madmona-app\\scripts\\fb-grab.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const GROUPS = [
  { id: '816302719723658', name: 'فيلل للايجار اليومي' },
  { id: '1122293468337232', name: 'فيلا للايجار اليومي - Villa for daily rent' },
  { id: '424993695667806', name: 'فلل H class للايجار اليومي' },
  { id: '1088029562178163', name: 'فلل وشاليهات ومزارع للايجار اليومي' },
  { id: '1793314674179529', name: 'عقارات مفروشة للايجار اليومي' },
  { id: '1765707140535546', name: 'ايجارات التجمع الخامس' },
  { id: '493500006883940', name: 'من المالك مباشر - التجمع الخامس والأول والرحاب' },
  { id: '232823053224967', name: 'شقق مفروشة إيجار يومي' },
];

const BIZ = /(عقار|عقارية|تسويق|شركة|مجموعة|مكتب|بروكر|broker|real\s?estate|properties|realty|group|development|استثمار)/i;
const TAG = /التجمع|القاهرة الجديدة|نيو كايرو|new cairo|الخامس|قطامية|مدينتي|الرحاب|هايد بارك|ميفيدا|بيت الوطن|الشويفات|النرجس|اللوتس|الياسمين|جنوب الاكاديمية/i;

async function harvest(page, seen, g) {
  const found = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const norm = body.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48));
    const re = /01[0125]\d{8}/g;
    const out = []; let m;
    while ((m = re.exec(norm)) !== null) {
      out.push({ phone: m[0], ctx: norm.slice(Math.max(0, m.index - 500), m.index + 120).replace(/\n+/g, ' | ') });
    }
    return out;
  }).catch(() => []);

  let add = 0;
  for (const f of found) {
    if (seen.has(f.phone)) continue;
    const pm = f.ctx.match(/(\d{1,3}[.,]?\d{3})\s*(?:جنيه|ج\.?م)/) || f.ctx.match(/(\d{1,3})\s*(?:الف|ألف)/);
    seen.set(f.phone, {
      phone: f.phone, group: g.name, price: pm ? pm[1] : null,
      inTagamoa: TAG.test(f.ctx), daily: /يوم|يومي/.test(f.ctx),
      pool: /حمام سباحة|بيسين|pool/i.test(f.ctx),
      isBiz: BIZ.test(f.ctx),
      ctx: f.ctx,
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
  page.setDefaultNavigationTimeout(50000);

  const seen = new Map();
  for (const g of GROUPS) {
    try {
      await page.goto(`https://www.facebook.com/groups/${g.id}`, { waitUntil: 'domcontentloaded' });
      await sleep(7000);
      let lastLen = 0, stall = 0;
      for (let i = 0; i < 40; i++) {
        await page.evaluate(() => window.scrollBy(0, 2600)).catch(() => {});
        await sleep(1700);
        await harvest(page, seen, g);
        const len = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
        if (len === lastLen) { stall++; if (stall >= 4 && i > 8) break; } else stall = 0;
        lastLen = len;
      }
      log(`[${g.name}] len=${lastLen} · phones=${seen.size}`);
      fs.writeFileSync(OUT, JSON.stringify([...seen.values()], null, 1), 'utf8');
    } catch (e) { log(`ERR ${g.name}: ${String(e.message).slice(0, 60)}`); }
    await sleep(2500);
  }

  const all = [...seen.values()];
  log(`\nDONE total=${all.length} · tagamoa=${all.filter(x => x.inTagamoa).length} · owners=${all.filter(x => !x.isBiz).length}`);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1), 'utf8');
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
