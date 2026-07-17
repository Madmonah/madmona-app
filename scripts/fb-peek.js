// بيبص على التاب المفتوح من غير ما ينافيجيت — عشان نشوف هو واقف فين
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  for (const p of pages) {
    const u = p.url();
    if (!/facebook/.test(u)) continue;
    const r = await p.evaluate(() => {
      const body = document.body.innerText;
      const norm = body.replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48));
      return {
        articles: document.querySelectorAll('div[role="article"]').length,
        len: body.length,
        phones: [...new Set(norm.match(/01[0125]\d{8}/g) || [])],
        head: body.slice(0, 300).replace(/\n/g, ' | '),
      };
    }).catch(e => ({ err: e.message }));
    console.log('URL:', u);
    console.log(JSON.stringify(r, null, 1).slice(0, 1500));
    await p.screenshot({ path: 'E:\\madmona-app\\scripts\\fb-peek.png' }).catch(() => {});
  }
  b.disconnect();
})().catch(e => console.log('ERR', e.message));
