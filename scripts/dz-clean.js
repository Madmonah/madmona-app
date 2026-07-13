const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  let closed = 0;
  for (const p of pages) {
    const u = p.url();
    if (u.includes('dubizzle') || u.startsWith('chrome-error')) { await p.close().catch(() => {}); closed++; }
  }
  console.log('closed', closed, 'remaining', (await b.pages()).length);
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
