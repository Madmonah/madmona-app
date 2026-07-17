const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => /facebook\.com/.test(p.url())) || await b.newPage();

  const q = 'فيلا للايجار اليومي التجمع الخامس';
  await page.goto('https://www.facebook.com/search/posts?q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded' });
  await sleep(9000);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: 2800 }).catch(() => {}); await sleep(2500); }

  const r = await page.evaluate(() => {
    const arts = [...document.querySelectorAll('div[role="article"]')];
    const body = document.body.innerText;
    const phonesOnPage = [...new Set(body.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48)).match(/01[0125]\d{8}/g) || [])];
    return {
      url: location.href,
      articles: arts.length,
      bodyLen: body.length,
      phonesOnPage,
      sampleArticle: arts[0] ? arts[0].innerText.slice(0, 500) : '(none)',
      bodyHead: body.slice(0, 400),
    };
  });
  console.log('URL:', r.url);
  console.log('ARTICLES:', r.articles, '| BODY LEN:', r.bodyLen);
  console.log('PHONES ON PAGE:', r.phonesOnPage.length, r.phonesOnPage.slice(0, 10));
  console.log('\n--- BODY HEAD ---\n' + r.bodyHead);
  console.log('\n--- SAMPLE ARTICLE ---\n' + r.sampleArticle);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\fb-dbg.png' });
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
