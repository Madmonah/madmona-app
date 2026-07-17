// بيشوف واتساب ويب من جوه الكروم — عبر بورت الديباج (مفيش قيود إكستنشن)
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  console.log('عدد التابات:', pages.length);
  for (const p of pages) console.log(' -', (await p.title()).slice(0, 50), '|', p.url().slice(0, 60));

  const wa = pages.find((p) => p.url().includes('web.whatsapp.com'));
  if (!wa) { console.log('❌ واتساب ويب مش مفتوح'); process.exit(1); }

  await wa.bringToFront();
  const state = await wa.evaluate(() => ({
    عنوان: document.title,
    فيه_شاتات: !!document.querySelector('[aria-label="Chat list"], [data-testid="chat-list"], #pane-side'),
    عدد_الصفوف: document.querySelectorAll('#pane-side [role="listitem"]').length,
    فيه_QR: !!document.querySelector('canvas[aria-label*="scan"], [data-testid="qrcode"]'),
    نص: document.body.innerText.slice(0, 300),
  }));
  console.log(JSON.stringify(state, null, 1));
})();
