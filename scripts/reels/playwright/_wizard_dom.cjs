const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 412, height: 900 }, locale: 'ar-EG' })).newPage();
  await p.goto('https://www.madmonacairo.com/add-listing?track=products', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(7000);
  const info = await p.evaluate(() => ({
    url: location.href,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400),
    buttons: [...document.querySelectorAll('button')].map(b => (b.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 40),
    inputs: [...document.querySelectorAll('input,textarea,select')].map(i => `${i.tagName}:${i.getAttribute('type')||''}:${i.getAttribute('placeholder')||i.getAttribute('name')||''}`).slice(0, 20),
  }));
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})().catch(e => console.log('ERR', e.message));
