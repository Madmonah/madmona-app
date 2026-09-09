const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const ctx=b.contexts()[0]; const p=await ctx.newPage();
 const errs=[], fails=[];
 p.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,160)); });
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message.slice(0,160)));
 p.on('response',r=>{ if(r.status()>=400) fails.push(r.status()+' '+r.url().slice(0,100)); });
 await p.goto('https://www.madmonacairo.com/login',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(8000);
 console.log(JSON.stringify({errs:errs.slice(0,6), fails:fails.slice(0,6), text:(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,200)},null,1));
 await p.close(); await b.close();
})().catch(e=>console.log('ERR',e.message));
