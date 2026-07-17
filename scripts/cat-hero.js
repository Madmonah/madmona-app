// 🖼️ مرشحين هيرو للأقسام من Unsplash (رخصة تجارية مجانية) — 8 لكل قسم للمراجعة بالعين.
const fs = require('fs'), https = require('https');
const OUT = 'E:/madmona-app/scripts/cat-hero'; fs.mkdirSync(OUT,{recursive:true});

const CATS = [
 ['shop-pharmacy','pharmacy shelves medicines'],
 ['sale-furniture-home','modern living room sofa interior'],
 ['sale-furniture-office','modern office workspace interior'],
 ['shop-auto','car showroom'],
 ['shop-misc','retail store shelves products'],
 ['shop-supermarket','supermarket aisle groceries'],
 ['shop-hardware','plumbing tools workbench'],
 ['shop-produce','fresh vegetables fruit market stall'],
 ['shop-car-accessories','car interior detailing'],
 ['shop-motorcycle-parts','motorcycle workshop repair'],
 ['beauty','cosmetics makeup products'],
 ['home-services','handyman tools drill repair'],
];

function getJson(url){ return new Promise((res,rej)=>{
  const req=https.get(url,{headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36','accept':'application/json'}},r=>{
    let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){rej(new Error('bad json: '+d.slice(0,80)))}});});
  req.setTimeout(20000,()=>{req.destroy();rej(new Error('timeout'))}); req.on('error',rej);
});}
function dl(url,dest){ return new Promise((res)=>{
  if(fs.existsSync(dest)) return res(true);
  const f=fs.createWriteStream(dest);
  const req=https.get(url,r=>{
    if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){f.close();try{fs.unlinkSync(dest)}catch{};return dl(r.headers.location,dest).then(res);}
    if(r.statusCode!==200){f.close();try{fs.unlinkSync(dest)}catch{};return res(false)}
    r.pipe(f);f.on('finish',()=>{f.close();res(true)});});
  req.setTimeout(25000,()=>{req.destroy();f.close();try{fs.unlinkSync(dest)}catch{};res(false)});
  req.on('error',()=>{try{fs.unlinkSync(dest)}catch{};res(false)});
});}

(async()=>{
  const manifest={};
  for(const [slug,q] of CATS){
    try{
      // Openverse: مفتوح بلا مفتاح + فلتر رخص تجارية (unsplash napi بقى محتاج auth)
      const j=await getJson('https://api.openverse.org/v1/images/?q='+encodeURIComponent(q)+'&per_page=10&license_type=commercial&mature=false&aspect_ratio=wide');
      const results=(j.results||[]).slice(0,10);
      manifest[slug]=[];
      for(let i=0;i<results.length;i++){
        const r=results[i];
        manifest[slug].push({i, regular:r.url, thumb:r.thumbnail, src:r.source, lic:r.license, desc:(r.title||'').slice(0,60)});
        await dl(r.thumbnail, `${OUT}/${slug}-${i}.jpg`);
      }
      process.stdout.write(slug+':'+results.length+' ');
    }catch(e){ process.stdout.write(slug+':ERR('+e.message.slice(0,40)+') '); }
    await new Promise(r=>setTimeout(r,500));
  }
  fs.writeFileSync(OUT+'/manifest.json', JSON.stringify(manifest,null,1));
  console.log('\ndone');
})();
