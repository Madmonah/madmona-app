const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  if (!page) { console.log('NO PAGE'); return b.disconnect(); }
  await page.bringToFront();
  const ph = process.argv[2];
  const found = await page.evaluate((p) => {
    const arts = [...document.querySelectorAll('[role="article"]')];
    const t = arts.find(a => (a.innerText||'').replace(/\D/g,'').includes(p.slice(1)));
    if (!t) return false;
    t.scrollIntoView({ block: 'center' });
    return true;
  }, ph);
  console.log('found=', found);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\fb-shot.png' });
  console.log('shot saved');
  b.disconnect();
})();
