// ⬆️ نزّل صور Nawy المطابقة وارفعها لـSupabase، واطبع SQL جاهز للموقع.
// بيستبعد المطابقات الغلط (اتراجعت بالمطوّر) والصور اللي مش رِندر (فلوربلان/خريطة).
const fs = require('fs'), https = require('https'), { execSync } = require('child_process');
const rep = JSON.parse(fs.readFileSync('E:/madmona-app/scripts/nawy-report.json','utf8'));
const OUT = 'E:/madmona-app/scripts/nawy-media'; fs.mkdirSync(OUT,{recursive:true});
const S3 = 'https://s3.eu-central-1.amazonaws.com/prod.images.cooingestate.com/';

// ❌ مطابقات غلط اتأكدت منها بالمطوّر — تتستبعد
const REJECT = new Set(['Park Vie','The Capital Way','Lake View Residence']);

function dl(url, dest){ return new Promise((res)=>{
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return res(true);
  const f=fs.createWriteStream(dest);
  const req = https.get(url, r=>{ if(r.statusCode!==200){ f.close(); try{fs.unlinkSync(dest);}catch{} return res(false);} r.pipe(f); f.on('finish',()=>{f.close(); res(true);}); });
  req.setTimeout(20000, ()=>{ req.destroy(); f.close(); try{fs.unlinkSync(dest);}catch{} res(false); });
  req.on('error',()=>{ try{fs.unlinkSync(dest);}catch{} res(false); }); }); }

(async () => {
  const usable = rep.filter(r => r.matched && !r.err && !REJECT.has(r.name) && r.devOk);
  console.log('usable projects:', usable.length);
  const manifest = [];
  for (const p of usable) {
    const slug = p.our.slice(0,8);
    const urls = [p.cover, ...(p.imgs||[])].filter(Boolean);
    const seen = new Set(); const local = [];
    let i = 0;
    for (const rel of urls) {
      if (seen.has(rel)) continue; seen.add(rel);
      const fn = `${slug}-${i}.jpg`;
      const ok = await dl(S3+rel, `${OUT}/${fn}`);
      if (ok) { local.push(fn); i++; }
      if (i >= 8) break;
    }
    manifest.push({ our:p.our, name:p.name, lat:p.lat, lng:p.lng, nawyId:p.nawyId, files:local });
    process.stdout.write(local.length? '+':'-');
  }
  fs.writeFileSync('E:/madmona-app/scripts/nawy-manifest.json', JSON.stringify(manifest,null,1));
  console.log('\ndownloaded for', manifest.filter(m=>m.files.length).length, 'projects');
})();
