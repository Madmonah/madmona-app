// إصلاح الـ5 اللي وقعوا 404 — نجيب بديل من نفس المرشحين
const fs = require('fs');
const S = 'E:\\madmona-app\\scripts\\';
const picks = JSON.parse(fs.readFileSync(S + 'picks.json', 'utf8'));
const data = JSON.parse(fs.readFileSync(S + 'hires.json', 'utf8'));
const byId = Object.fromEntries(data.map(d => [d.id, d]));

const FAILED = ['La Vista Ras El Hekma', 'The Gryd', 'White Residence', 'Jazebeya', 'Skyramp'];
const AVOID = /(plan|floor|map|layout|interior|logo|banner|masterplan|drawing|cad|chair|sofa|room|kitchen)/i;

for (const p of picks) {
  if (!FAILED.includes(p.title)) continue;
  const all = (byId[p.id]?.candidates || []).filter(Boolean);
  // أي بديل غير اللي وقع، ويفضّل بوابة محترمة
  const alt = all.find(u => u !== p.pick && !AVOID.test(u) &&
      /(realestate\.eg|nawy|newcapital-developments|newcairo-developments|flatandvilla|gprproperty|aqarmap|propertyfinder|egyprop|coolproperty|cooingestate)/i.test(u))
    || all.find(u => u !== p.pick && !AVOID.test(u));
  if (alt) {
    console.log(`✏️  ${p.title} -> ${alt.slice(0, 70)}`);
    p.pick = alt;
    try { p.host = new URL(alt).hostname.replace('www.', ''); } catch {}
  } else console.log(`⚠️  ${p.title} — مفيش بديل`);
}
fs.writeFileSync(S + 'picks.json', JSON.stringify(picks, null, 1), 'utf8');
// نطلّع بس اللي وقعوا عشان نرفعهم
const retry = picks.filter(p => FAILED.includes(p.title));
fs.writeFileSync(S + 'retry.json', JSON.stringify(retry, null, 1), 'utf8');
console.log('retry ->', retry.length);
