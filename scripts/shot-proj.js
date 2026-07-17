const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(110000); // نستنى Vercel يبني
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1200, height: 1500 });
  const url = 'https://www.madmonacairo.com/real-estate/projects/' + process.argv[2];
  const r = await page.goto(url, { waitUntil: 'networkidle2', timeout: 50000 });
  console.log('status', r.status(), url);
  await sleep(5000);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\proj.png' });
  await page.close(); b.disconnect();
})().catch(e => console.log('ERR', e.message));
