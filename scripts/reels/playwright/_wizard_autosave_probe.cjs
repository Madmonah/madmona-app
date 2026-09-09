// إثبات الحفظ التلقائي في الويزارد: زائر يختار تصنيف ويكتب عنوان → لازم يطلع PATCH فيه title
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 412, height: 900 }, locale: 'ar-EG' }); const p = await ctx.newPage();
  const calls = [];
  p.on('request', (r) => { if (r.url().includes('/api/listing-drafts') && ['POST', 'PATCH'].includes(r.method())) { let body = null; try { body = JSON.parse(r.postData() || '{}') } catch { } calls.push({ m: r.method(), url: r.url().replace(/token=[^&]+/, 'token=…'), title: body?.title, price: body?.price, city: body?.city, step: body?.current_step }) } });
  const W = 'https://www.madmonacairo.com';
  await p.goto(W + '/add-listing?track=products', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(6000);
  // اختار أول تصنيف فرعي ظاهر (زرار فيه نص عربي غير أزرار الهيدر)
  const cat = await p.$('text=/شقق|شقة|عربيات|سيارات/');
  if (cat) { await cat.click(); await p.waitForTimeout(2500); }
  const cat2 = await p.$('text=/شقة للبيع|شقق للبيع|سيارة مستعملة|سيارة زيرو/');
  if (cat2) { await cat2.click(); await p.waitForTimeout(3000); }
  const titleInput = await p.$('input[placeholder*="عنوان"], input[name="title"], section:has-text("٢. التفاصيل") input[type="text"]');
  const out = { catClicked: !!cat, cat2Clicked: !!cat2, titleInputFound: !!titleInput };
  if (titleInput) { await titleInput.fill('شقة اختبار حفظ تلقائي ١٢٣'); await p.waitForTimeout(2500); }
  const priceInput = await p.$('section:has-text("٣. السعر") input[type="number"], input[placeholder*="السعر"]');
  out.priceInputFound = !!priceInput;
  if (priceInput) { await priceInput.fill('1500000'); await p.waitForTimeout(2500); }
  out.calls = calls;
  out.savedTitle = calls.some(c => c.title && c.title.includes('اختبار حفظ تلقائي'));
  out.savedPrice = calls.some(c => Number(c.price) === 1500000);
  await p.screenshot({ path: 'output/_wizard_probe.png', fullPage: true }).catch(() => { });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => console.log('ERR', e.message));
