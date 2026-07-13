const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.goto('https://www.dubizzle.com.eg/en/ad/villa-stand-alone-for-sale-marina-second-row-lake-1200-m-ID503741148.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(5000);

  const info = await page.evaluate(() => {
    const txt = document.body.innerText;
    const btns = [...document.querySelectorAll('button, a[href^="tel:"], [role="button"]')]
      .map(e => (e.innerText || e.getAttribute('aria-label') || e.getAttribute('href') || '').trim())
      .filter(s => s && s.length < 40).slice(0, 25);
    const tel = [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.href);
    const wa = [...document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]')].map(a => a.href);
    // اسم البايع
    const seller = txt.match(/(?:Posted by|Member since|Seller)[\s\S]{0,120}/)?.[0] || '';
    return { btns, tel, wa, seller: seller.replace(/\n/g, ' | '), hasBusiness: /Verified Business/i.test(txt), snippet: txt.slice(0, 400).replace(/\n/g, ' | ') };
  });
  console.log(JSON.stringify(info, null, 1));
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
