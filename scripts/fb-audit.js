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
      const i = txts.findIndex(t => t.replace(/\D/g, '').includes(ph.slice(1)));
      if (i === -1) { out[ph] = 'COMMENT_NOT_FOUND'; continue; }
      // شوف الـ3 اللي بعده فيهم رد بتاعنا فيه رقم المارد
      const window = txts.slice(i + 1, i + 4).join(' ');
      out[ph] = /01002229982/.test(window) ? 'REPLY_LIVE ✅' : 'NO_REPLY ❌';
    }
    return out;
  }, phones);
  console.log(JSON.stringify(res, null, 1));
  b.disconnect();
})();
