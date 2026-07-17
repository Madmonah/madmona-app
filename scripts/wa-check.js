// فحص سريع: واتساب ويب مسجّل دخول في كروم الديباج ولا لسه؟
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const p = pages.find((x) => x.url().includes('web.whatsapp.com'));
  if (!p) return console.log('❌ التاب اتقفل');
  const s = await p.evaluate(() => ({
    شاتات: document.querySelectorAll('#pane-side [role="listitem"]').length,
    فيه_QR: !!document.querySelector('canvas'),
  }));
  console.log(JSON.stringify(s));
  process.exit(0);
})();
