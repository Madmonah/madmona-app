const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const ctx=b.contexts()[0];
 const p=await ctx.newPage();
 await p.setViewportSize({width:390,height:800});
 await p.goto('https://www.madmonacairo.com/',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(8000);
 // 1) الهامبرجر
 await p.click('button[aria-label="القائمة"]').catch(e=>console.log('click err',e.message.slice(0,60)));
 await p.waitForTimeout(2500);
 const drawer = await p.evaluate(()=>{
   const t=document.body.innerText;
   return {opened:/حسابي|تسجيل الدخول|ضيف إعلان|شغلي|وظائف/.test(t), len:t.length};
 });
 console.log('drawer', JSON.stringify(drawer));
 // 2) روابط حسابي
 const links = await p.evaluate(()=>[...document.querySelectorAll('a')].map(a=>({t:(a.innerText||'').trim().slice(0,18),h:a.getAttribute('href')})).filter(x=>/حساب|شغلي|account/i.test(x.t+x.h)).slice(0,8));
 console.log('acct links', JSON.stringify(links));
 await p.screenshot({path:'output/_mobile_drawer.png'});
 await p.close(); await b.close();
})().catch(e=>console.log('ERR',e.message));
