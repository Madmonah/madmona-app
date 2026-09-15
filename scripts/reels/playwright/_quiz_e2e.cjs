// E2E (١٥/٩/٢٠٢٦) /quiz على الإنتاج: ابدأ → ٦ إجابات → نتيجة → لينك المشاركة فيه ?r= → فتح لينك الصاحب بيعرض نتيجته → CTA لـ/start
const { chromium } = require('playwright');
const BASE = 'https://www.madmonacairo.com';
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  const tracked = []; p.on('request', r => { if (r.url().includes('/api/events/track')) { try { tracked.push(JSON.parse(r.postData() || '{}').event_type) } catch {} } });
  const trackResp = []; p.on('response', async r => { if (r.url().includes('/api/events/track')) { try { trackResp.push((await r.text()).slice(0, 40)) } catch {} } });
  await p.goto(`${BASE}/quiz?utm_source=e2e`, { waitUntil: 'networkidle', timeout: 60000 });
  const title = await p.title();
  // (١٥/٩) مفيش بوابة «ابدأ» — الصفحة بتفتح على السؤال الأول
  for (let i = 0; i < 6; i++) { await p.waitForSelector('text=سؤال ' + (i + 1) + ' من 6', { timeout: 15000 }); const btns = await p.$$('main button.text-right'); await btns[i % 2 === 0 ? 0 : 1].click(); await p.waitForTimeout(300); }
  await p.waitForSelector('text=نوعك:', { timeout: 15000 });
  const resultName = (await p.textContent('h2')).trim();
  const wa = await p.getAttribute('a:has-text("واتساب")', 'href');
  const cta = await p.getAttribute('a:has-text("افتح لوحة شغلك مجانًا")', 'href');
  const r = decodeURIComponent(wa).match(/quiz\?r=(\w+)/)?.[1];
  await p.waitForTimeout(1500);
  const p2 = await p.context().newPage();
  await p2.goto(`${BASE}/quiz?r=${r}&utm_source=e2e`, { waitUntil: 'networkidle', timeout: 60000 });
  const friendBox = await p2.textContent('main').then(t => t.includes('صاحبك طلع'));
  console.log(JSON.stringify({ title, resultName, r, ctaOk: /^\/start\?utm_source=quiz/.test(cta || ''), friendBox, tracked, trackResp, errs }));
  await b.close();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
