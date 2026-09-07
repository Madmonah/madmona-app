// نشر ريل على فيسبوك من كروم السوشيال (CDP 9223) — /reel/create بقت 404 (٧/٩) فبنمشي من الهوم: Reel → Add video → Next → Next → Publish
const { chromium } = require('E:/madmona-app/node_modules/playwright');
const fs = require('fs');
const MP4 = process.argv[2]; const CAP = fs.readFileSync(process.argv[3], 'utf8');
const DIAG = 'E:/madmona-app/scripts/reels/playwright/diag/fb-manual/'; fs.mkdirSync(DIAG, { recursive: true });
const shot = async (page, n) => { await page.screenshot({ path: DIAG + n + '.png' }).catch(() => {}); console.log('[shot]', n); };
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find((p) => p.url().includes('facebook.com')) || await ctx.newPage();
  await page.bringToFront();
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await shot(page, '00-home');
  // زرار Reel في الكومبوزر (أو من قايمة Create في الهيدر)
  let reelBtn = page.locator('div[role="button"]:has-text("Reel"), a[role="link"]:has-text("Reel")').filter({ hasNotText: 'Reels' }).first();
  if (!(await reelBtn.count())) {
    const createBtn = page.locator('div[aria-label="Create"], div[role="button"][aria-label*="Create"]').first();
    if (await createBtn.count()) { await createBtn.click(); await page.waitForTimeout(1200); }
    reelBtn = page.locator('div[role="menuitem"]:has-text("Reel"), span:text-is("Reel")').first();
  }
  await reelBtn.click({ timeout: 15000 });
  await page.waitForTimeout(4000);
  await shot(page, '01-after-reel');
  // Add video → file chooser
  const addVideo = page.locator('div[role="button"]:has-text("Add video"), div[role="button"]:has-text("Add Video")').first();
  let chooser = null;
  if (await addVideo.count()) {
    [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), addVideo.click().catch(() => {})]);
  }
  if (chooser) { await chooser.setFiles(MP4); console.log('[fb] file via chooser'); }
  else { const input = page.locator('input[type="file"][accept*="video"], input[type="file"]').first(); await input.waitFor({ state: 'attached', timeout: 15000 }); await input.setInputFiles(MP4); console.log('[fb] file via input'); }
  await page.waitForTimeout(8000);
  await shot(page, '02-after-upload');
  for (let i = 0; i < 2; i++) {
    const next = page.locator('div[role="button"][aria-label="Next"], div[role="button"]:has-text("Next")').first();
    if (!(await next.count())) break;
    await next.click({ timeout: 20000 }); await page.waitForTimeout(3000);
    await shot(page, `03-next-${i + 1}`);
  }
  const capBox = page.locator('div[contenteditable="true"][role="textbox"]').first();
  await capBox.waitFor({ timeout: 20000 }); await capBox.click();
  await page.keyboard.insertText(CAP);
  await page.waitForTimeout(1500);
  await shot(page, '04-caption');
  const publish = page.locator('div[role="button"][aria-label="Publish"], div[role="button"]:has-text("Publish")').first();
  await publish.waitFor({ timeout: 20000 });
  // بعد الرفع الزرار بيبقى مفعّل — نستنى لحد ما مايبقاش disabled
  for (let i = 0; i < 24; i++) { const dis = await publish.getAttribute('aria-disabled'); if (dis !== 'true') break; await page.waitForTimeout(5000); }
  await publish.click({ timeout: 15000 });
  console.log('[fb] publish clicked — waiting…');
  await page.waitForTimeout(15000);
  await shot(page, '05-done');
  console.log('[fb] url:', page.url());
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
