const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const p = pages.find((x) => x.url().includes('web.whatsapp.com'));
  if (!p) return console.log('❌ التاب مش موجود');
  await sleep(4000);
  console.log(JSON.stringify(await p.evaluate(() => ({
    شاتات: document.querySelectorAll('#pane-side [role="listitem"]').length,
    QR: !!document.querySelector('canvas'),
    نص: document.body.innerText.replace(/\n+/g, ' | ').slice(0, 400),
  })), null, 1));
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(0);
})();
