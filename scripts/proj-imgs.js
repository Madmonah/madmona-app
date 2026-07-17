// 🖼️ يجيب صور المشاريع الحقيقية من جوجل صور
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\proj-imgs.json';
const LOG = 'E:\\madmona-app\\scripts\\proj-imgs.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const PROJECTS = JSON.parse(fs.readFileSync('E:\\madmona-app\\scripts\\proj-list.json', 'utf8'));

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(35000);

  const out = [];
  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i];
    const q = `${p.title} ${p.developer || ''} compound egypt`.replace(/\s+/g, ' ').trim();
    try {
      await page.goto('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded' });
      await sleep(2600);
      const imgs = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('img').forEach(im => {
          const s = im.src || '';
          if (!/^https?:/.test(s)) return;
          if (im.naturalWidth < 120 || im.naturalHeight < 90) return;
          if (/google|gstatic\.com\/ui|logo/i.test(s) && !/encrypted-tbn/.test(s)) return;
          out.push(s);
        });
        return out.slice(0, 6);
      }).catch(() => []);
      out.push({ ...p, query: q, candidates: imgs });
      log(`${i + 1}/${PROJECTS.length} ${p.title} -> ${imgs.length} imgs`);
    } catch (e) {
      out.push({ ...p, query: q, candidates: [] });
      log(`${i + 1} ERR ${p.title}: ${String(e.message).slice(0, 40)}`);
    }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
    await sleep(1200);
  }
  log(`\nDONE ${out.length} · with imgs ${out.filter(x => x.candidates.length).length}`);
  await page.close().catch(() => {});
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
