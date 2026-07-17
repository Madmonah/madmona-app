// اضغط منيو (⌄) أول صف في اللوحة وشوف الخيارات
const fs = require('fs');
const { wa, sleep } = require('./wa-lib');

(async () => {
  const { p } = await wa();
  await p.bringToFront();

  // اتأكد إحنا على تبويب Docs
  const t = await p.evaluate(() => {
    const c = [...document.querySelectorAll('[role="tab"], button, div')]
      .filter((e) => (e.innerText || '').trim() === 'Docs' && e.getBoundingClientRect().height > 15 && e.getBoundingClientRect().width < 300);
    if (!c.length) return null;
    const r = c[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  console.log('تبويب Docs:', JSON.stringify(t));
  if (t) { await p.mouse.click(t.x, t.y); await sleep(3000); }

  const ch = await p.evaluate(() => {
    const c = [...document.querySelectorAll('[data-icon="ic-chevron-down-menu"]')]
      .map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })
      .filter((o) => o.y > 200 && o.y < 900);
    return c;
  });
  console.log('منيوهات ظاهرة:', ch.length, JSON.stringify(ch.slice(0, 4)));
  if (!ch.length) { await p.screenshot({ path: __dirname + '/wa-now.png' }); process.exit(1); }

  await p.mouse.click(ch[0].x, ch[0].y);
  await sleep(2000);
  const menu = await p.evaluate(() =>
    [...document.querySelectorAll('[role="menuitem"], [role="button"], li')]
      .map((e) => (e.innerText || '').trim())
      .filter((s) => s && s.length < 30));
  console.log('خيارات المنيو:', JSON.stringify(menu, null, 1));
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(0);
})();
