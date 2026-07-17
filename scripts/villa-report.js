const fs = require('fs');
const d = JSON.parse(fs.readFileSync('E:\\madmona-app\\scripts\\villa-daily.json', 'utf8'));
const n = s => Number(String(s || '').replace(/,/g, '')) || 0;

const TAG = /5th settlement|fifth settlement|new cairo|tagamo|التجمع|القاهرة الجديدة|قطامية|katameya|mivida|ميفيدا|festival|هايد بارك|hyde park|جزيرة|guezira|لايك فيو|lake view|بالم هيلز نيو كايرو/i;

const rows = d.map(x => ({
  price: n(x.price), title: x.title, seller: x.seller, ads: x.activeAds,
  beds: x.beds, area: x.area, url: x.url,
  tagamoa: TAG.test((x.title || '') + ' ' + (x.textDump || '')),
}));

const tag = rows.filter(r => r.tagamoa && r.price > 0).sort((a, b) => Math.abs(a.price - 15000) - Math.abs(b.price - 15000));

console.log('=== التجمع / القاهرة الجديدة — إيجار يومي ===\n');
tag.forEach(r => {
  const diff = r.price - 15000;
  const tagd = diff === 0 ? '🎯 بالظبط' : (diff > 0 ? `+${diff.toLocaleString()}` : `${diff.toLocaleString()}`);
  console.log(`${r.price.toLocaleString().padStart(7)} ج/يوم  [${tagd}]`);
  console.log(`   ${r.title}`);
  console.log(`   البائع: ${r.seller || '?'} · إعلانات: ${r.ads || '?'} · غرف: ${r.beds || '?'} · مساحة: ${r.area || '?'}`);
  console.log(`   ${r.url}\n`);
});

console.log(`\n--- إجمالي إعلانات الإيجار اليومي المسحوبة: ${rows.length}`);
console.log(`--- منها في التجمع/القاهرة الجديدة: ${tag.length}`);

// أقرب البدائل خارج التجمع في نفس السعر
const near = rows.filter(r => !r.tagamoa && r.price >= 12000 && r.price <= 18000)
  .sort((a, b) => Math.abs(a.price - 15000) - Math.abs(b.price - 15000)).slice(0, 6);
console.log('\n=== بدائل قريبة (بره التجمع، 12–18 ألف) ===\n');
near.forEach(r => console.log(`${r.price.toLocaleString().padStart(7)} ج  ${r.title.slice(0, 70)}\n   ${r.url}\n`));
