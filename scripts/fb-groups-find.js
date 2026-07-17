// يدوّر على جروبات الإيجار اليومي
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const Q = [
  'ايجار يومي فيلات',
  'فيلات للايجار اليومي',
  'ايجار يومي التجمع',
  'فيلات ايجار يومي مصر',
  'ايجار شاليهات وفيلات يومي',
];

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => /facebook\.com/.test(p.url())) || await b.newPage();
  page.setDefaultNavigationTimeout(45000);

  const groups = new Map();
  for (const q of Q) {
    try {
      await page.goto('https://www.facebook.com/search/groups?q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded' });
      await sleep(6000);
      for (let i = 0; i < 6; i++) { await page.evaluate(() => window.scrollBy(0, 2000)); await sleep(1600); }

      const g = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('a[href*="/groups/"]').forEach(a => {
          const m = (a.getAttribute('href') || '').match(/\/groups\/([^/?]+)/);
          if (!m) return;
          const txt = (a.innerText || '').trim();
          if (!txt || txt.length < 3) return;
          out.push({ id: m[1], name: txt.split('\n')[0] });
        });
        return out;
      }).catch(() => []);
      g.forEach(x => { if (!groups.has(x.id)) groups.set(x.id, x); });
      console.log(`"${q}" -> ${g.length} (tot ${groups.size})`);
    } catch (e) { console.log('ERR', q, e.message.slice(0, 40)); }
    await sleep(2500);
  }

  const arr = [...groups.values()];
  fs.writeFileSync('E:\\madmona-app\\scripts\\fb-groups.json', JSON.stringify(arr, null, 1), 'utf8');
  console.log('\nGROUPS:', arr.length);
  arr.slice(0, 30).forEach(g => console.log(' ·', g.name, '=>', g.id));
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
