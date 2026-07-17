// العارض مفتوح والفيديو وصل — أنزّله وأعدّي للتالي
// ⚠️ زرار التحميل في العارض مالوش data-icon مميّز — بندوّر على الـsvg في الهيدر
const fs = require('fs');
const path = require('path');
const { wa, sleep } = require('./wa-lib');
const DL = 'E:\\madmona-app\\.wa-dl';

async function زرار_التحميل(p) {
  return p.evaluate(() => {
    // الهيدر فوق (y < 130) فيه صف أيقونات — التحميل قبل الـ⋮ والـX
    const cand = [...document.querySelectorAll('[role="button"], button, span[data-icon]')]
      .map((e) => { const r = e.getBoundingClientRect(); return { e, r }; })
      .filter((o) => o.r.y < 130 && o.r.y > 10 && o.r.width > 15 && o.r.width < 70)
      .sort((a, b) => a.r.x - b.r.x);
    if (!cand.length) return null;
    // من الشمال: النص كله أيقونات. التحميل هو التالت من الآخر (⬇ ⋮ ✕)
    const t = cand[cand.length - 3] || cand[cand.length - 1];
    return { x: t.r.x + t.r.width / 2, y: t.r.y + t.r.height / 2,
             كلهم: cand.map((o) => Math.round(o.r.x)) };
  });
}

(async () => {
  const { p } = await wa();
  await p.bringToFront();
  const cdp = await p.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true });

  const d = await زرار_التحميل(p);
  console.log('زرار التحميل:', JSON.stringify(d));
  if (!d) process.exit(1);
  const قبل = fs.readdirSync(DL);
  await p.mouse.click(d.x, d.y);
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const n = fs.readdirSync(DL).filter((f) => !f.endsWith('.crdownload') && !قبل.includes(f));
    if (n.length) {
      console.log('✅', n[0], (fs.statSync(path.join(DL, n[0])).size / 1048576).toFixed(1), 'MB');
      process.exit(0);
    }
  }
  console.log('✗ مااتحملش');
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(1);
})();
