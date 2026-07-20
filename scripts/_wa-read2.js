const puppeteer = require("puppeteer-core");
(async () => {
  const b = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: null });
  const p = (await b.pages()).find((x) => x.url().includes("web.whatsapp.com"));
  await p.bringToFront();
  await new Promise(r => setTimeout(r, 4000));
  await p.screenshot({ path: "scripts/_wa-chat.png" });
  const s = await p.evaluate(() => ({
    hasMain: !!document.querySelector("#main"),
    bubbles: document.querySelectorAll("#main .message-in, #main .message-out").length,
    txt: (document.querySelector("#main")?.innerText || document.body.innerText).replace(/\s+/g," ").slice(0,600)
  }));
  console.log(JSON.stringify(s, null, 1));
  process.exit(0);
})();
