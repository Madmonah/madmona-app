const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  const phone = process.argv[2];
  const res = await page.evaluate((ph) => {
    const arts = [...document.querySelectorAll('[role="article"]')];
    const idx = arts.findIndex(a => (a.innerText||'').replace(/\D/g,'').includes(ph.slice(1)));
    if (idx === -1) return 'target not found';
    // اطبع الكومنت + الـ2 بعده
    return arts.slice(idx, idx+3).map((a,i)=> `[${i}] ` + (a.innerText||'').slice(0,160).replace(/\n/g,' | ')).join('\n');
  }, phone);
  console.log(res);
  b.disconnect();
})();
