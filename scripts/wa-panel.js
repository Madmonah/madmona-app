// أفتح لوحة «Media, links and docs» — بتعرض كل ميديا الشات في جريد واحد
const { wa, openChat, sleep } = require('./wa-lib');
(async () => {
  const { p } = await wa();
  await p.bringToFront();
  await openChat(p, process.argv[2] || '01080140401');
  await sleep(1500);

  // اضغط على الهيدر يفتح بروفايل جهة الاتصال
  const h = await p.evaluate(() => {
    const el = document.querySelector('#main header');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + 200, y: r.y + r.height / 2 };
  });
  if (!h) { console.log('✗ مفيش هيدر'); process.exit(1); }
  await p.mouse.click(h.x, h.y);
  await sleep(2500);

  // دوّر على زرار الميديا
  const found = await p.evaluate(() => {
    const cands = [...document.querySelectorAll('div,button,span')]
      .filter((e) => /media, links and docs|الوسائط والروابط|Media, links/i.test(e.innerText || ''))
      .filter((e) => (e.innerText || '').length < 60);
    if (!cands.length) return null;
    const e = cands[cands.length - 1];
    const r = e.getBoundingClientRect();
    return { txt: e.innerText, x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  console.log('زرار الميديا:', JSON.stringify(found));
  if (found) { await p.mouse.click(found.x, found.y); await sleep(3000); }

  const panel = await p.evaluate(() => ({
    نص: (document.body.innerText.match(/Media[\s\S]{0,300}/) || [''])[0].slice(0, 300),
    صور_في_اللوحة: document.querySelectorAll('[data-testid="media-canvas"], img[src^="blob:"]').length,
  }));
  console.log(JSON.stringify(panel, null, 1));
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(0);
})();
