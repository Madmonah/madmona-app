// نشر ريل على إنستجرام من كروم السوشيال (CDP 9223) — واجهة ٢٠٢٦: Create → Post → Select from computer
const { chromium } = require('E:/madmona-app/node_modules/playwright');
const fs = require('fs');
const MP4 = process.argv[2]; const CAP = fs.readFileSync(process.argv[3], 'utf8');
const DIAG = 'E:/madmona-app/scripts/reels/playwright/diag/ig-manual/'; fs.mkdirSync(DIAG, { recursive: true });
const shot = async (page, n) => { await page.screenshot({ path: DIAG + n + '.png' }).catch(() => {}); console.log('[shot]', n); };
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find((p) => p.url().includes('instagram.com')) || await ctx.newPage();
  await page.bringToFront();
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  for (const t of ['Not Now', 'Not now', 'Cancel']) { const b = page.locator(`button:has-text("${t}")`).first(); if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(600); } }
  // Create في السايدبار
  const create = page.locator('a[href="#"]:has-text("Create")').first();
  await create.click({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await shot(page, '01-menu');
  // عنصر «Post» في القايمة — نص مطابق بالظبط، وآخر عنصر ظهر (القايمة فوق السايدبار)
  const postItems = page.getByText('Post', { exact: true });
  const n = await postItems.count(); console.log('[ig] Post matches:', n);
  let opened = false;
  for (let i = n - 1; i >= 0 && !opened; i--) {
    const it = postItems.nth(i);
    if (!(await it.isVisible().catch(() => false))) continue;
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null),
      it.click().catch(() => {}),
    ]);
    await page.waitForTimeout(1500);
    if (chooser) { await chooser.setFiles(MP4); console.log('[ig] file via chooser (direct)'); opened = true; break; }
    const sel = page.getByText('Select from computer', { exact: false }).first();
    if (await sel.count()) {
      const [ch2] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), sel.click().catch(() => {})]);
      if (ch2) { await ch2.setFiles(MP4); console.log('[ig] file via chooser'); opened = true; break; }
      const input = page.locator('input[type="file"]').first();
      if (await input.count()) { await input.setInputFiles(MP4); console.log('[ig] file via input'); opened = true; break; }
    }
  }
  await shot(page, '02-after-upload');
  if (!opened) throw new Error('create dialog لم يفتح');
  await page.waitForTimeout(6000);
  const ok = page.locator('button:has-text("OK")').first(); if (await ok.count()) { await ok.click().catch(() => {}); await page.waitForTimeout(1000); }
  for (let i = 0; i < 2; i++) {
    const next = page.getByRole('button', { name: 'Next' }).first();
    await next.waitFor({ timeout: 30000 }); await next.click(); await page.waitForTimeout(2500);
    await shot(page, `03-next-${i + 1}`);
  }
  const capBox = page.locator('div[aria-label="Write a caption..."], div[contenteditable="true"][role="textbox"]').first();
  await capBox.waitFor({ timeout: 20000 }); await capBox.click();
  await page.keyboard.insertText(CAP);
  await page.waitForTimeout(1000);
  await shot(page, '04-caption');
  const share = page.getByRole('button', { name: 'Share' }).first();
  await share.click({ timeout: 15000 });
  console.log('[ig] share clicked — waiting…');
  for (let i = 0; i < 24; i++) { await page.waitForTimeout(5000); const t = await page.locator('body').innerText().catch(() => ''); if (/has been shared|reel has been shared|تمت مشاركة/i.test(t)) { console.log('[ig] ✅ shared'); break; } if (i === 23) console.log('[ig] ⚠️ no confirmation text seen'); }
  await shot(page, '05-done');
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
