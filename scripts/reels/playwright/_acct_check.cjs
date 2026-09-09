const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const ctx=b.contexts()[0];
 const p=await ctx.newPage();
 const errs=[];
 p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,120))});
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message.slice(0,120)));
 await p.setViewportSize({width:390,height:800});
 await p.goto('https://www.madmonacairo.com/account',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(9000);
 const r=await p.evaluate(()=>({url:location.pathname, txt:document.body.innerText.replace(/\s+/g,' ').slice(0,220)}));
 console.log(JSON.stringify(r));
 console.log('errors', JSON.stringify(errs.slice(0,5)));
 await p.close(); await b.close();
})().catch(e=>console.log('ERR',e.message));
