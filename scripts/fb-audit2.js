const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  const phones = process.argv.slice(2);
  const res = await page.evaluate((phs) => {
    const arts = [...document.querySelectorAll('[role="article"]')];
    const txts = arts.map(a => a.innerText || '');
    const out = {};
    for (const ph of phs) {
      let replied = 0, occ = 0;
      for (let i = 0; i < txts.length; i++) {
        if (!txts[i].replace(/\D/g, '').includes(ph.slice(1))) continue;
        if (/01002229982/.test(txts[i])) continue; // ده ردنا مش كومنته
        occ++;
        const w = txts.slice(i + 1, i + 4).join(' ');
        if (/01002229982/.test(w)) replied++;
      }
      out[ph] = { occurrences: occ, replied, verdict: replied > 0 ? 'HAS_REPLY ✅' : 'NEEDS_REPLY ❌' };
    }
    return out;
  }, phones);
  console.log(JSON.stringify(res, null, 1));
  b.disconnect();
})();
