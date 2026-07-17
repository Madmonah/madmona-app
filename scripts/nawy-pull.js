// 🗺️ اسحب موقع + صور المشاريع من Nawy — Node مستقل (مفيش auth على API).
// المنهج: طابق بالاسم، اتأكد بالمطوّر، اسحب التفاصيل، اطبع تقرير JSON.
// ماتلمسش الداتابيز — الـUPDATE بيتعمل بعد مراجعة بشرية للتقرير.
const fs = require('fs'), https = require('https');

const OURS = JSON.parse(fs.readFileSync('E:/madmona-app/scripts/ourprojects.json', 'utf8'));
const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9]/g,'');

// أسماء بديلة للمطوّر (نحن ⟷ Nawy) — القيمة موحّدة
const DA = [['upwyde','upwyde'],['arqa','arqa'],['royal','royal'],['samco','samco'],['pre','pre'],
  ['hdp','housing'],['housing','housing'],['kulture','kulture'],['lavista','lavista'],['vista','lavista'],
  ['misritalia','misr'],['misr','misr'],['italia','misr'],['palmhills','palm'],['palm','palm'],
  ['ora','ora'],['mountain','mountain'],['hassanallam','hassan'],['hassan','hassan'],['sodic','sodic'],
  ['njd','jersey'],['jersey','jersey'],['newplan','newplan'],['tatweer','tatweer'],['hydepark','hyde'],
  ['hyde','hyde'],['inertia','inertia'],['equinox','equinox'],['ora','ora'],['talaat','talaat'],
  ['moustafa','talaat'],['marasem','marasem'],['madinetnasr','nasr'],['nasr','nasr'],['emaar','emaar'],
  ['betterhome','better'],['better','better'],['cred','cred'],['alfath','fath'],['fath','fath'],
  ['fivepalm','fivepalm'],['land','land'],['agec','agec'],['matter','matter'],['noll','noll'],
  ['gturban','gturban'],['aqarmasr','aqar'],['qawafel','qawafel'],['vie','vie'],['hazek','hazek']];
function devKey(s){ s=norm(s); for(const [k,v] of DA){ if(s.includes(k)) return v; } return s.slice(0,6)||'?'; }

function get(url){ return new Promise((res,rej)=>{ https.get(url,{headers:{accept:'application/json'}},r=>{
  let b=[]; r.on('data',d=>b.push(d)); r.on('end',()=>res({status:r.statusCode, buf:Buffer.concat(b)})); }).on('error',rej); }); }
function cleanPath(p){ if(!p) return null; const m=String(p).match(/cooingestate\.com\/(.+)$/); return m? m[1].split('?')[0]: null; }

(async () => {
  console.log('fetching Nawy compound list...');
  const lr = await get('https://webapi.nawy.com/api/compounds?page_size=3000&page_number=1');
  const list = JSON.parse(lr.buf.toString());
  const arr = Array.isArray(list)? list : (list.values||list.data||[]);
  console.log('nawy compounds:', arr.length);
  const idx = arr.map(c=>({id:c.id, name:c.name, n:norm(c.name)}));

  const report = [];
  for (const [our, name, ourDev] of OURS) {
    const q = norm(name);
    let hit = idx.find(c=>c.n===q);
    if (!hit) hit = idx.filter(c=>q.length>=5 && (c.n.includes(q)||q.includes(c.n))).sort((a,b)=>a.n.length-b.n.length)[0];
    if (!hit) { report.push({our, name, matched:false}); continue; }

    const r = await get('https://webapi.nawy.com/api/compounds/'+hit.id);
    if (r.status!==200) { report.push({our, name, matched:true, nawyId:hit.id, err:'http'+r.status}); continue; }
    const co = JSON.parse(r.buf.toString()); const c = co.compound||co;
    const nawyDev = c.developer?.name || '';
    const devOk = !ourDev || devKey(ourDev)===devKey(nawyDev);
    const imgs = (c.compound_images||[]).map(i=>cleanPath(i.image_path||i.image)).filter(Boolean);
    report.push({
      our, name, matched:true, nawyId:hit.id, nawyName:c.name,
      ourDev, nawyDev, devOk,
      area: c.parent_area?.name || c.area?.name || null,
      lat: c.lat, lng: c.long,
      cover: cleanPath(c.cover_image_web_path || c.cover_image_path),
      imgs: imgs.slice(0,10),
    });
    process.stdout.write('.');
  }
  fs.writeFileSync('E:/madmona-app/scripts/nawy-report.json', JSON.stringify(report,null,1));
  const ok = report.filter(r=>r.matched && !r.err);
  console.log('\n--- REPORT ---');
  console.log('our projects:', OURS.length, '| matched:', ok.length,
    '| unmatched:', report.filter(r=>!r.matched).length);
  console.log('devMatch:', ok.filter(r=>r.devOk).length, '| devMISMATCH:', ok.filter(r=>!r.devOk).length);
  console.log('withGeo:', ok.filter(r=>r.lat).length, '| withCover:', ok.filter(r=>r.cover).length);
  console.log('\nDEV MISMATCHES (need review):');
  ok.filter(r=>!r.devOk).forEach(r=>console.log(`  ${r.name}: نحن=${r.ourDev} | Nawy=${r.nawyDev} (${r.nawyName})`));
  console.log('\nUNMATCHED:', report.filter(r=>!r.matched).map(r=>r.name).join(', '));
})();
