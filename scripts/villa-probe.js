const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(35000);

  // نبدأ من صفحة البحث العامة ونشوف الروابط الحقيقية
  await page.goto('https://www.dubizzle.com.eg/en/properties/villas-for-rent/', { waitUntil: 'domcontentloaded' });
  await sleep(5000);

  const info = await page.evaluate(() => {
    const anchors = [...document.querySelectorAll('a')].map(a => a.getAttribute('href') || '').filter(Boolean);
    const adLinks = anchors.filter(h => /\/ad\/|\/en\/ad\//.test(h));
    return {
      url: location.href,
      title: document.title,
      bodyStart: document.body.innerText.slice(0, 900),
      totalAnchors: anchors.length,
      adLinks: adLinks.slice(0, 15),
      adCount: adLinks.length,
      sampleHrefs: anchors.slice(0, 40),
    };
  });
  fs.writeFileSync('E:\\madmona-app\\scripts\\villa-probe.json', JSON.stringify(info, null, 2), 'utf8');
  console.log('URL:', info.url);
  console.log('TITLE:', info.title);
  console.log('ANCHORS:', info.totalAnchors, '| AD LINKS:', info.adCount);
  console.log('--- BODY ---\n' + info.bodyStart);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\villa-probe.png' });
  await page.close();
})();
