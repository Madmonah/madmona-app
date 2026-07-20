const puppeteer = require("puppeteer-core");
(async () => {
  const b = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: null });
  const p = (await b.pages()).find((x) => x.url().includes("web.whatsapp.com"));
  await p.bringToFront();
  await new Promise(r => setTimeout(r, 2000));
  await p.screenshot({ path: "scripts/_wa-state2.png" });
  const s = await p.evaluate(() => ({
    url: location.href,
    title: document.title,
    paneSide: !!document.querySelector("#pane-side"),
    listitems: document.querySelectorAll('[role="listitem"]').length,
    txt: document.body.innerText.replace(/\s+/g," ").slice(0, 400)
  }));
  console.log(JSON.stringify(s, null, 1));
  process.exit(0);
})();
