const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const ctx=b.contexts()[0];
 const p=await ctx.newPage();
 for(const W of [360,390,412]){
  await p.setViewportSize({width:W,height:800});
  await p.goto('https://www.madmonacairo.com/',{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForTimeout(7000);
  const r=await p.evaluate(()=>{
    const menu=[...document.querySelectorAll('button[aria-label]')].find(b=>b.getAttribute('aria-label')==='القائمة');
    const hdr=document.querySelector('header');
    const box=menu?menu.getBoundingClientRect():null;
    const inView = box ? (box.left>=0 && box.right<=innerWidth && box.width>0) : false;
    const topEl = box ? document.elementFromPoint(box.left+box.width/2, box.top+box.height/2) : null;
    return { w:innerWidth, menuFound:!!menu, box: box?{l:Math.round(box.left),r:Math.round(box.right),w:Math.round(box.width)}:null,
             inView, hitsMenu: topEl ? (topEl===menu || menu?.contains(topEl)) : null,
             hdrScrollW: hdr?hdr.scrollWidth:null, hdrClientW: hdr?hdr.clientWidth:null };
  });
  console.log(JSON.stringify(r));
 }
 await p.close(); await b.close();
})().catch(e=>console.log('ERR',e.message));
