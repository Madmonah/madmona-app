// 🖼️ يسحب لينكات الصور الأصلية (full-res) من HTML صفحة جوجل صور
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = 'E:\\madmona-app\\scripts\\';
const OUT = S + 'hires.json';
const LOG = S + 'hires.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const projects = JSON.parse(fs.readFileSync(S + 'proj-list.json', 'utf8'));

// مصادر موثوقة بالترتيب (موقع المطوّر الرسمي أولاً)
const GOOD = /(?:emaarmisr|sodic|mountainview|palmhills|talaatmoustafa|misritalia|hydepark|oradevelopers|lavista|tatweermisr|inertia|hassanallam|almarasem|madinetnasr|equinox|upwyde|samco|kulture|newplan|njd|preegypt|vie|roya|elhazek|alfath)\.[a-z.]+\/.*\.(?:jpg|jpeg|png|webp)/i;
const OKAY = /\.(?:jpg|jpeg|png|webp)(?:\?|$)/i;
const BAD = /(logo|icon|avatar|favicon|placeholder|thumb|sprite|1x1|\/ads?\/|whatsapp|facebook|instagram)/i;

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1500, height: 950 });
  page.setDefaultNavigationTimeout(35000);

  const out = [];
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const q = `${p.title} ${p.developer || ''} compound egypt`.replace(/\s+/g, ' ').trim();
    try {
      await page.goto('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded' });
      await sleep(2800);
      await page.evaluate(() => window.scrollBy(0, 800));
      await sleep(1200);

      const urls = await page.evaluate(() => {
        const html = document.documentElement.innerHTML;
        const raw = html.match(/https?:\\?\/\\?\/[^"'\\ )]+?\.(?:jpg|jpeg|png|webp)/gi) || [];
        return [...new Set(raw.map(u => u.replace(/\\\//g, '/')))];
      }).catch(() => []);

      const clean = urls
        .filter(u => !/gstatic|googleusercontent|google\.com/.test(u))
        .filter(u => OKAY.test(u) && !BAD.test(u));

      // الأفضلية لموقع المطوّر الرسمي
      const official = clean.filter(u => GOOD.test(u));
      const pick = official.slice(0, 4).concat(clean.filter(u => !GOOD.test(u)).slice(0, 4));

      out.push({ id: p.id, title: p.title, developer: p.developer, candidates: pick.slice(0, 6) });
      log(`${i + 1}/${projects.length} ${p.title} · ${official.length} رسمي · ${clean.length} إجمالي`);
    } catch (e) {
      out.push({ id: p.id, title: p.title, developer: p.developer, candidates: [] });
      log(`${i + 1} ERR ${p.title}: ${String(e.message).slice(0, 40)}`);
    }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
    await sleep(900);
  }
  log(`\nDONE ${out.length} · with candidates ${out.filter(x => x.candidates.length).length}`);
  await page.close().catch(() => {});
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
