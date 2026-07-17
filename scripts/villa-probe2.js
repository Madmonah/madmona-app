const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(35000);
  await page.goto('https://www.dubizzle.com.eg/en/properties/villas-for-rent/cairo/', { waitUntil: 'domcontentloaded' });
  await sleep(5000);

  const info = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')]
      .map(a => ({ href: a.getAttribute('href') || '', txt: (a.innerText || '').trim() }))
      .filter(l => /villas-for-rent/.test(l.href) && l.txt);
    return {
      url: location.href,
      locationLinks: links.filter(l => /new-cairo|tagamo|قاهرة|تجمع|5th|fifth/i.test(l.href + l.txt)),
      allSubLocations: links.slice(0, 60),
    };
  });
  fs.writeFileSync('E:\\madmona-app\\scripts\\villa-probe2.json', JSON.stringify(info, null, 2), 'utf8');
  console.log('URL:', info.url);
  console.log('--- NEW CAIRO ---');
  info.locationLinks.forEach(l => console.log(' ·', l.txt, '=>', l.href));
  await page.close();
})();
