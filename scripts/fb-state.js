const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  for (const p of pages) {
    let n = 0, txt = '';
    try { n = await p.evaluate(() => document.querySelectorAll('[role="article"]').length); } catch {}
    try { txt = await p.evaluate(() => document.body.innerText.slice(0, 90).replace(/\n/g, ' ')); } catch {}
    console.log(p.url().slice(0, 75), '| arts=' + n, '|', txt);
  }
  b.disconnect();
})();
