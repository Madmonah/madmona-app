const {chromium}=require('playwright');
const TOKEN=process.argv[2];
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const ctx=b.contexts()[0]; const p=await ctx.newPage(); await p.setViewportSize({width:412,height:900});
 await p.goto('https://www.madmonacairo.com/home',{waitUntil:'domcontentloaded',timeout:60000});
 await p.evaluate((t)=>localStorage.setItem('madmona_token',t),TOKEN);
 await p.goto('https://www.madmonacairo.com/account',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(12000);
 const spinners = await p.evaluate(()=>[...document.querySelectorAll('.animate-spin')].map(e=>{const c=e.closest('section,div[class*=rounded]')||e.parentElement;return (c?.innerText||'').replace(/\s+/g,' ').slice(0,80)}));
 await p.goto('https://www.madmonacairo.com/',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(6000);
 await p.click('button[aria-label="القائمة"]');
 await p.waitForTimeout(8000);
 const drawer = await p.evaluate(()=>{const d=[...document.querySelectorAll('[role=dialog],aside,nav')].map(x=>x.innerText.replace(/\s+/g,' ')).filter(t=>t.length>20).sort((a,b)=>b.length-a.length)[0]||document.body.innerText.replace(/\s+/g,' ');return d.slice(0,520)});
 await p.screenshot({path:'output/_drawer_emp.png'});
 await p.evaluate(()=>localStorage.removeItem('madmona_token'));
 console.log(JSON.stringify({spinners, drawer},null,1));
 await p.close(); await b.close();
})().catch(e=>console.log('ERR',e.message));
