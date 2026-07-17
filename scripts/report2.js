const fs = require('fs');
const S = 'E:\\madmona-app\\scripts\\';
const phones = JSON.parse(fs.readFileSync(S + 'villa-phones.json', 'utf8'));
let ads = [];
try { ads = JSON.parse(fs.readFileSync(S + 'villa-daily.json', 'utf8')); } catch {}
const n = s => Number(String(s || '').replace(/,/g, '')) || 0;

// أول 24 رقم = صفحة new-cairo (التجمع) — الترتيب محفوظ من السحب
const TAGAMOA_COUNT = 24;

// مطابقة الاسم بالأسعار (تطبيع بسيط)
const norm = s => (s || '').toLowerCase().replace(/[^a-z؀-ۿ]/g, '');
const priceBySeller = new Map();
for (const a of ads) {
  const p = n(a.price); if (!p || !a.seller) continue;
  const k = norm(a.seller);
  if (!priceBySeller.has(k)) priceBySeller.set(k, []);
  priceBySeller.get(k).push(p);
}
const getPrice = (seller) => {
  const list = priceBySeller.get(norm(seller));
  if (!list || !list.length) return null;
  return Math.min(...list);  // أرخص سعر للبائع
};

const rows = phones.map((x, i) => ({
  phone: x.phone, seller: x.seller || '؟',
  price: getPrice(x.seller),
  tagamoa: i < TAGAMOA_COUNT,
}));

// أعلام السماسرة (شركات) vs أفراد
const BIZ = /real ?estate|properties|investment|realty|group|عقار|تسويق|للحلول|إيجبت|egypt|hashtag|urban|swan|horus|بجيرا|bagera|فراعنه|أطوار/i;

const tag = rows.filter(r => r.tagamoa);
const owners = tag.filter(r => !BIZ.test(r.seller));
const biz = tag.filter(r => BIZ.test(r.seller));

let out = '# 📞 فيلات إيجار يومي — التجمع الخامس / القاهرة الجديدة\n\n';
out += `**${tag.length} رقم** — كلهم من صفحة New Cairo على دوبيزل\n\n`;

out += '## 👤 مُلّاك مباشرين (' + owners.length + ') — كلّمهم الأول، تفاوض أسهل\n\n';
out += '| # | الرقم | الاسم | السعر/يوم |\n|---|---|---|---|\n';
owners.forEach((r, i) => out += `| ${i + 1} | ${r.phone} | ${r.seller} | ${r.price ? r.price.toLocaleString() + ' ج' : '—'} |\n`);

out += '\n## 🏢 مكاتب عقارية (' + biz.length + ') — عندهم أكتر من فيلا\n\n';
out += '| # | الرقم | المكتب | السعر/يوم |\n|---|---|---|---|\n';
biz.forEach((r, i) => out += `| ${i + 1} | ${r.phone} | ${r.seller} | ${r.price ? r.price.toLocaleString() + ' ج' : '—'} |\n`);

fs.writeFileSync(S + 'villa-report.md', out, 'utf8');
console.log(out);

const csv = ['phone,seller,price_per_day,type',
  ...tag.map(r => `${r.phone},"${r.seller}",${r.price || ''},${BIZ.test(r.seller) ? 'office' : 'owner'}`)].join('\n');
fs.writeFileSync(S + 'villa-leads.csv', '﻿' + csv, 'utf8');
console.log('\n---\nMD -> villa-report.md · CSV -> villa-leads.csv');
