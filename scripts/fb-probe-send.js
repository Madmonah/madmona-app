const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  const out = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('[contenteditable="true"][role="textbox"]')];
    return boxes.map((bx, i) => {
      // اطلع لفوق لحد ما نلاقي الفورم
      let f = bx;
      for (let k = 0; k < 8 && f; k++) { f = f.parentElement; if (f && f.tagName === 'FORM') break; }
      const scope = f || bx.parentElement.parentElement.parentElement;
      const btns = [...scope.querySelectorAll('[role="button"]')].map(x => x.getAttribute('aria-label') || x.innerText || '?');
      return { i, text: bx.innerText.slice(0,40), placeholder: bx.getAttribute('aria-placeholder'), btns };
    });
  });
  console.log(JSON.stringify(out, null, 1));
  b.disconnect();
})();
