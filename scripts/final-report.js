const fs = require('fs');
const S = 'E:\\madmona-app\\scripts\\';
const phones = JSON.parse(fs.readFileSync(S + 'villa-phones.json', 'utf8'));
let ads = [];
try { ads = JSON.parse(fs.readFileSync(S + 'villa-daily.json', 'utf8')); } catch {}

const n = s => Number(String(s || '').replace(/,/g, '')) || 0;
const TAG5 = /5th settlement|fifth|new cairo|katameya|mivida|hyde park|festival|guezira|lake view|concord|التجمع|القاهرة الجديدة|قطامية/i;

// نجيب سعر لكل بائع من إعلانات دوبيزل اللي سحبناها
const bySeller = new Map();
for (const a of ads) {
  const s = (a.seller || '').trim().toLowerCase();
  if (!s) continue;
  const p = n(a.price);
  if (!p) continue;
  if (!bySeller.has(s)) bySeller.set(s, []);
  bySeller.get(s).push({ price: p, title: a.title, tag: TAG5.test((a.title || '') + (a.textDump || '')) });
}

const rows = phones.map(x => {
  const key = (x.seller || '').trim().toLowerCase();
  const list = bySeller.get(key) || [];
  const best = list.sort((a, b) => Math.abs(a.price - 15000) - Math.abs(b.price - 15000))[0];
  return {
    phone: x.phone,
    seller: x.seller || '؟',
    price: x.price || (best ? best.price : null),
    title: x.title || (best ? best.title : ''),
    tagamoa: x.tagamoa || (best ? best.tag : false),
    url: x.url,
  };
});

const tag = rows.filter(r => r.tagamoa);
const rest = rows.filter(r => !r.tagamoa);

const fmt = r => {
  const p = r.price ? r.price.toLocaleString() + ' ج' : '—';
  const gap = r.price ? (r.price === 15000 ? '🎯' : (r.price > 15000 ? `+${(r.price - 15000).toLocaleString()}` : `${(r.price - 15000).toLocaleString()}`)) : '';
  return `| ${r.phone} | ${r.seller.slice(0, 26)} | ${p} | ${gap} |`;
};

console.log('# 📞 فيلات إيجار يومي — التجمع/القاهرة الجديدة\n');
console.log('| الرقم | الاسم | السعر/يوم | الفرق عن 15ألف |');
console.log('|---|---|---|---|');
tag.sort((a, b) => (a.price ? Math.abs(a.price - 15000) : 9e9) - (b.price ? Math.abs(b.price - 15000) : 9e9))
   .forEach(r => console.log(fmt(r)));

console.log(`\n\n# 📞 باقي القاهرة (${rest.length})\n`);
console.log('| الرقم | الاسم | السعر/يوم |');
console.log('|---|---|---|');
rest.forEach(r => console.log(`| ${r.phone} | ${r.seller.slice(0, 26)} | ${r.price ? r.price.toLocaleString() + ' ج' : '—'} |`));

console.log(`\n\nإجمالي: ${rows.length} رقم · التجمع: ${tag.length} · باقي القاهرة: ${rest.length}`);

// CSV
const csv = ['phone,seller,price_per_day,in_tagamoa,url',
  ...rows.map(r => `${r.phone},"${(r.seller || '').replace(/"/g, "'")}",${r.price || ''},${r.tagamoa ? 'yes' : 'no'},${r.url || ''}`)].join('\n');
fs.writeFileSync(S + 'villa-leads.csv', '﻿' + csv, 'utf8');
console.log('\nCSV -> ' + S + 'villa-leads.csv');
