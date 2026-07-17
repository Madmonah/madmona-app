// «View docs / media from all chats» — كل الميديا من كل الشاتات في مكان واحد
const { wa, sleep } = require('./wa-lib');

(async () => {
  const { p } = await wa();
  await p.bringToFront();

  // شريط الأيقونات الشمال فيه أيقونة الميديا (تحت)
  const link = await p.evaluate(() => {
    const c = [...document.querySelectorAll('div,button,span,a')]
      .filter((e) => /view (docs|media) from all chats/i.test(e.innerText || '') && (e.innerText || '').length < 50);
    if (!c.length) return null;
    const e = c[c.length - 1];
    const r = e.getBoundingClientRect();
    return { txt: e.innerText.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  console.log('اللينك:', JSON.stringify(link));
  if (link) { await p.mouse.click(link.x, link.y); await sleep(4000); }

  const st = await p.evaluate(() => ({
    عنوان: (document.body.innerText.match(/[^\n]*(Media|Docs|Links)[^\n]*/) || [''])[0],
    تبويبات: [...document.querySelectorAll('[role="tab"], button')].map((e) => (e.innerText || '').trim()).filter((t) => /^(Media|Docs|Links)$/i.test(t)),
    عناصر: document.querySelectorAll('[data-id]').length,
    نص: document.body.innerText.replace(/\n+/g, ' | ').slice(0, 400),
  }));
  console.log(JSON.stringify(st, null, 1));
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(0);
})();
