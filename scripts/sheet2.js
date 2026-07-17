// 🖼️ contact sheet بالصور الأصلية (full-res)
const fs = require('fs');
const S = 'E:\\madmona-app\\scripts\\';
const data = JSON.parse(fs.readFileSync(S + 'hires.json', 'utf8'));

let h = `<!doctype html><meta charset="utf-8">
<title>الصور الأصلية — مراجعة</title>
<style>
 body{font-family:Tahoma,Arial;background:#0d0d0d;color:#eee;margin:0;padding:20px;direction:rtl}
 h1{color:#2FA084;margin:0 0 4px}
 .sub{color:#888;font-size:13px;margin-bottom:18px}
 .p{background:#1a1a1a;border-radius:14px;padding:14px;margin-bottom:16px}
 .t{font-size:17px;font-weight:800}
 .d{color:#888;font-size:12px;margin-bottom:10px}
 .row{display:flex;gap:8px;flex-wrap:wrap}
 .c{position:relative;cursor:pointer;border:3px solid #2a2a2a;border-radius:10px;overflow:hidden;background:#222}
 .c img{width:230px;height:150px;object-fit:cover;display:block}
 .c.sel{border-color:#2FA084;box-shadow:0 0 0 3px #2FA08455}
 .c .n{position:absolute;top:4px;right:4px;background:#000c;color:#fff;font-size:11px;padding:2px 6px;border-radius:6px}
 .c .src{position:absolute;bottom:0;right:0;left:0;background:#000b;color:#9f9;font-size:9px;padding:2px 4px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr;text-align:left}
 .none{color:#c66;font-size:13px}
 #out{position:fixed;bottom:0;left:0;right:0;background:#2FA084;color:#fff;padding:14px;
      font-weight:800;text-align:center;cursor:pointer;font-size:15px;z-index:99}
</style>
<h1>🖼️ الصور الأصلية — كاملة الجودة</h1>
<div class="sub">${data.length} مشروع · دوس على أحسن صورة لكل واحد · تحت كل صورة مكتوب مصدرها</div>
`;

data.forEach((p) => {
  h += `<div class="p"><div class="t">${p.title}</div>
  <div class="d">${p.developer || '—'}</div><div class="row">`;
  if (!p.candidates || !p.candidates.length) {
    h += `<div class="none">⚠️ ملقيتش صور</div>`;
  } else {
    p.candidates.forEach((src, j) => {
      let host = '';
      try { host = new URL(src).hostname.replace('www.', ''); } catch {}
      h += `<div class="c" data-id="${p.id}" data-src="${src.replace(/"/g, '&quot;')}">
        <span class="n">${j + 1}</span>
        <img src="${src}" loading="lazy" onerror="this.parentElement.style.display='none'">
        <span class="src">${host}</span></div>`;
    });
  }
  h += `</div></div>`;
});

h += `
<div id="out">دوس على الصور — ولما تخلص دوس هنا</div>
<script>
const sel = {};
document.querySelectorAll('.c').forEach(c => c.onclick = () => {
  const id = c.dataset.id;
  document.querySelectorAll('.c[data-id="'+id+'"]').forEach(x => x.classList.remove('sel'));
  c.classList.add('sel');
  sel[id] = c.dataset.src;
  document.getElementById('out').textContent = '✅ اخترت ' + Object.keys(sel).length + ' من ${data.length} — دوس هنا للنسخ';
});
document.getElementById('out').onclick = () => {
  navigator.clipboard.writeText(JSON.stringify(sel));
  document.getElementById('out').textContent = '📋 اتنسخ! ارجع لكلود وقول تمام';
};
</script>`;

fs.writeFileSync(S + 'sheet2.html', h, 'utf8');
const withImgs = data.filter(d => d.candidates && d.candidates.length).length;
console.log(`sheet2.html · ${data.length} مشروع · ${withImgs} ليهم صور`);
