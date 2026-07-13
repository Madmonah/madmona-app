const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  for (const p of pages) {
    const u = p.url();
    if (u.includes('dubizzle')) {
      const t = await p.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n/g, ' | ')).catch(() => 'ERR');
      console.log('URL:', u.slice(0, 80));
      console.log('TXT:', t);
    }
  }
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
