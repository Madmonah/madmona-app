const puppeteer = require('puppeteer-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1500, height: 950 });
  await page.goto('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent('Marassi Emaar Misr compound egypt'), { waitUntil: 'domcontentloaded' });
  await sleep(3500);

  const r = await page.evaluate(() => {
    // (أ) لينكات imgres — فيها imgurl الأصلي
    const imgres = [...document.querySelectorAll('a[href*="/imgres?"]')]
      .map(a => { try { return new URL(a.href).searchParams.get('imgurl'); } catch { return null; } })
      .filter(Boolean);
    // (ب) أي روابط صور جوّه سكريبتات الصفحة
    const html = document.documentElement.innerHTML;
    const inline = [...new Set((html.match(/https?:\/\/[^"'\\ ]+\.(?:jpg|jpeg|png|webp)/gi) || []))]
      .filter(u => !/gstatic|google/.test(u)).slice(0, 8);
    return { imgresCount: imgres.length, imgres: imgres.slice(0, 6), inline };
  });
  console.log(JSON.stringify(r, null, 1));
  await page.close();
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
