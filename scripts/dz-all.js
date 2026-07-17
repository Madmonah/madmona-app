// 📞 كل أرقام فيلات الإيجار اليومي — بيدوس Call على كل إعلان ويقرا الـpopup
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'E:\\madmona-app\\scripts\\villa-phones.json';
const LOG = 'E:\\madmona-app\\scripts\\dz-all.log';
const log = m => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };

const LISTS = [
  'https://www.dubizzle.com.eg/en/properties/villas-for-rent/new-cairo/q-villas-for-daily-rent/',
  'https://www.dubizzle.com.eg/en/properties/villas-for-rent/cairo/q-villas-for-daily-rent/',
  'https://www.dubizzle.com.eg/en/properties/villas-for-rent/cairo/q-villas-for-daily-rent/?page=2',
];

const TAG = /5th settlement|fifth|new cairo|katameya|mivida|hyde park|festival|guezira|lake view|concord|madinaty|rehab|التجمع|القاهرة الجديدة|قطامية|مدينتي|الرحاب/i;

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(45000);

  const seen = new Map();

  for (const L of LISTS) {
    try {
      await page.goto(L, { waitUntil: 'domcontentloaded' });
      await sleep(5500);
      for (let i = 0; i < 14; i++) { await page.evaluate(() => window.scrollBy(0, 2200)); await sleep(1300); }

      const n = await page.evaluate(() =>
        [...document.querySelectorAll('button')].filter(x => /^call$/i.test((x.innerText || '').trim())).length);
      log(`--- ${L.slice(50, 95)} · ${n} Call buttons`);

      for (let i = 0; i < n; i++) {
        try {
          // معلومات الكارت
          const card = await page.evaluate((idx) => {
            const btn = [...document.querySelectorAll('button')]
              .filter(x => /^call$/i.test((x.innerText || '').trim()))[idx];
            if (!btn) return null;
            const c = btn.closest('li, article, div[class]')?.parentElement?.closest('li, article, div[class]') || btn.closest('div[class]');
            const txt = (c ? c.innerText : '').slice(0, 400).replace(/\n/g, ' | ');
            const a = c ? c.querySelector('a[href*="/ad/"]') : null;
            btn.scrollIntoView({ block: 'center' });
            btn.click();
            return { txt, url: a ? a.href.split('?')[0] : '' };
          }, i);
          if (!card) continue;
          await sleep(2200);

          const pop = await page.evaluate(() => {
            const t = document.body.innerText;
            const norm = t.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48));
            const m = norm.match(/Contact Us\s*\n\s*([^\n]+)\s*\n\s*\+?20-?(1[0125]\d{8})/i);
            if (m) return { seller: m[1].trim(), phone: '0' + m[2] };
            const p = norm.match(/\+?20-?(1[0125]\d{8})/);
            return p ? { seller: '', phone: '0' + p[1] } : null;
          });

          // اقفل الـpopup
          await page.evaluate(() => {
            const x = [...document.querySelectorAll('button,div[role="button"]')]
              .find(e => /close/i.test(e.getAttribute('aria-label') || '') || e.innerText.trim() === '✕');
            if (x) x.click();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          }).catch(() => {});
          await page.keyboard.press('Escape').catch(() => {});
          await sleep(700);

          if (!pop || seen.has(pop.phone)) continue;
          const pm = card.txt.match(/EGP\s*([\d,]+)/);
          seen.set(pop.phone, {
            phone: pop.phone, seller: pop.seller,
            price: pm ? Number(pm[1].replace(/,/g, '')) : null,
            title: (card.txt.split(' | ').find(s => s.length > 25) || card.txt).slice(0, 100),
            tagamoa: TAG.test(card.txt) || TAG.test(card.url),
            url: card.url,
          });
          log(`  ${seen.size}. ${pop.phone} · ${pop.seller || '?'} · ${pm ? pm[1] : '?'} ج`);
          fs.writeFileSync(OUT, JSON.stringify([...seen.values()], null, 1), 'utf8');
        } catch (e) { /* skip */ }
      }
    } catch (e) { log('ERR ' + String(e.message).slice(0, 60)); }
  }

  const all = [...seen.values()];
  log(`\nDONE total=${all.length} · tagamoa=${all.filter(x => x.tagamoa).length}`);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1), 'utf8');
  await page.close().catch(() => {});
  b.disconnect();
})().catch(e => log('FATAL ' + e.message));
