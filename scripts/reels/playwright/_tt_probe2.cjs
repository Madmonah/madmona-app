const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = b.contexts()[0];
  const page = ctx.pages().find(p => /tiktokstudio\/upload/.test(p.url())) || await ctx.newPage();
  await page.goto('https://www.tiktok.com/tiktokstudio/upload', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => console.log('goto', e.message));
  await page.waitForTimeout(15000);
  const info = await page.evaluate(() => ({ url: location.href, inputs: document.querySelectorAll('input[type=file]').length, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 500) }));
  console.log(JSON.stringify(info));
  await page.screenshot({ path: 'output/_tt_state.png' }).catch(() => {});
  await b.close();
})().catch(e => console.log('ERR', e.message));
