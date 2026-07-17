const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(45000);
  await page.goto('https://www.dubizzle.com.eg/en/properties/villas-for-rent/cairo/q-villas-for-daily-rent/', { waitUntil: 'domcontentloaded' });
  await sleep(6000);
  await page.evaluate(() => window.scrollBy(0, 1500)); await sleep(2500);

  const r = await page.evaluate(() => {
    const anchors = [...document.querySelectorAll('a')];
    const tels = anchors.filter(a => /^tel:/i.test(a.getAttribute('href') || '')).map(a => a.getAttribute('href'));
    const was = anchors.filter(a => /wa\.me|whatsapp/i.test(a.getAttribute('href') || '')).map(a => a.getAttribute('href'));
    // أزرار Call/WhatsApp: نشوف هي إيه بالظبط
    const callBtns = [...document.querySelectorAll('button, div[role="button"], a')]
      .filter(x => /^(call|whatsapp)$/i.test((x.innerText || '').trim()))
      .slice(0, 4)
      .map(x => ({ tag: x.tagName, text: x.innerText.trim(), href: x.getAttribute('href'), html: x.outerHTML.slice(0, 220) }));
    return { telCount: tels.length, tels: tels.slice(0, 5), waCount: was.length, was: was.slice(0, 5), callBtns };
  });
  console.log(JSON.stringify(r, null, 1));

  // نجرب نضغط أول زرار Call ونشوف بيحصل ايه
  const before = await page.evaluate(() => document.body.innerText.length);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, div[role="button"], a')]
      .find(x => /^call$/i.test((x.innerText || '').trim()));
    if (btn) btn.click();
  });
  await sleep(4000);
  const after = await page.evaluate(() => {
    const t = document.body.innerText;
    const norm = t.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48));
    return { phones: [...new Set(norm.match(/01[0125]\d{8}/g) || [])], tail: t.slice(-400).replace(/\n/g, ' | ') };
  });
  console.log('AFTER CLICK phones:', after.phones);
  console.log('TAIL:', after.tail.slice(0, 300));
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\dz-probe3.png' });
  await page.close();
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
