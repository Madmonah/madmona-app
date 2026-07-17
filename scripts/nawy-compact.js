// اطبع values مضغوطة: (id, n_images, cover_idx) — الـSQL هيبني الـURLs بنفسه.
const fs = require('fs');
const man = JSON.parse(fs.readFileSync('E:/madmona-app/scripts/nawy-manifest.json','utf8'));
const LOGO = new Set(['Common Haus','Celia','Sadaf','Sky Bridge','Seashore']);
const KEEP = new Set(['MONARK','Ritz New Zayed','I Business Park']);
const rows = [];
for (const m of man) {
  if (!m.files || !m.files.length || KEEP.has(m.name)) continue;
  const n = m.files.length;
  const coverIdx = (LOGO.has(m.name) && n > 1) ? 1 : 0; // اللوجو → الغلاف الصورة اللي بعده
  rows.push(`('${m.our}',${n},${coverIdx})`);
}
console.log(rows.join(',\n'));
