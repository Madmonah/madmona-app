// يفضّل الـQR قدام ومتجدّد لحد ما محمد يمسحه
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const p = pages.find((x) => x.url().includes('web.whatsapp.com')) || (await b.newPage());
  if (!p.url().includes('web.whatsapp.com')) await p.goto('https://web.whatsapp.com');
  await p.bringToFront();
  // استنى لحد ما يسجّل دخول (10 دقايق)
  for (let i = 0; i < 60; i++) {
    await sleep(10000);
    const n = await p.evaluate(() => document.querySelectorAll('#pane-side [role="listitem"]').length).catch(() => 0);
    if (n > 0) { console.log('✅ اتسجّل الدخول — عدد الشاتات:', n); return; }
  }
  console.log('⏳ لسه مستني المسح');
})();
