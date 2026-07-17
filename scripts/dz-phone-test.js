const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(40000);

  const url = 'https://www.dubizzle.com.eg/en/ad/4-bedrooms-full-furnished-villa-super-lux-for-rent-in-5th-settlement-at-new-cairo-behind-concord-plaza-ID501722691.html';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(4000);

  // ندوّر على زرار إظهار الرقم
  const clicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, a, div[role="button"]')];
    const hit = btns.find(x => /show phone|أظهر الرقم|إظهار الرقم|show number|call/i.test(x.innerText || ''));
    if (hit) { hit.click(); return hit.innerText.slice(0, 40); }
    return null;
  });
  console.log('CLICKED:', clicked || '(no button found)');
  await sleep(4500);

  const r = await page.evaluate(() => {
    const t = document.body.innerText;
    const norm = t.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48));
    return {
      phones: [...new Set(norm.match(/(?:\+?20)?01[0125]\d{8}/g) || [])],
      needsLogin: /log in|sign in|تسجيل الدخول/i.test(t),
      buttons: [...document.querySelectorAll('button,div[role="button"]')].map(x => (x.innerText || '').trim()).filter(Boolean).slice(0, 25),
    };
  });
  console.log('PHONES:', r.phones);
  console.log('NEEDS LOGIN?', r.needsLogin);
  console.log('BUTTONS:', r.buttons.join(' | '));
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\dz-phone.png' });
  await page.close();
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
