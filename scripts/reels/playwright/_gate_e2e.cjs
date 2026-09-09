const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const ctx=b.contexts()[0]; const p=await ctx.newPage(); await p.setViewportSize({width:412,height:900});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
 await p.goto('https://www.madmonacairo.com/login',{waitUntil:'domcontentloaded',timeout:60000});
 await p.evaluate(()=>{ try{localStorage.clear()}catch{} });
 await p.goto('https://www.madmonacairo.com/login',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForSelector('input[autocomplete="username"]',{timeout:20000});
 await p.fill('input[autocomplete="username"]','01999888779'); await p.fill('input[autocomplete="current-password"]','Madmona!2026');
 await p.click('button:has-text("دخول")'); await p.waitForTimeout(9000);
 const out={landedOn:p.url()};
 // الدرج من الهوم
 await p.goto('https://www.madmonacairo.com/',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(6000);
 await p.click('button[aria-label="القائمة"]'); await p.waitForTimeout(6000);
 const d=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 out.drawer={ hasMadmonaPanel:/لوحة مضمونة|لوحة الإدارة|الفينانس|كل الشاشات/.test(d), hasMyWork:/شغلي/.test(d) };
 // لوحة الأدمن
 await p.goto('https://www.madmonacairo.com/admin/listings',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(8000);
 const a=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 out.adminListings={ blocked:/دي لوحة فريق مضمونة|سجّل دخولك/.test(a), showsAdminNav:/القيادة|الاستراتيجية|الليدز/.test(a), url:p.url() };
 // اللوحة الكاملة لبيزنس مضمونة
 await p.goto('https://www.madmonacairo.com/admin/business-finance/c8b7b9d7-6178-4d0c-abdf-66f34b628e9d',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(8000);
 const f=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 out.platformPanel={ blocked:/دي لوحة فريق مضمونة|سجّل دخولك/.test(f), showsModules:/الحسابات والقيود|المرتبات|الفريق/.test(f) };
 // /supplier/erp تحويل
 await p.goto('https://www.madmonacairo.com/supplier/erp',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(7000);
 out.erpRedirect=p.url();
 // مشتريات من العهدة عبر الواجهة
 await p.goto('https://www.madmonacairo.com/account/work',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(10000);
 let t=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 out.custodyBefore=(t.match(/المتبقي\s*([٠-٩0-9,]+)/)||[])[1]||null;
 await p.click('button:has-text("سجّل مشتريات من العهدة")'); await p.waitForTimeout(1500);
 await p.fill('input[placeholder="اشتريت إيه؟"]','أكياس زبالة ومنظفات'); await p.fill('input[placeholder="المبلغ بالجنيه"]','80');
 await p.click('button:has-text("سجّل المشتريات")'); await p.waitForTimeout(7000);
 t=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ');
 out.custodyAfter={ remaining:(t.match(/المتبقي\s*([٠-٩0-9,]+)/)||[])[1]||null, listed:/أكياس زبالة/.test(t) };
 await p.screenshot({path:'output/_gate_e2e.png'});
 out.errors=errs.slice(0,3);
 await p.evaluate(()=>{ try{localStorage.clear()}catch{} });
 console.log(JSON.stringify(out,null,1));
 await p.close(); await b.close();
})().catch(e=>console.log('ERR',e.message));
