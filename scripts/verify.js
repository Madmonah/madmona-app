// بيرندر صور كل إعلان بترتيب العرض الفعلي — أول صورة = الغلاف
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const rows = JSON.parse(fs.readFileSync(__dirname + '/verify.json', 'utf8'));
  const byT = {};
  for (const r of rows) (byT[r.t] ||= []).push(r);

  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  const blocks = Object.entries(byT)
    .map(([t, fs_]) => {
      const cells = fs_
        .map(
          (f, i) => `<div style="position:relative;height:190px;background:#000;border:${i === 0 ? '3px solid #16a34a' : '1px solid #333'}">
        <img src="https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/${f.f}" style="width:100%;height:100%;object-fit:contain">
        <span style="position:absolute;top:2px;left:2px;background:${i === 0 ? '#16a34a' : '#444'};color:#fff;font:bold 13px monospace;padding:1px 5px">${i === 0 ? 'غلاف' : i + 1}</span></div>`
        )
        .join('');
      return `<div style="color:#fff;font:bold 17px system-ui;padding:8px 4px;direction:rtl">${t}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">${cells}</div>`;
    })
    .join('');
  await page.setViewport({ width: 1500, height: 400, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0;background:#111">${blocks}</body>`);
  await sleep(9000);
  await page.screenshot({ path: __dirname + '/verify.png', fullPage: true });
  await page.close();
  console.log('ok');
})();
