const fs=require('fs'); const {execFileSync,spawnSync}=require('child_process'); const ff=require('E:/madmona-app/node_modules/ffmpeg-static'); const {chromium}=require('E:/madmona-app/node_modules/playwright');
const D='E:/madmona-app/scripts/reels/playwright/erp/'; const dur=f=>{const m=spawnSync(ff,['-i',f],{encoding:'utf8'}).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);return m?(+m[2])*60+parseFloat(m[3]):0};
const groups=[['g1',['s01_dashboard','s02_accounting','s03_expenses','s04_cash_recon','s05_inventory']],['g2',['s06_crm','s07_at_risk','s08_team','s09_attendance']],['g3',['s10_schedule','s11_monitor','s12_payroll','s13_whatsapp']],['g4',['s14_links','s15_setup','s16_end']]];
const len=n=>fs.readFileSync(D+'vo/'+n+'.txt','utf8').length;
const segs=[{img:'card_intro',len:3.0}];
for(const [g,scr] of groups){const total=dur(D+'vo/'+g+'.mp3'); const w=scr.map(len); const sum=w.reduce((a,b)=>a+b,0); scr.forEach((s,i)=>segs.push({img:s,len:+(total*w[i]/sum).toFixed(2)}));}
segs[segs.length-1].len+=1.5;
console.log(segs.map(s=>s.img+':'+s.len).join(' '));
(async()=>{
  // cards
  const html=(title,sub,foot)=>`<html dir=rtl><head><meta charset=utf-8><style>body{margin:0;width:1920px;height:1080px;background:#f6f8f3;font-family:'Segoe UI',Tahoma,Arial,sans-serif;display:flex;align-items:center;justify-content:center;color:#0f3d2e}.w{text-align:center}.logo{width:150px;height:150px;border-radius:50%;background:#fff;margin:0 auto 34px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 40px rgba(0,0,0,.08)}.logo img{width:110px}.t{font-size:92px;font-weight:900;line-height:1.25}.s{font-size:46px;color:#1f7a5c;margin-top:22px;font-weight:700}.f{font-size:34px;color:#556;margin-top:40px}</style></head><body><div class=w><div class=logo><img src="file:///E:/madmona-app/public/madmona-logo.png"></div><div class=t>${title}</div><div class=s>${sub}</div><div class=f>${foot}</div></div></body></html>`;
  fs.writeFileSync(D+'card_intro.html',html('برنامج إدارة البيزنس','شرح بالشاشات — حسابات · عملاء · موظفين · واتساب','مضمونة · madmonacairo.com/system'));
  fs.writeFileSync(D+'card_end.html',html('العرض على السوق مجاني','برنامج الإدارة كامل بـ١٠٠٠ ج بدل كتير — لعدد محدود','madmonacairo.com/pro'));
  const b=await chromium.connectOverCDP('http://127.0.0.1:9222',{timeout:20000}); const ctx=await b.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1}); const p=await ctx.newPage();
  for(const c of ['card_intro','card_end']){await p.goto('file:///'+D+c+'.html'); await p.waitForTimeout(800); await p.screenshot({path:D+'frames/'+c+'.png'});}
  await ctx.close(); await b.close();
  fs.copyFileSync(D+'frames/card_end.png',D+'frames/s16_end.png');
  // segments
  fs.mkdirSync(D+'seg',{recursive:true}); const list=[];
  segs.forEach((s,i)=>{const out=D+'seg/'+String(i).padStart(2,'0')+'.mp4'; const fr=Math.round(s.len*30); const isCard=/card|s16/.test(s.img);
    const vf=isCard?`scale=1920:1080,format=yuv420p`:`scale=1920:-2,crop=1920:1080:0:'min(ih-1080,27*t/${s.len})',format=yuv420p`;
    execFileSync(ff,['-y','-v','error','-loop','1','-framerate','30','-i',D+'frames/'+s.img+'.png','-t',String(s.len),'-vf',vf,'-r','30','-c:v','libx264','-preset','veryfast','-crf','20',out]); list.push("file '"+out+"'"); process.stdout.write('.');});
  fs.writeFileSync(D+'seg/list.txt',list.join('\n'));
  execFileSync(ff,['-y','-v','error','-f','concat','-safe','0','-i',D+'seg/list.txt','-c','copy',D+'video_only.mp4']);
  // audio: 3s silence + g1..g4
  execFileSync(ff,['-y','-v','error','-f','lavfi','-t','3','-i','anullsrc=r=44100:cl=mono','-c:a','libmp3lame',D+'vo/silence.mp3']);
  fs.writeFileSync(D+'vo/list.txt',['silence','g1','g2','g3','g4'].map(n=>"file '"+D+'vo/'+n+".mp3'").join('\n'));
  execFileSync(ff,['-y','-v','error','-f','concat','-safe','0','-i',D+'vo/list.txt','-c:a','libmp3lame','-b:a','128k',D+'vo/full.mp3']);
  execFileSync(ff,['-y','-v','error','-i',D+'video_only.mp4','-i',D+'vo/full.mp3','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',D+'../output/madmona-erp-crm-screens.mp4']);
  console.log('\nDONE video',dur(D+'video_only.mp4').toFixed(1),'audio',dur(D+'vo/full.mp3').toFixed(1));
})().catch(e=>{console.error(e);process.exit(1)});
