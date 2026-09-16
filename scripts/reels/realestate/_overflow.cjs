const fs=require('fs'); const {chromium}=require('E:/madmona-app/node_modules/playwright-core');
const D='E:/madmona-app/scripts/reels/realestate/html/';
(async()=>{
  const b=await chromium.connectOverCDP('http://127.0.0.1:9222',{timeout:20000});
  const ctx=await b.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const p=await ctx.newPage(); const bad=[];
  for(const f of fs.readdirSync(D).filter(x=>x.endsWith('.html'))){
    await p.goto('file:///'+D+f); await p.waitForTimeout(350);
    const m=await p.evaluate(()=>({sh:document.body.scrollHeight, sw:document.body.scrollWidth,
      wrap:document.querySelector('.wrap')?.scrollHeight||0}));
    if(m.sh>1082||m.sw>1922) bad.push(f+' h'+m.sh+' w'+m.sw+' wrap'+m.wrap);
  }
  await ctx.close(); await b.close();
  console.log(bad.length?('OVERFLOW:\n'+bad.join('\n')):'all_cards_fit');
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
