const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, locale: 'ar-EG' })).newPage();
  await p.goto('https://www.madmonacairo.com/pro', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'output/_pro_full.png', fullPage: true });
  const d = await p.evaluate(() => ({ h: document.body.scrollHeight, errs: 0 }));
  console.log(JSON.stringify(d));
  await b.close();
})().catch(e => console.log('ERR', e.message));
