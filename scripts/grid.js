const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/wa-inbound/';
const imgs = [
  '1783828124971-U0RDJBNTkA.jpg',
  '1783828125858-hDRDk2REYA.jpg',
  '1783828127000-FFNzBCNjIA.jpg',
  '1783828127406-Q3NzI5MDIA.jpg',
  '1783828199061-QxREI3QTEA.jpg',
];
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
    ${imgs.map((f,i)=>`<div style="position:relative"><img src="${B}${f}" style="width:100%;height:260px;object-fit:cover">
      <span style="position:absolute;top:4px;left:4px;background:#000;color:#0f0;font:bold 22px monospace;padding:2px 8px">${i+1}</span></div>`).join('')}
  </body>`;
  await page.setContent(html);
  await sleep(6000);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\grid.png' });
  await page.close(); b.disconnect(); console.log('ok');
})().catch(e => console.log('ERR', e.message));
