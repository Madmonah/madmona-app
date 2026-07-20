const puppeteer = require("puppeteer-core");
(async () => {
  const b = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: null });
  const p = (await b.pages()).find((x) => x.url().includes("web.whatsapp.com"));
  if (!p) { console.log(JSON.stringify({error:"no tab"})); process.exit(0); }
  await p.bringToFront();
  await new Promise(r => setTimeout(r, 3000));
  const out = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('#pane-side [role="listitem"]')];
    return {
      total: rows.length,
      chats: rows.slice(0, 30).map(r => {
        const t = r.innerText.split("\n").filter(Boolean);
        const badge = r.querySelector('[aria-label*="unread"], [aria-label*="غير مقروء"]');
        return { lines: t.slice(0,4), unread: badge ? badge.innerText || badge.getAttribute("aria-label") : null };
      })
    };
  });
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})();
