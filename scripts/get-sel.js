const puppeteer = require('puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => /sheet\.html/.test(p.url()));
  if (!page) { console.log('sheet.html tab not found'); b.disconnect(); return; }

  const sel = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.c.sel').forEach(c => { out[c.dataset.id] = c.dataset.src; });
    return out;
  });
  fs.writeFileSync('E:\\madmona-app\\scripts\\selected.json', JSON.stringify(sel, null, 1), 'utf8');
  console.log('SELECTED:', Object.keys(sel).length);
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
