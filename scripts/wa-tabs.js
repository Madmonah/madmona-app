const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  for (const p of pages) console.log(p.url().slice(0, 90));
  b.disconnect();
})();
