// نزّل كل صور الواتساب اللي لسه في المعارض عشان نراجعها بالعين.
const fs = require('fs'), https = require('https');
const OUT = 'E:/madmona-app/scripts/wa-audit'; fs.mkdirSync(OUT,{recursive:true});
// [مشروع, URL] — من استعلام الداتابيز
const IMGS = [
 ['GlowTerra','wa-inbound/1783844260324-NEM0U4NDcA.jpg'],
 ['GlowTerra','wa-inbound/1783844261194-QzM0JERDMA.jpg'],
 ['Veni','wa-inbound/1783794229387-NCOTdDOUQA.jpg'],
 ['Lyx','wa-inbound/1783842211370-FFQUNCRTAA.jpg'],
 ['IVY','wa-inbound/1783844115743-ZEMTQ3NjMA.jpg'],
 ['IVY','wa-inbound/1783844179949-Q2NENFMjUA.jpg'],
 ['IVY','wa-inbound/1783844180337-YzQzAzMDcA.jpg'],
 ['IVY','wa-inbound/1783844181015-E5RTA1MjQA.jpg'],
 ['IVY','wa-inbound/1783844180769-YzMjVEMjMA.jpg'],
 ['IVY','wa-inbound/1783844180465-AzM0U3RjQA.jpg'],
 ['IVY','wa-inbound/1783844182572-g2MjRENUEA.jpg'],
 ['IVY','wa-inbound/1783844183001-JCQTk1NzUA.jpg'],
 ['IVY','wa-inbound/1783844183568-YwQkI2REEA.jpg'],
 ['IVY','wa-inbound/1783844183938-I0RjFCMUEA.jpg'],
 ['IVY','wa-inbound/1783844182981-dEQkQ2OEMA.jpg'],
 ['IVY','wa-inbound/1783844184017-E2NDU2NTgA.jpg'],
 ['IVY','wa-inbound/1783844184729-E4MDNBMDcA.jpg'],
 ['IVY','wa-inbound/1783864599643-lENTE3MzkA.jpg'],
 ['IVY','wa-inbound/1783864603818-ZGMjk1MEIA.jpg'],
 ['IVY','wa-inbound/1783864693909-hEODU2NUUA.jpg'],
 ['IVY','wa-inbound/1783864694985-k5NzZFMEIA.jpg'],
 ['IVY','wa-inbound/1783864695514-RFQ0YzMjcA.jpg'],
 ['IVY','wa-inbound/1783864697715-VDODYzQzcA.jpg'],
 ['IVY','wa-inbound/1783948765006-UyQTM3NUQA.jpg'],
 ['Nedit','wa-inbound/1783842210460-NBREU5RDgA.jpg'],
 ['Nedit','wa-inbound/1783860195741-A0RUMzMTgA.jpg'],
 ['Pause','wa-inbound/1783858917517-EzQTgyN0QA.jpg'],
 ['Pause','wa-inbound/1783859031088-gzNjEwMzIA.jpg'],
 ['Jazeel','wa-inbound/1783810441277-VCRjBEQzAA.jpg'],
 ['Axin','wa-inbound/1783842286470-YyRTI3QkEA.jpg'],
 ['NOLL','wa-inbound/1783810732014-g4MTQ0QzYA.jpg'],
 ['TRIHUB','wa-inbound/1783794284460-AxRTU5MDIA.jpg'],
 ['TRIHUB','wa-inbound/1783794284418-JCMEM5MTEA.jpg'],
 ['TRIHUB','wa-inbound/1783794284600-U2M0UyRUEA.jpg'],
 ['TRIHUB','wa-inbound/1783794285105-I3QUUwQjcA.jpg'],
 ['TRIHUB','wa-inbound/1783794285261-A1RTEyN0EA.jpg'],
 ['TRIHUB','wa-inbound/1783794285501-U1N0FBMUMA.jpg'],
 ['TRIHUB','wa-inbound/1783794286189-JDOTU2RjMA.jpg'],
 ['TRIHUB','wa-inbound/1783794286210-Y4Q0Q1RjEA.jpg'],
 ['TRIHUB','wa-inbound/1783794286796-U0REQ0MDcA.jpg'],
 ['TRIHUB','wa-inbound/1783794287204-UxMkJGRkEA.jpg'],
 ['TRIHUB','wa-inbound/1783794310895-FDRTk1MTEA.jpg'],
 ['TRIHUB','wa-inbound/1784020991429-M1NzRDQUYA.jpg'],
 ['TRIHUB','wa-inbound/1784106988620-Q0RjVGQzMA.jpg'],
 ['Island22','wa-inbound/1783828127000-FFNzBCNjIA.jpg'],
];
const B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/';
function dl(url, dest){ return new Promise((res)=>{
  if (fs.existsSync(dest)) return res(true);
  const f=fs.createWriteStream(dest);
  const req=https.get(url, r=>{ if(r.statusCode!==200){f.close();try{fs.unlinkSync(dest)}catch{};return res(false)} r.pipe(f); f.on('finish',()=>{f.close();res(true)}) });
  req.setTimeout(20000,()=>{req.destroy();f.close();try{fs.unlinkSync(dest)}catch{};res(false)});
  req.on('error',()=>{try{fs.unlinkSync(dest)}catch{};res(false)});
});}
(async()=>{
  let ok=0;
  for (let i=0;i<IMGS.length;i++){
    const [proj,path]=IMGS[i];
    const fn=`${String(i).padStart(2,'0')}-${proj}-${path.split('-').pop()}`;
    if (await dl(B+path, `${OUT}/${fn}`)) ok++; process.stdout.write('+');
  }
  console.log('\n',ok,'/',IMGS.length);
})();
