// إصلاح الـ7 صور المشكلة — نختار البديل التاني
const fs = require('fs');
const S = 'E:\\madmona-app\\scripts\\';
const picks = JSON.parse(fs.readFileSync(S + 'picks.json', 'utf8'));
const data = JSON.parse(fs.readFileSync(S + 'hires.json', 'utf8'));
const byId = Object.fromEntries(data.map(d => [d.id, d]));

// المشاريع اللي صورتها وحشة — نستبعد الصورة الحالية ونجيب تانية
const BAD_TITLES = ['Cinco', 'Prk Vie', 'Jazebeya', 'ORO', 'Midtown Condo', 'The Brooks', 'Vinia'];
// كلمات نتجنّبها في اللينك (رسمة/داخلي/خريطة/لوجو)
const AVOID = /(plan|floor|map|layout|interior|logo|banner|masterplan|drawing|cad|reception|lobby|chair|sofa|room|kitchen|bath)/i;

let fixed = 0;
for (const p of picks) {
  if (!BAD_TITLES.includes(p.title)) continue;
  const all = (byId[p.id]?.candidates || []).filter(Boolean);
  // بديل: مش الحالي، ومفيهوش كلمات ممنوعة، ويفضّل موقع محترم
  const alt = all.find(u => u !== p.pick && !AVOID.test(u) &&
    /(realestate\.eg|nawy|newcapital-developments|newcairo-developments|flatandvilla|gprproperty|aqarmap|coolproperty|propertyfinder|egyprop|alnaser)/i.test(u))
    || all.find(u => u !== p.pick && !AVOID.test(u));
  if (alt) {
    p.pick = alt;
    try { p.host = new URL(alt).hostname.replace('www.', ''); } catch {}
    fixed++;
    console.log(`✏️  ${p.title} -> ${p.host}`);
  } else {
    console.log(`⚠️  ${p.title} — مفيش بديل كويس`);
  }
}
fs.writeFileSync(S + 'picks.json', JSON.stringify(picks, null, 1), 'utf8');
console.log('\nfixed', fixed);
