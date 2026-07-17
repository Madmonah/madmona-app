// 🎯 اختيار تلقائي ذكي لأحسن صورة لكل مشروع
const fs = require('fs');
const S = 'E:\\madmona-app\\scripts\\';
const data = JSON.parse(fs.readFileSync(S + 'hires.json', 'utf8'));

// مواقع المطوّرين الرسمية — أعلى ثقة
const OFFICIAL = /(emaarmisr|sodic|mountainview|palmhills|talaatmoustafa|misritalia|hydepark|oradevelopers|lavista|tatweermisr|inertia|hassanallam|almarasem|madinetnasr|equinox|upwyde|samco|kulture|newplan|preegypt|roya|elhazek|alfath|cred|njd)\./i;
// بوابات عقارية محترمة — ثقة تانية
const PORTAL = /(realestate\.eg|nawy|propertyfinder|aqarmap|cooingestate|westcapital-eg|newcapital-developments|gprproperty|egyprop|flatandvilla|ipgegypt|diamondgroup-eg|fld\.eg)/i;
// نتجنّبها
const AVOID = /(logo|icon|banner|watermark|whatsapp|facebook|thumb|small|150x|300x|-\d{2,3}x\d{2,3}\.)/i;

function score(u) {
  let s = 0;
  if (OFFICIAL.test(u)) s += 100;
  else if (PORTAL.test(u)) s += 50;
  if (AVOID.test(u)) s -= 80;
  // مؤشرات صورة بطل
  if (/hero|banner|cover|main|master|aerial|exterior|landscape|view/i.test(u)) s += 20;
  // مؤشرات دقة عالية في الاسم
  const m = u.match(/(\d{3,4})x(\d{3,4})/);
  if (m && +m[1] >= 1000) s += 15;
  if (/\.webp$/i.test(u)) s += 5;   // أخف
  s -= u.length / 500;              // الأقصر أنضف عادةً
  return s;
}

const picks = [];
for (const p of data) {
  const cands = (p.candidates || []).filter(Boolean);
  if (!cands.length) { picks.push({ ...p, pick: null }); continue; }
  const best = [...cands].sort((a, b) => score(b) - score(a))[0];
  let host = '';
  try { host = new URL(best).hostname.replace('www.', ''); } catch {}
  picks.push({ id: p.id, title: p.title, developer: p.developer, pick: best, host, alts: cands.filter(c => c !== best).slice(0, 3) });
}

fs.writeFileSync(S + 'picks.json', JSON.stringify(picks, null, 1), 'utf8');
console.log('PICKED:', picks.filter(p => p.pick).length, '/', picks.length, '\n');
picks.forEach((p, i) => console.log(`${String(i + 1).padStart(2)}. ${p.title.padEnd(30)} ${p.host || '❌'}`));
