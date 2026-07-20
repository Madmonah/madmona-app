const puppeteer = require("puppeteer-core");
(async () => {
  const b = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: null });
  const p = (await b.pages()).find((x) => x.url().includes("web.whatsapp.com"));
  await p.bringToFront();
  await p.goto("https://web.whatsapp.com/send?phone=201104496225", { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 9000));
  const out = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('#main [data-id]')];
    return rows.slice(-15).map(r => {
      const id = r.getAttribute("data-id") || "";
      const dir = id.startsWith("true_") ? "OUT" : "IN";
      const t = r.innerText.replace(/\s+/g," ").trim().slice(0,180);
      return dir + " :: " + t;
    });
  });
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})();
