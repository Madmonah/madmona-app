// اقفل العارض لو مفتوح (بزرار X — مش Escape، ده بيقفل التاب)
const { wa, sleep } = require('./wa-lib');
(async () => {
  const { p } = await wa();
  await p.bringToFront();
  for (let i = 0; i < 4; i++) {
    const x = await p.evaluate(() => {
      // آخر أيقونة في الهيدر فوق = X
      const c = [...document.querySelectorAll('[role="button"], button, span[data-icon]')]
        .map((e) => ({ r: e.getBoundingClientRect() }))
        .filter((o) => o.r.y < 130 && o.r.y > 10 && o.r.width > 15 && o.r.width < 70)
        .sort((a, b) => a.r.x - b.r.x);
      if (c.length < 3) return null;
      const t = c[c.length - 1];
      return { x: t.r.x + t.r.width / 2, y: t.r.y + t.r.height / 2 };
    });
    if (!x) break;
    await p.mouse.click(x.x, x.y);
    await sleep(1200);
  }
  const st = await p.evaluate(() => ({
    فيه_عارض: !!document.querySelector('video'),
    فيه_بحث: !!document.querySelector('input[data-tab="3"]'),
  }));
  console.log(JSON.stringify(st));
  process.exit(0);
})();
