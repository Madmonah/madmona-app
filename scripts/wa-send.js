// إرسال رسايل واتساب عبر CDP (Chrome على 9222) — للـ 5 ليدز الجداد
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const LOG = 'E:\\madmona-app\\scripts\\wa-send.log';
const log = (m) => { fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${m}\n`); };
const safe = async (fn, d=null) => { try { return await fn(); } catch(e){ return d; } };

const MSG = `أهلاً 🙌 أنا من مضمونة — شفنا كومنتك في بوست العقارات على جروب The Society Of Real Estate.

مضمونة عايزة تشتغل معاكم كـ بروكر عقاري وقناة بيع وتسويق لمشروعكم (فريق سيلز + منصة + قاعدة عملاء)، وننزّل مشروعكم في «بورصة مضمونة» والماركت بليس:
madmonacairo.com/real-estate/market

محتاجين منك:
• اسم المشروع + المنطقة
• أنواع الوحدات والمساحات
• Price List
• نظام السداد
• صيغة التعاقد مع البروكرز

واللي بيرد عليك هنا اسمه «المارد» 🧞 — مساعد مضمونة الذكي، شغّال ٢٤ ساعة على نفس الرقم ده (01002229982). ابعتله التفاصيل أو الـ Price List وهو هيسجّلها ويجهّز صفحة مشروعك من غير أي فورمات.

وتشرّفنا في مقرنا: ٧ ش سليمان عزمي — النزهة، مصر الجديدة 🤝`;

const NUMS = ['201098786177','201152121500','201108581711','201011923511','201097807291'];

(async () => {
  fs.writeFileSync(LOG, '');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  // دوّر على تاب واتساب أو افتح واحد
  let pages = await browser.pages();
  let wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) { wa = await browser.newPage(); await wa.goto('https://web.whatsapp.com/', { waitUntil:'domcontentloaded', timeout:60000 }); }
  await safe(()=>wa.bringToFront());
  await new Promise(r=>setTimeout(r,6000));
  // اتأكد إن واتساب مسجّل دخول
  const loggedIn = await safe(()=>wa.evaluate(()=> !!document.querySelector('#pane-side')), false);
  log('WA loggedIn=' + loggedIn);
  if (!loggedIn) { log('NOT_LOGGED_IN — abort'); browser.disconnect(); return; }

  for (const num of NUMS) {
    const url = 'https://web.whatsapp.com/send?phone=' + num + '&text=' + encodeURIComponent(MSG);
    await safe(()=>wa.goto(url, { waitUntil:'domcontentloaded', timeout:60000 }));
    // استنى صندوق الكتابة يتعمّر بالنص
    let ok=false;
    for (let i=0;i<40;i++){
      await new Promise(r=>setTimeout(r,700));
      const st = await safe(()=>wa.evaluate(()=>{
        const b=document.querySelector('#main footer div[contenteditable="true"]');
        const send=document.querySelector('#main footer [data-icon="wds-ic-send-filled"]');
        return { hasBox: !!b, len: b?b.innerText.length:0, hasSend: !!send };
      }), {hasBox:false});
      if (st.hasBox && st.len>20 && st.hasSend){ ok=true; break; }
    }
    if(!ok){ log('SKIP '+num+' (box not ready / invalid number)'); continue; }
    const sent = await safe(()=>wa.evaluate(()=>{
      const ic=document.querySelector('#main footer [data-icon="wds-ic-send-filled"]');
      (ic.closest('button')||ic.closest('[role="button"]')).click();
      return true;
    }), false);
    await new Promise(r=>setTimeout(r,2500));
    const empty = await safe(()=>wa.evaluate(()=>{ const b=document.querySelector('#main footer div[contenteditable="true"]'); return b? b.innerText.trim()==='':false; }), false);
    log('SEND '+num+' clicked='+sent+' emptied='+empty);
    await new Promise(r=>setTimeout(r, 3000));
  }
  log('DONE');
  browser.disconnect();
})().catch(e=>{ log('FATAL '+e.message); process.exit(1); });
