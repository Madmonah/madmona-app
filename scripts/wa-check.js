const puppeteer = require('puppeteer-core');
const fs = require('fs');
const LOG = 'E:\\madmona-app\\scripts\\wa-check.log';
const log = (m) => fs.appendFileSync(LOG, m + '\n');
const safe = async (fn, d=null) => { try { return await fn(); } catch(e){ return d; } };
(async () => {
  fs.writeFileSync(LOG,'');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  let pages = await browser.pages();
  let wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if(!wa){ wa = await browser.newPage(); await wa.goto('https://web.whatsapp.com/',{waitUntil:'domcontentloaded',timeout:60000}); }
  await safe(()=>wa.bringToFront());
  for(let i=0;i<20;i++){
    await new Promise(r=>setTimeout(r,3000));
    const s = await safe(()=>wa.evaluate(()=>({
      pane: !!document.querySelector('#pane-side'),
      qr: !!document.querySelector('canvas[aria-label*="Scan"], [data-ref]'),
      body: document.body.innerText.slice(0,80).replace(/\n/g,' ')
    })),{});
    log(`t${i*3}s pane=${s.pane} qr=${s.qr} :: ${s.body}`);
    if(s.pane){ log('LOGGED_IN'); break; }
    if(s.qr && i>3){ log('NEEDS_QR'); break; }
  }
  browser.disconnect();
})().catch(e=>log('FATAL '+e.message));
