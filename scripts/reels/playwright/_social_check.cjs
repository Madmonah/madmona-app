const {chromium}=require('E:/madmona-app/node_modules/playwright');
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9223',{timeout:20000}); const ctx=b.contexts()[0];
 const p=await ctx.newPage(); await p.goto('https://www.tiktok.com/tiktokstudio/content',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(8000);
 const tt=await p.evaluate(()=>[...document.querySelectorAll('a')].map(a=>a.innerText.trim().replace(/\s+/g,' ').slice(0,40)).filter(t=>t.length>20).slice(0,8));
 console.log('TT:',JSON.stringify(tt));
 await p.goto('https://www.instagram.com/madmona.cairo/reels/',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(8000);
 const ig=await p.evaluate(()=>({n:document.querySelectorAll('a[href*="/reel/"]').length, first:[...document.querySelectorAll('a[href*="/reel/"]')].slice(0,6).map(a=>a.getAttribute('href'))}));
 console.log('IG:',JSON.stringify(ig)); await p.close();})().catch(e=>{console.error('ERR',e.message.slice(0,200));process.exit(1)});
