// تحقق الزائر: ريل فيسبوك (من كروم السوشيال — مش مسجّل فيسبوك) + آخر ريل إنستجرام لـ@madmona.cairo
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = b.contexts()[0]; const page = await ctx.newPage();
  const out = {};
  await page.goto('https://www.facebook.com/reel/1083839384013044', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(8000);
  out.fb = await page.evaluate(() => ({ captionVisible: /عيادتك بتشتغل/.test(document.body.innerText), comments: (document.body.innerText.match(/(\d+)\s*comments?/i) || [])[1] || null, unavailable: /isn't available|not available/i.test(document.body.innerText) }));
  await page.goto('https://www.instagram.com/madmona.cairo/reels/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(8000);
  out.ig = await page.evaluate(() => [...document.querySelectorAll('a[href*="/reel/"]')].map(a => a.href.split('?')[0]).slice(0, 2));
  console.log(JSON.stringify(out));
  await page.close(); await b.close();
})().catch(e => console.log('ERR', e.message));
