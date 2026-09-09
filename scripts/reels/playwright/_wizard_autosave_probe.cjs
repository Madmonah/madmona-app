// إثبات الحفظ التلقائي في الويزارد: زائر يختار تصنيف ويكتب عنوان وسعر → لازم يطلع PATCH فيه title/price
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 412, height: 900 }, locale: 'ar-EG' })).newPage();
  const calls = [];
  p.on('request', (r) => { if (r.url().includes('/api/listing-drafts') && ['POST', 'PATCH'].includes(r.method()) && !r.url().includes('/attributes') && !r.url().includes('/categories')) { let body = null; try { body = JSON.parse(r.postData() || '{}') } catch { } calls.push({ m: r.method(), title: body?.title, price: body?.price, city: body?.city, status: body?.status }) } });
  const W = 'https://www.madmonacairo.com';
  await p.goto(W + '/add-listing?track=products', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(6000);
  const out = {};
  const g = await p.$('button:has-text("عقارات بيع")'); out.group = !!g; if (g) { await g.click(); await p.waitForTimeout(2500); }
  const subs = await p.$$eval('button', bs => bs.map(x => (x.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
  out.subButtons = subs.slice(0, 25);
  const res = await p.$("button:has-text(\"عقارات سكنية\")"); out.res = !!res; if (res) { await res.click(); await p.waitForTimeout(2500); }
  out.typeButtons = (await p.$$eval("button", bs => bs.map(x => (x.innerText || "").trim().replace(/s+/g, " ")).filter(Boolean))).slice(0, 25);
  const sub = await p.$("button:has-text(\"شق\")"); out.sub = !!sub; if (sub) { await sub.click(); await p.waitForTimeout(4000); }
  out.inputs = await p.$$eval('input,textarea,select', els => els.map(i => `${i.tagName}:${i.getAttribute('type') || ''}:${i.getAttribute('placeholder') || i.getAttribute('name') || i.id || ''}`).slice(0, 25));
  const textInputs = await p.$$('input[type="text"], input:not([type])');
  out.textInputs = textInputs.length;
  if (textInputs[0]) { await textInputs[0].fill('شقة اختبار حفظ تلقائي ١٢٣'); await p.waitForTimeout(2500); }
  const priceInput = await p.$("input[placeholder*=\"3500000\"]") || await p.$("input[type=\"number\"]"); out.priceInput = !!priceInput;
  if (priceInput) { await priceInput.fill('1500000'); await p.waitForTimeout(2500); }
  out.calls = calls;
  out.savedTitle = calls.some(c => c.title && String(c.title).includes('اختبار حفظ تلقائي'));
  out.savedPrice = calls.some(c => Number(c.price) === 1500000);
  await p.screenshot({ path: 'output/_wizard_probe.png', fullPage: true }).catch(() => { });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => console.log('ERR', e.message));
