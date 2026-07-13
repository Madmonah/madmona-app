// v5 — يقفل التاب كل 10 إعلانات (بيمنع تسريب الذاكرة اللي بيوقّف كروم)
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\leads-v5.json';
const LOG = 'E:\\madmona-app\\scripts\\dz5.log';
const URLS_F = 'E:\\madmona-app\\scripts\\dz5-urls.json';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };
const wt = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TO')), ms))]);

const BIZ = /(real\s?estate|realty|properties|property|develop|group|company|broker|remax|re\/max|coldwell|century|avalon|gate|egy\b|home|realtor|consult|invest|market|agency|llc|ltd|onyx|abrag|assets|villas|estates?|solutions|partners|capital|holding|future villa|هوم|أبراج|ابراج|اونيكس|ايه بلاس|عقار|تسويق|شركة|مجموعة|مكتب|للاستثمار)/i;
const MAX_ADS = 3;

(async () => {
  const urls = JSON.parse(fs.readFileSync(URLS_F, 'utf8'));
  const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
  const doneUrls = new Set(done.map(d => d.url));
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  const leads = [...done];
  let page = null, cnt = 0;

  for (const a of urls) {
    if (doneUrls.has(a.href)) continue;
    if (!page || cnt % 10 === 0) {
      if (page) await page.close().catch(() => {});
      page = await b.newPage();
      page.setDefaultNavigationTimeout(22000);
      log(`--- new tab (done ${cnt}/${urls.length}, leads ${leads.length}) ---`);
    }
    cnt++;
    try {
      await wt(page.goto(a.href, { waitUntil: 'domcontentloaded' }), 22000);
      await sleep(1300);
      const meta = await wt(page.evaluate(() => {
        const t = document.body.innerText;
        const nm = t.match(/Posted by\s*\n?\s*([^\n]{2,60})/i);
        const ac = t.match(/Active Ads\s*\n?\s*(\d+)/i);
        const ttl = t.match(/EGP\s*[\d,]+[\s\S]{0,220}?\n([^\n]{20,110})\n/);
        return { seller: (nm ? nm[1] : '').trim(), activeAds: ac ? +ac[1] : 999,
          isBiz: /Verified Business/i.test(t), title: (ttl ? ttl[1] : '').trim() };
      }), 10000);

      const why = !meta.seller ? 'no-name' : meta.isBiz ? 'biz' : BIZ.test(meta.seller) ? 'biz-name'
        : meta.activeAds > MAX_ADS ? `ads=${meta.activeAds}` : null;
      if (why) { log(`✗ ${meta.seller || '?'} (${why})`); continue; }

      await wt(page.evaluate(() => {
        const btn = [...document.querySelectorAll('button,[role="button"]')].find(e => /Show Phone Number|إظهار رقم/i.test(e.innerText || ''));
        if (btn) btn.click();
      }), 6000).catch(() => {});
      await sleep(2100);
      const phone = await wt(page.evaluate(() => {
        const tel = document.querySelector('a[href^="tel:"]');
        if (tel) return tel.href.replace('tel:', '').replace(/\D/g, '');
        const m = document.body.innerText.match(/(01[0125]\d{8})/);
        return m ? m[1] : '';
      }), 6000).catch(() => '');

      if (phone) {
        leads.push({ name: meta.seller, phone, price_m: +(a.price / 1e6).toFixed(1), kind: a.tag,
          activeAds: meta.activeAds, title: meta.title, url: a.href });
        log(`✅ ${meta.seller} | ${phone} | ${(a.price / 1e6).toFixed(1)}M | ads=${meta.activeAds}`);
        fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
      }
    } catch (e) { log(`ERR ${String(e.message).slice(0, 25)}`); }
    await sleep(600);
  }
  fs.writeFileSync(OUT, JSON.stringify(leads, null, 1));
  log(`DONE leads=${leads.length}`);
  if (page) await page.close().catch(() => {});
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
