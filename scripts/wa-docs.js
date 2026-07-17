// لوحة الميديا → Docs → قايمة الملفات
// ⚠️ اللوحة بتتبدّل (toggle) — لازم أتأكد هي مفتوحة قبل ما أضغط الهيدر
const { wa, openChat, sleep } = require('./wa-lib');

async function panelOpen(p) {
  return p.evaluate(() => [...document.querySelectorAll('[role="tab"], button, div')]
    .some((e) => (e.innerText || '').trim() === 'Docs'));
}

async function openMediaPanel(p) {
  if (await panelOpen(p)) return true;
  const h = await p.evaluate(() => {
    const el = document.querySelector('#main header');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + 200, y: r.y + r.height / 2 };
  });
  if (!h) return false;
  await p.mouse.click(h.x, h.y);
  await sleep(2500);
  const btn = await p.evaluate(() => {
    const c = [...document.querySelectorAll('div,button,span')]
      .filter((e) => /media, links and docs/i.test(e.innerText || '') && (e.innerText || '').length < 60);
    if (!c.length) return null;
    const r = c[c.length - 1].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!btn) return false;
  await p.mouse.click(btn.x, btn.y);
  await sleep(3000);
  return panelOpen(p);
}

async function clickTab(p, name) {
  const t = await p.evaluate((n) => {
    const c = [...document.querySelectorAll('[role="tab"], button, div')]
      .filter((e) => (e.innerText || '').trim() === n && e.getBoundingClientRect().height > 15);
    if (!c.length) return null;
    const r = c[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, name);
  if (!t) return false;
  await p.mouse.click(t.x, t.y);
  await sleep(3000);
  return true;
}

(async () => {
  const phone = process.argv[2] || '01080140401';
  const { p } = await wa();
  await p.bringToFront();
  await openChat(p, phone);
  console.log('اللوحة:', (await openMediaPanel(p)) ? '✓ مفتوحة' : '✗');
  console.log('تبويب Docs:', (await clickTab(p, 'Docs')) ? '✓' : '✗');
  const items = await p.evaluate(() => {
    const seen = new Set(), out = [];
    document.querySelectorAll('[data-id]').forEach((el) => {
      const t = (el.innerText || '').replace(/\n+/g, ' | ');
      const m = t.match(/[^|]+\.(pdf|docx?|xlsx?|pptx?)/i);
      if (m && !seen.has(el.getAttribute('data-id'))) {
        seen.add(el.getAttribute('data-id'));
        out.push({ id: el.getAttribute('data-id'), اسم: m[0].trim(), وارد: el.getAttribute('data-id').startsWith('false_'), نص: t.slice(0, 70) });
      }
    });
    return out;
  });
  console.log('\nملفات:', items.length);
  items.forEach((d, i) => console.log(' ', i + 1, d.وارد ? '⬅ منه' : '➡ مننا', d.اسم));
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(0);
})();
