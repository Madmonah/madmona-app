// بيبني فهرس كامل لكل الميديا في كل الشاتات (Docs + Media)
// الجدول بيدّي: النوع · الاسم · الحجم · مين بعته · التاريخ — ده كل اللي محتاجه للربط
const fs = require('fs');
const { wa, sleep } = require('./wa-lib');

async function grabTab(p, name) {
  const t = await p.evaluate((n) => {
    const c = [...document.querySelectorAll('[role="tab"], button')]
      .filter((e) => (e.innerText || '').trim() === n && e.getBoundingClientRect().height > 15);
    if (!c.length) return null;
    const r = c[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, name);
  if (!t) return [];
  await p.mouse.click(t.x, t.y);
  await sleep(3000);

  const كله = new Map();
  let ثابت = 0;
  for (let i = 0; i < 60; i++) {
    const دفعة = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('[data-id]').forEach((el) => {
        const t = (el.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
        if (t.length) out.push({ id: el.getAttribute('data-id'), سطور: t });
      });
      return out;
    });
    دفعة.forEach((d) => كله.set(d.id, d));
    const قبل = كله.size;
    const فوق = await p.evaluate(() => {
      const c = [...document.querySelectorAll('div')]
        .filter((d) => d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 200)
        .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
      if (!c) return true;
      const قبل = c.scrollTop;
      c.scrollTop = c.scrollTop + c.clientHeight * 0.8;
      return c.scrollTop === قبل;
    });
    await sleep(1200);
    (await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('[data-id]').forEach((el) => {
        const t = (el.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
        if (t.length) out.push({ id: el.getAttribute('data-id'), سطور: t });
      });
      return out;
    })).forEach((d) => كله.set(d.id, d));
    if (كله.size === قبل && فوق) { ثابت++; if (ثابت >= 3) break; } else ثابت = 0;
  }
  return [...كله.values()];
}

(async () => {
  const { p } = await wa();
  await p.bringToFront();
  const نتيجة = {};
  for (const tab of ['Docs', 'Media']) {
    نتيجة[tab] = await grabTab(p, tab);
    console.log(tab, '→', نتيجة[tab].length, 'عنصر');
  }
  fs.writeFileSync(__dirname + '/wa-index.json', JSON.stringify(نتيجة, null, 1));
  console.log('\nاتحفظ في wa-index.json');
  process.exit(0);
})();
