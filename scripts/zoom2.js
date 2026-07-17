// أكبّر صورتين Techwood أتأكد من كود الموديل المكتوب عليهم
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/wa-inbound/';
const imgs = [
  ['1783542233079-c5RDFENTYA.jpg', 'مرشّح لإعلان WOD 01'],
  ['1783542236900-I3OEUzQ0IA.jpg', 'مرشّح لإعلان WOD 07 (140x195)'],
];
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1700, height: 900, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0;background:#111;display:grid;grid-template-columns:1fr 1fr;gap:8px">
    ${imgs.map(([f, t]) => `<div><div style="color:#0f0;font:bold 20px monospace;padding:6px">${t}</div>
      <img src="${B}${f}" style="width:100%;object-fit:contain"></div>`).join('')}
  </body>`);
  await sleep(7000);
  await page.screenshot({ path: __dirname + '/zoom2.png', fullPage: true });
  await page.close();
  console.log('ok');
})();
