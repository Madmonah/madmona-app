// 🖼️ contact sheet — نبص على الصور قبل ما نربطها
const fs = require('fs');
const S = 'E:\\madmona-app\\scripts\\';
const data = JSON.parse(fs.readFileSync(S + 'proj-imgs.json', 'utf8'));

let h = `<!doctype html><meta charset="utf-8">
<title>مراجعة صور المشاريع</title>
<style>
 body{font-family:Tahoma,Arial;background:#111;color:#eee;margin:0;padding:20px;direction:rtl}
 h1{color:#2FA084}
 .p{background:#1c1c1c;border-radius:14px;padding:14px;margin-bottom:18px}
 .t{font-size:17px;font-weight:800;margin-bottom:2px}
 .d{color:#999;font-size:13px;margin-bottom:10px}
 .row{display:flex;gap:8px;flex-wrap:wrap}
 .c{position:relative;cursor:pointer;border:3px solid transparent;border-radius:10px;overflow:hidden}
 .c img{width:190px;height:130px;object-fit:cover;display:block}
 .c.sel{border-color:#2FA084}
 .c .n{position:absolute;top:4px;right:4px;background:#000a;color:#fff;
       font-size:11px;padding:2px 6px;border-radius:6px}
 #out{position:fixed;bottom:0;left:0;right:0;background:#2FA084;color:#fff;
      padding:12px;font-weight:800;text-align:center;cursor:pointer}
</style>
<h1>🖼️ اختار أحسن صورة لكل مشروع — ${data.length} مشروع</h1>
<p style="color:#aaa">دوس على الصورة اللي تعجبك. لو مفيش صورة كويسة، سيبه من غير اختيار.</p>
`;

data.forEach((p, i) => {
  h += `<div class="p"><div class="t">${p.title}</div>
  <div class="d">${p.developer || '—'} · ${p.area || ''}</div><div class="row">`;
  (p.candidates || []).forEach((src, j) => {
    h += `<div class="c" data-id="${p.id}" data-src="${src.replace(/"/g, '&quot;')}">
      <span class="n">${j + 1}</span><img src="${src}" loading="lazy"></div>`;
  });
  h += `</div></div>`;
});

h += `
<div id="out">✅ خلصت — دوس هنا عشان تنسخ الاختيارات</div>
<script>
const sel = {};
document.querySelectorAll('.c').forEach(c => c.onclick = () => {
  const id = c.dataset.id;
  document.querySelectorAll('.c[data-id="'+id+'"]').forEach(x => x.classList.remove('sel'));
  c.classList.add('sel');
  sel[id] = c.dataset.src;
  document.getElementById('out').textContent = '✅ اخترت ' + Object.keys(sel).length + ' — دوس هنا للنسخ';
});
document.getElementById('out').onclick = () => {
  const txt = JSON.stringify(sel, null, 1);
  navigator.clipboard.writeText(txt);
  document.getElementById('out').textContent = '📋 اتنسخ! ابعته لكلود';
};
</script>`;

fs.writeFileSync(S + 'sheet.html', h, 'utf8');
console.log('sheet.html ready · projects:', data.length);
