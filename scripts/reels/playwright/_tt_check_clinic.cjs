const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = b.contexts()[0]; const page = await ctx.newPage();
  await page.goto('https://www.tiktok.com/tiktokstudio/content', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(12000);
  const info = await page.evaluate(() => ({ url: location.href, first: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400), hasClinic: /عيادتك بتشتغل/.test(document.body.innerText), links: [...document.querySelectorAll('a[href*="/video/"]')].map(a => a.href).slice(0, 2) }));
  console.log(JSON.stringify(info));
  await page.close(); await b.close();
})().catch(e => console.log('ERR', e.message));
