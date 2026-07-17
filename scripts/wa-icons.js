// افتح لوحة «كل الشاتات» → Docs → اجرد أسامي الأيقونات (بيكتب النتيجة في ملف)
const fs = require('fs');
const { wa, openChat, sleep } = require('./wa-lib');
const OUT = __dirname + '/icons.json';
const log = (o) => fs.writeFileSync(OUT, JSON.stringify(o, null, 1));

async function clickText(p, re, max = 60) {
  const t = await p.evaluate((src, m) => {
    const rx = new RegExp(src, 'i');
    const c = [...document.querySelectorAll('div,button,span,a')]
      .filter((e) => rx.test(e.innerText || '') && (e.innerText || '').length < m && e.getBoundingClientRect().width > 5);
    if (!c.length) return null;
    const r = c[c.length - 1].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, re.source, max);
  if (!t) return false;
  await p.mouse.click(t.x, t.y);
  await sleep(3000);
  return true;
}

(async () => {
  try {
    const { p } = await wa();
    await p.bringToFront();
    await openChat(p, '01080140401');
    await sleep(1500);

    const h = await p.evaluate(() => {
      const el = document.querySelector('#main header');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + 200, y: r.y + r.height / 2 };
    });
    if (h) { await p.mouse.click(h.x, h.y); await sleep(2500); }
    await clickText(p, /media, links and docs/);
    await clickText(p, /view (docs|media) from all chats/, 50);
    await clickText(p, /^Docs$/, 12);
    await sleep(2000);

    const r = await p.evaluate(() => {
      const أيقونات = {};
      [...document.querySelectorAll('[data-icon]')].forEach((e) => {
        const b = e.getBoundingClientRect();
        if (b.width > 5 && b.y > 0 && b.y < 1000) {
          const k = e.getAttribute('data-icon');
          (أيقونات[k] ||= []).push({ x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) });
        }
      });
      return {
        أسماء_الأيقونات: Object.fromEntries(Object.entries(أيقونات).map(([k, v]) => [k, v.length])),
        مواضع: أيقونات,
        نص_اللوحة: document.body.innerText.replace(/\n+/g, ' | ').slice(0, 300),
      };
    });
    log(r);
    console.log(JSON.stringify(r.أسماء_الأيقونات, null, 1));
    await p.screenshot({ path: __dirname + '/wa-now.png' });
  } catch (e) { log({ خطأ: String(e) }); console.log('خطأ:', e.message); }
  process.exit(0);
})();
