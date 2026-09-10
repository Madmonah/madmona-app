// لقطة من ريل HTML عند ثانية معيّنة (من غير CDP — كروم مستقل)
const { chromium } = require('playwright');
(async () => {
  const [slug, at] = [process.argv[2], Number(process.argv[3] || 14)];
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 540, height: 960 } })).newPage();
  await p.goto('file:///E:/madmona-app/scripts/reels/playwright/reels/reel-' + slug + '.html', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.evaluate(() => { if (window.__replay) window.__replay() });
  await p.waitForTimeout(at * 1000);
  await p.screenshot({ path: 'output/_prev_' + slug + '_' + at + '.png' });
  await b.close(); console.log('ok');
})().catch(e => console.log('ERR', e.message));
