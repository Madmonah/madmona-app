// أشوف اللوحة: مفتوحة؟ على أنهي تبويب؟ فيها كام صف؟ ونصهم إيه؟
const { wa } = require('./wa-lib');
(async () => {
  const { p } = await wa();
  const s = await p.evaluate(() => {
    const rows = [];
    document.querySelectorAll('[data-icon="ic-chevron-down-menu"]').forEach((ch) => {
      const r = ch.getBoundingClientRect();
      let cur = ch, نص = '';
      for (let i = 0; i < 9 && cur; i++) {
        const t = (cur.innerText || '').trim();
        if (t.length > 12 && t.length < 400) { نص = t.replace(/\n+/g, ' ~ '); break; }
        cur = cur.parentElement;
      }
      rows.push({ y: Math.round(r.y), w: Math.round(r.width), نص: نص.slice(0, 60) });
    });
    return {
      لوحة_مفتوحة: [...document.querySelectorAll('*')].some((e) => /from all chats/i.test(e.innerText || '') && e.getBoundingClientRect().y > 0 && (e.innerText || '').length < 60),
      ارتفاع_النافذة: window.innerHeight,
      عدد_الشيفرونات: document.querySelectorAll('[data-icon="ic-chevron-down-menu"]').length,
      صفوف: rows.slice(0, 12),
    };
  });
  console.log(JSON.stringify(s, null, 1));
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(0);
})();
