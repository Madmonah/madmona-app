// الإعلانات صغيرة الصور — أشوفها كلها مرة واحدة مع عنوان كل إعلان
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/wa-inbound/';
const G = [
  ['Ritz New Zayed · عيادة I Business Park · أوفيس I Business Park (نفس الرقم)', ['1783810821956-YxRTJFODYA.jpg', '1783810822506-kwNDUwRTQA.jpg']],
  ['Helio Eye Residence — شقة 160م', ['1783810441277-VCRjBEQzAA.jpg']],
  ['كمبوند أناكاجي — العاصمة R8', ['1783811023609-U2OTk1QjUA.jpg']],
  ['استوديو RED — مستقبل سيتي', ['1783841034016-gyN0Q5RTMA.jpg']],
  ['Nedit Tower — Matter Mall', ['1783842210460-NBREU5RDgA.jpg', '1783860195741-A0RUMzMTgA.jpg']],
  ['Veni Mall — العاصمة الإدارية', ['1783794229387-NCOTdDOUQA.jpg']],
  ['Lyx Business Complex — F&B', ['1783842211370-FFQUNCRTAA.jpg', '1783842286470-YyRTI3QkEA.jpg']],
  ['The Pause — الياسمين', ['1783858917517-EzQTgyN0QA.jpg', '1783859031088-gzNjEwMzIA.jpg']],
];
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1400, height: 600, deviceScaleFactor: 1 });
  const html = G.map(([t, fs]) =>
    `<div style="color:#fff;font:bold 16px system-ui;padding:7px 4px;direction:rtl">${t}</div>
     <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:3px">
     ${fs.map((f, i) => `<div style="position:relative;height:210px;background:#000">
        <img src="${B}${f}" style="width:100%;height:100%;object-fit:contain">
        <span style="position:absolute;top:2px;left:2px;background:#2563eb;color:#fff;font:bold 13px monospace;padding:1px 5px">${i + 1}</span></div>`).join('')}
     </div>`).join('');
  await page.setContent(`<body style="margin:0;background:#111">${html}</body>`);
  await sleep(9000);
  await page.screenshot({ path: __dirname + '/rest.png', fullPage: true });
  await page.close();
  console.log('ok');
})();
