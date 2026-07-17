// 🖼️ يجيب النسخة الأصلية (full-res) لكل صورة مختارة من جوجل
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = 'E:\\madmona-app\\scripts\\';
const OUT = S + 'hires.json';
const LOG = S + 'hires.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const sel = JSON.parse(fs.readFileSync(S + 'selected.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync(S + 'proj-list.json', 'utf8'));
const byId = Object.fromEntries(projects.map(p => [p.id, p]));

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1500, height: 950 });
  page.setDefaultNavigationTimeout(35000);

  const out = [];
  for (let i = 0; i < sel.length; i++) {
    const s = sel[i];
    const p = byId[s.id];
    if (!p) continue;
    const q = `${p.title} ${p.developer || ''} compound egypt`.replace(/\s+/g, ' ').trim();
    try {
      await page.goto('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded' });
      await sleep(2600);

      // ندوس على نفس الصورة اللي محمد اختارها
      const clicked = await page.evaluate((src) => {
        const im = [...document.querySelectorAll('img')].find(x => x.src === src);
        if (!im) return false;
        (im.closest('a') || im).click();
        return true;
      }, s.url);
      if (!clicked) { log(`${i + 1} ${p.title} · thumb not found`); out.push({ ...s, hires: null }); continue; }

      await sleep(3200);

      // الصورة الكبيرة في اللوحة الجانبية
      const big = await page.evaluate(() => {
        const cands = [...document.querySelectorAll('img')]
          .filter(im => /^https?:/.test(im.src)
            && !/gstatic\.com\/images\?q=tbn/.test(im.src)   // مش thumbnail
            && !/\/logos?\//i.test(im.src)
            && im.naturalWidth >= 600)
          .sort((a, c) => (c.naturalWidth * c.naturalHeight) - (a.naturalWidth * a.naturalHeight));
        return cands[0] ? { src: cands[0].src, w: cands[0].naturalWidth, h: cands[0].naturalHeight } : null;
      });

      out.push({ ...s, title: p.title, hires: big ? big.src : null, w: big?.w, h: big?.h });
      log(`${i + 1}/${sel.length} ${p.title} · ${big ? big.w + 'x' + big.h : '❌ no hires'}`);
    } catch (e) {
      out.push({ ...s, hires: null });
      log(`${i + 1} ERR ${p.title}: ${String(e.message).slice(0, 40)}`);
    }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
    await sleep(900);
  }
  const ok = out.filter(x => x.hires).length;
  log(`\nDONE ${out.length} · hires ${ok} · failed ${out.length - ok}`);
  await page.close().catch(() => {});
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
