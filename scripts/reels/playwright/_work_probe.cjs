const {chromium}=require('playwright');
const TOKEN=process.argv[2];
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const ctx=b.contexts()[0]; const p=await ctx.newPage(); await p.setViewportSize({width:412,height:900});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100))); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,100)); });
 await p.goto('https://www.madmonacairo.com/home',{waitUntil:'domcontentloaded',timeout:60000});
 await p.evaluate((t)=>localStorage.setItem('madmona_token',t),TOKEN);
 await p.goto('https://www.madmonacairo.com/account/work',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(12000);
 const out={url:p.url(), spinner:!!(await p.$('.animate-spin')), text:(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,220), errors:errs.slice(0,4)};
 // تاب الشريط السفلي الخامس
 out.bottomTabs = await p.evaluate(()=>[...document.querySelectorAll('nav a')].map(a=>(a.innerText||'').trim()+'→'+a.getAttribute('href')).filter(Boolean).slice(0,8));
 await p.screenshot({path:'output/_work_emp.png'});
 await p.evaluate(()=>localStorage.removeItem('madmona_token'));
 console.log(JSON.stringify(out,null,1));
 await p.close(); await b.close();
})().catch(e=>console.log('ERR',e.message));
