const fs = require('fs');
const S = 'E:\\madmona-app\\scripts\\';
const picks = JSON.parse(fs.readFileSync(S + 'picks.json', 'utf8'));

let h = `<!doctype html><meta charset="utf-8"><title>الاختيار النهائي</title>
<style>
 body{font-family:Tahoma;background:#0d0d0d;color:#eee;margin:0;padding:18px;direction:rtl}
 h1{color:#2FA084;margin:0 0 14px}
 .g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
 .c{background:#1a1a1a;border-radius:12px;overflow:hidden}
 .c img{width:100%;height:170px;object-fit:cover;display:block;background:#222}
 .b{padding:8px 10px}
 .t{font-weight:800;font-size:13px}
 .d{color:#888;font-size:11px}
 .s{color:#6c9;font-size:10px;direction:ltr;text-align:left;margin-top:3px}
</style>
<h1>✅ الاختيار النهائي — ${picks.length} مشروع</h1><div class="g">`;

picks.forEach(p => {
  h += `<div class="c">
    <img src="${p.pick}" loading="lazy" onerror="this.style.opacity=.15;this.parentElement.style.outline='2px solid #c33'">
    <div class="b"><div class="t">${p.title}</div>
    <div class="d">${p.developer || '—'}</div>
    <div class="s">${p.host}</div></div></div>`;
});
h += '</div>';
fs.writeFileSync(S + 'preview.html', h, 'utf8');
console.log('preview.html ready');
