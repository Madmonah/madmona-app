// Shrink Nawy images for web, and emit SQL that sets cover+media+geo.
// Brand-logo covers (index 0 is a logo, not a building) → use index 1 as cover.
const fs = require('fs'), { execSync } = require('child_process');
const man = JSON.parse(fs.readFileSync('E:/madmona-app/scripts/nawy-manifest.json','utf8'));

// أغلفة البرند (شعار مش مبنى) — الغلاف ياخد الصورة اللي بعدها
const LOGO_COVER = new Set(['Common Haus','Celia','Sadaf','Sky Bridge','Seashore']);

// ⚠️ رفع المجلد المتكرر بيحط nawy-media جوه nawy/ — فالمسار فيه الاتنين
const B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/nawy/nawy-media/';
let sql = '-- 🗺️ صور + موقع من Nawy (اتراجعوا بالعين). المطابقة اتأكدت بالمطوّر.\nbegin;\n';
let n = 0;
for (const m of man) {
  if (!m.files || !m.files.length) continue;
  const slug = m.our.slice(0,8);
  let files = m.files.slice();
  if (LOGO_COVER.has(m.name) && files.length > 1) files = [...files.slice(1), files[0]]; // ادفع اللوجو لآخر المعرض
  const urls = files.map(f => B + f);
  const cover = urls[0];
  const media = JSON.stringify(urls.map(u => ({type:'image', url:u})));
  const geo = (m.lat && m.lng) ? `, lat=${m.lat}, lng=${m.lng}` : '';
  sql += `update property_market_items set cover_url='${cover}', media='${media.replace(/'/g,"''")}'::jsonb, nawy_compound_id=${m.nawyId}${geo}, updated_at=now() where id='${m.our}';\n`;
  n++;
}
sql += 'commit;\n';
fs.writeFileSync('E:/madmona-app/scripts/nawy.sql', sql);
console.log('SQL for', n, 'projects ->', 'nawy.sql');
