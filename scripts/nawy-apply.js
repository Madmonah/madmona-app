// اطبع UPDATEs للصور — بس للمشاريع اللي أغلفتها الحالية ضعيفة.
// نسيب اللي غلافه من بروشور المطوّر (content-images/projects/ = رِندر منتقى بإيد).
const fs = require('fs');
const man = JSON.parse(fs.readFileSync('E:/madmona-app/scripts/nawy-manifest.json','utf8'));
const LOGO = new Set(['Common Haus','Celia','Sadaf','Sky Bridge','Seashore']);
// المشاريع اللي غلافها الحالي من بروشور احترافي منتقى — نسيبها زي ما هي
const KEEP = new Set(['MONARK','Ritz New Zayed','I Business Park']); // Common Haus لوجو فنسيبه لـNawy
const B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/nawy/nawy-media/';
const rows = [];
for (const m of man) {
  if (!m.files || !m.files.length || KEEP.has(m.name)) continue;
  let files = m.files.slice();
  if (LOGO.has(m.name) && files.length > 1) files = [...files.slice(1), files[0]];
  const urls = files.map(f => B + f);
  const media = JSON.stringify(urls.map(u => ({type:'image', url:u}))).replace(/'/g, "''");
  rows.push(`('${m.our}'::uuid,'${urls[0]}','${media}'::jsonb)`);
}
const sql = `update property_market_items p set cover_url=v.c, media=v.m, updated_at=now()
from (values\n${rows.join(',\n')}\n) as v(id,c,m) where v.id=p.id;`;
fs.writeFileSync('E:/madmona-app/scripts/nawy-img.sql', sql);
console.log('image UPDATE for', rows.length, 'projects');
