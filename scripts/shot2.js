const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await b.newPage();
  await page.setViewport({ width: 1200, height: 1400 });
  const r = await page.goto('https://www.madmonacairo.com/real-estate/projects/' + process.argv[2],
    { waitUntil: 'networkidle2', timeout: 50000 });
  console.log('status', r.status());
  await sleep(5000);
  await page.screenshot({ path: 'E:\\madmona-app\\scripts\\proj.png' });
  await page.close(); b.disconnect();
})().catch(e => console.log('ERR', e.message));
