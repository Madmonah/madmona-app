// بيرندر صور واتساب كل رقم في grid مرقّم عشان أبصّ عليها بعينـي
// الأخضر = مستخدمة دلوقتي · الأحمر = متبعتت ومحدش استخدمها
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/';

(async () => {
  const rows = JSON.parse(fs.readFileSync(__dirname + '/wa-media.json', 'utf8'))
    .filter((r) => /\.(jpg|jpeg|png)$/i.test(r.file));
  const byPhone = {};
  for (const r of rows) (byPhone[r.phone] ||= []).push(r);

  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();

  for (const [phone, files] of Object.entries(byPhone)) {
    const COLS = 5;
    const rowsN = Math.ceil(files.length / COLS);
    await page.setViewport({ width: 1500, height: rowsN * 260 + 40, deviceScaleFactor: 1 });
    const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${COLS},1fr);gap:4px">
      ${files
        .map(
          (f, i) => `<div style="position:relative;height:255px;background:#000">
        <img src="${B}${f.file}" style="width:100%;height:100%;object-fit:contain">
        <span style="position:absolute;top:3px;left:3px;background:${f.used ? '#16a34a' : '#dc2626'};color:#fff;font:bold 18px monospace;padding:1px 7px">${i + 1}</span></div>`
        )
        .join('')}
    </body>`;
    await page.setContent(html);
    await sleep(7000);
    const out = `${__dirname}/wa-${phone.replace('+', '')}.png`;
    await page.screenshot({ path: out, fullPage: true });
    console.log('✓', phone, files.length, '→', out);
  }
  await page.close();
  console.log('تمام');
})();
