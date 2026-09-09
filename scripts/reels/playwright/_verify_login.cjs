const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const ctx=b.contexts()[0];
 const p=await ctx.newPage(); await p.setViewportSize({width:420,height:900});
 const out={};
 await p.goto('https://www.madmonacairo.com/auth/login?redirect=/marketplace',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(6000); out.authLoginLandsOn=p.url();
 await p.goto('https://www.madmonacairo.com/login',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(7000);
 out.login = await p.evaluate(()=>{
   const t=document.body.innerText;
   const btns=[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean);
   return {title:/ادخل أو اعمل حساب/.test(t), google:/Google/.test(t), firstButton:btns[0]||null, buttons:btns.slice(0,4)};
 });
 await p.goto('https://www.madmonacairo.com/supplier/erp',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(6000); out.erpLandsOn=p.url();
 await p.screenshot({path:'output/_login_live.png'});
 console.log(JSON.stringify(out,null,1));
 await p.close(); await b.close();
})().catch(e=>console.log('ERR',e.message));
