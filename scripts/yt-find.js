// 🎬 دوّر على فيديو يوتيوب رسمي لكل مشروع — من ytInitialData بتاع صفحة البحث.
// القبول: عنوان الفيديو لازم يحتوي اسم المشروع + مفيش كلمات تحذير/نصب.
// بونص كبير لو القناة قناة المطوّر. النتيجة: yt-report.json للمراجعة بالعين.
const fs = require('fs'), https = require('https');

// [id, استعلام البحث, [بدائل اسم المشروع — أي واحد يكفي], [توكنز المطوّر للبونص]]
const P = [
 ['b136e388-d011-48f2-9370-c0ac289188ba','Amaz Business Complex العاصمة الإدارية',['amaz'],['alfth','الفتح']],
 ['7dbee77e-0b79-41b4-8064-16cee7ecfea4','Annex 26 Mall ARQA New Cairo',['annex'],['arqa','أركا']],
 ['e98f60a7-f369-4810-8ac8-588cfb708cea','Axin Business Complex العاصمة الإدارية',['axin'],[]],
 ['0df87f11-d2f8-406d-b295-6ac94338d884','Capital Prime Mall Royal العاصمة',['capitalprime'],['royal','رويال']],
 ['bb8cc3a3-14ff-4729-a8f5-6c9e6c0f50b9','Cinco Compound Upwyde New Cairo',['cinco','سينكو'],['upwyde','أبوايد']],
 ['87c8c3d7-45b5-4294-8454-8460429d869e','Common Haus Upwyde Sheikh Zayed',['commonhaus'],['upwyde']],
 ['ba44acad-fa16-42c1-8e70-09c849302ae2','Anakaji New Capital Aqar Masr كمبوند اناكاجي',['anakaji','اناكاجي','أناكاجي'],['aqarmasr','عقارمصر']],
 ['f621c21c-eaba-4cc1-ab68-455725413532','District Palm Five Palm العاصمة',['districtpalm'],['fivepalm']],
 ['16fb80fd-f7b8-4542-9a75-dd2156697525','Ever New Cairo Cred كمبوند إيفر',['ever','إيفر','ايفر'],['cred','كريد']],
 ['35bb7983-1221-4c71-a3db-948bbd849232','Glow Terra Towers العاصمة الإدارية',['glowterra','glow'],['gt']],
 ['d8f49582-ac6d-4465-88d4-9e53137e7366','Grand Lane HDP New Cairo كمبوند جراند لين',['grandlane','جراندلين'],['hdp']],
 ['190fe5b5-97ca-4bad-bfdc-ef1ea33de0f9','Green Avenue NJD العاصمة الإدارية',['greenavenue','جرينافينيو'],['njd']],
 ['b42fddcf-0d7b-4dc2-92f2-e4bfcbccb08d','Helio Eye هليوبوليس الجديدة',['helioeye','هليوآي','هليواي'],[]],
 ['e7959915-c86e-477a-8650-bad7478f2568','I Business Park ARQA العاصمة الإدارية',['ibusinesspark','businesspark'],['arqa']],
 ['d6cc5891-8f25-43a3-aded-5c3203636e35','Island 22 HDP القاهرة الجديدة',['island'],['hdp']],
 ['5b3d25d9-0f94-4ff7-b682-ad8e4f06c0d4','Ivoire East PRE Group New Cairo',['ivoire','ايفوار','إيفوار'],['pre']],
 ['ac4589ae-8ad9-461c-bb71-cc8de00f8803','Ivoire West PRE Group Sheikh Zayed',['ivoire','ايفوار','إيفوار'],['pre']],
 ['a67795fa-b3eb-4016-a555-da2895d3889f','IVY Residence AGEC New Zayed',['ivy','ايفي','آيفي'],['agec']],
 ['2085cff6-0053-4a1c-963c-862f4b5b1090','Jamila NJD North Coast الساحل',['jamila','جميلة'],['njd']],
 ['4347dc5d-ba55-4404-829b-f5af9423e210','Jazebeya Upwyde compound',['jazebeya','جازيبيا'],['upwyde']],
 ['51bc5724-5a60-4ab1-a01c-75e9a9485531','Jazeel Residence Al Fath New Capital',['jazeel','جزيل'],['fath','الفتح','afg']],
 ['4ed35ce1-1f5f-48a9-adf3-47c4682834fc','Jazura Samco New Cairo كمبوند جازورا',['jazura','جازورا'],['samco','سامكو']],
 ['aad6ca02-9303-4cea-9870-2456255ba6f1','Lyx Business Complex العاصمة الإدارية',['lyx'],[]],
 ['004fcd07-1d66-452b-8337-ed53b40a4d3b','Maliv Kulture Developments Sheikh Zayed',['maliv','ماليف'],['kulture']],
 ['00b3ab78-0ac4-46ed-afa6-623d6784289e','The Gray Mall HDP القاهرة الجديدة',['thegray','جراي'],['hdp']],
 ['29e33eda-cb61-4852-9190-545db00e5598','Mega Mall R3 العاصمة الإدارية Five Palm',['megamall'],['fivepalm']],
 ['62bc2638-191e-461c-b695-6d3df8baab5e','Monark Mostakbal City Royal Development',['monark','مونارك'],['royal']],
 ['dd70ccdf-e241-49b3-8497-7b7b129feffd','NAJM Compound Royal مستقبل سيتي كمبوند نجم',['najm','نجم'],['royal']],
 ['584252c1-afd0-4518-95f6-c8c85a13c1a1','NOLL Developments compound Egypt',['noll','نول'],['noll']],
 ['56c493fd-a8dc-412e-a9b7-bfdef1c7c22c','Patterns Kulture Sheikh Zayed compound',['patterns','باترنز'],['kulture']],
 ['78cedea9-79f9-4968-8654-b914ecdcc1bc','Prk Vie Upwyde New Cairo',['prkvie','parkvie'],['upwyde']],
 ['69bd9c6e-86da-411d-8749-fa5ee012d873','Ritz New Zayed ARQA compound',['ritz','ريتز'],['arqa']],
 ['01962903-5828-40e6-a7c3-ed474c541bf0','Rivali Samco New Cairo كمبوند ريفالي',['rivali','ريفالي'],['samco']],
 ['a68086c8-0d21-4eff-bc6b-bdea28895a68','Sadaf New Plan North Coast الساحل',['sadaf','صدف'],['newplan','نيوبلان']],
 ['8cce3b7f-1837-47a8-8fda-37fe8cc70c38','Selection Compound PRE Group New Cairo',['selection','سيليكشن'],['pre']],
 ['e375419e-011a-424e-96c0-c7ebdba06784','Sky Bridge Mall Al Fath العاصمة الإدارية',['skybridge','سكايبريدج'],['fath','afg']],
 ['1111c826-9bad-4854-84e0-c0240e58bba7','Skyramp Upwyde Sheikh Zayed',['skyramp','سكايرامب'],['upwyde']],
 ['f6435363-8874-43e6-b229-23271bba7b6d','SQ1 HDP الشويفات القاهرة الجديدة',['sq1'],['hdp']],
 ['397319a3-752f-4419-bed1-b8e4eca1467e','Talda Mostakbal City HDP كمبوند تالدا',['talda','تالدا'],['hdp']],
 ['447c00dc-ba11-48f6-8efc-e2dc5cc540b9','Telal East New Cairo تلال ايست التجمع',['telal','تلال'],['roya','رؤية']],
 ['2d36ea18-87f3-4977-bed8-c4688ecc38de','Telal El Sokhna تلال السخنة',['telal','تلال'],['roya','رؤية']],
 ['ad4eac98-f43f-4ede-b18f-cf17b07b9f6b','The Brooks New Cairo compound ذا بروكس',['brooks','بروكس'],['pre']],
 ['ddf01359-5a99-48c8-8c60-5ebe47966eed','The Five Samco Ain Sokhna',['thefive'],['samco']],
 ['61b27fd6-5ec5-4bf0-b20f-314b5d638118','The Gryd Upwyde New Cairo mall',['gryd','جريد'],['upwyde']],
 ['88a97443-e508-410d-b8d9-1c4658faffae','The Pause Land & More North Coast',['pause','بوز'],['landmore','landandmore']],
 ['eadd092d-0baf-42a1-b746-0d67872ab329','Tri Hub قوافل العاصمة الإدارية',['trihub','تراي هاب','ترايهاب'],['قوافل']],
 ['5fb1083b-912e-4c86-845a-483f2b437cfb','Veni Mall العاصمة الإدارية فيني مول',['veni','فيني'],[]],
 ['1c456f09-58ce-411f-b0e4-b6170dc85b53','Vie Collective Vie Developments New Cairo',['viecollective','viehalo','vie'],['viedevelopments']],
 ['070df8f7-a6d1-4c55-9499-8f36e0198063','White Residence Upwyde Heliopolis',['whiteresidence','وايترزيدنس'],['upwyde']],
 ['ea9fa991-b856-468e-8f3c-161cc87cd1bf','ORO New Capital compound أورو العاصمة',['oro','أورو','اورو'],[]],
 ['90d0f17c-9e5c-466b-90bd-223803a906a6','Eastown Sodic New Cairo ايستاون سوديك',['eastown','ايستاون','إيستاون'],['sodic','سوديك']],
 ['593521d6-502c-445c-8aff-4aa61d45a263','Upmount New Cairo compound اب ماونت',['upmount','ابماونت','أبماونت'],[]],
 ['b3de7090-b542-4664-8625-80f98744feab','El Patio 7 La Vista التجمع الخامس الباتيو ٧',['patio7','الباتيو7'],['lavista','لافيستا']],
 ['88e06513-6269-40ea-9a59-465a3f89fda3','El Patio Oro La Vista Shorouk الباتيو أورو',['patiooro','باتيوأورو','باتيواورو'],['lavista','لافيستا']],
 ['4993dfd5-c570-48f9-b62a-f61d8bb8e90c','Il Bosco Misr Italia New Capital البوسكو',['bosco','بوسكو'],['misritalia','مصرايطاليا']],
 ['988b9fc3-9771-44b1-aa2e-3fd91284c72a','Palm Hills New Cairo بالم هيلز القاهرة الجديدة',['palmhillsnewcairo','بالمهيلزالقاهرة','بالمهيلزنيوكايرو'],['palmhills','بالمهيلز']],
 ['f3c1bec9-d99b-4e7b-8a3f-23ac1355ab86','Bleu Vert New Capital بلوفير العاصمة',['bleuvert','بلوفير'],['sed','السعودية']],
 ['c2361cb0-d6a8-41ca-93b3-e4972dc023a5','Botanica New Zayed compound بوتانيكا زايد',['botanica','بوتانيكا'],[]],
 ['eb45db1b-9ec5-43fa-a7c9-7f33720fc0d2','Taj City Madinet Masr تاج سيتي',['tajcity','تاجسيتي'],['madinetmasr','مدينةنصر','مدينةمصر']],
 ['a73b9006-5721-4ee5-89c7-b5f9503e8b1a','Gardens Plaza Mall جاردنز بلازا',['gardensplaza','جاردنزبلازا'],[]],
 ['86a14009-b414-49db-9f5b-899a138cccf2','Jefaira Inertia North Coast جيفيرا',['jefaira','جيفيرا'],['inertia','إنرشيا']],
 ['f14c4ddb-ccc4-4f25-9d48-5fadc47c5f2d','The Capital Way Equinox العاصمة الإدارية',['capitalway','كابيتالواي'],['equinox']],
 ['3f31ed49-2916-4e75-9e42-57094ea07e20','ZED East Ora New Cairo زيد إيست',['zedeast','زيدإيست','زيدايست'],['ora','أورا']],
 ['9b8aa6e9-0c8d-4799-8943-f497090292e9','Swan Lake Residences Hassan Allam سوان ليك',['swanlake','سوانليك'],['hassanallam','حسنعلام']],
 ['842d1e56-83c7-4f33-9e18-4d3d69860d16','Solare Misr Italia Ras El Hekma سولاري',['solare','سولاري'],['misritalia','مصرايطاليا']],
 ['8c9c6016-7dae-418a-a0ad-246234b477b8','SALT Tatweer Misr North Coast سولت الساحل',['salt','سولت'],['tatweer','تطويرمصر']],
 ['4fa3528a-bbe6-43f6-8c7d-733730f76df1','Seashore Hyde Park Ras El Hekma سي شور',['seashore','سيشور'],['hydepark','هايدبارك']],
 ['eba4aebb-976b-4a33-b8ac-061bb7e0d2a0','Silver Sands Ora North Coast سيلفر ساندس',['silversands','سيلفرساندس'],['ora','أورا']],
 ['893594b7-bfb7-4155-92ba-4eeb384ad7ac','Celia Talaat Moustafa New Capital سيليا',['celia','سيليا'],['talaat','طلعتمصطفى']],
 ['c8da9d85-e9f3-49be-a047-9d970f32ee7d','Talah New Capital compound طلة العاصمة',['talah','طلة'],['newplan']],
 ['066f00fe-61ba-43fd-9e58-e59e8e4c1a57','Fifth Square Al Marasem فيفث سكوير التجمع',['fifthsquare','فيفثسكوير'],['marasem','المراسم']],
 ['78489068-d330-4281-b23d-48992c3e70e9','Vinci Misr Italia New Capital فينشي',['vinci','فينشي'],['misritalia','مصرايطاليا']],
 ['fe58031c-cb70-4ab8-a81d-b0f4c5ea3b3f','Vinia compound Egypt فينيا كمبوند',['vinia','فينيا'],[]],
 ['d0b3cb30-9172-49d7-853f-7de6aaabbcd7','La Vista Ras El Hekma لافيستا راس الحكمة',['hekma','الحكمة'],['lavista','لافيستا']],
 ['c6d32e90-bd4a-4cef-9ede-9e924dfaf0ec','Lake View Residence New Cairo ليك فيو',['lakeview','ليكفيو'],['hazek','الحاذق']],
 ['87039a6e-ab80-4972-aa47-9931edbc02f7','Mountain View iCity New Cairo آي سيتي',['icity','آيسيتي','ايسيتي'],['mountainview','ماونتنفيو']],
 ['52a3df82-47b9-4a89-951c-786dac5f5469','Mountain View Ras El Hekma ماونتن فيو راس الحكمة',['hekma','الحكمة'],['mountainview','ماونتنفيو']],
 ['05df00d8-411f-453c-8ec3-b8565b050917','Mountain View Hyde Park New Cairo',['hydepark','هايدبارك'],['mountainview','ماونتنفيو']],
 ['1dee18ca-7719-4257-bc70-23f02a1a56be','Marassi Emaar North Coast مراسي الساحل',['marassi','مراسي'],['emaar','إعمار','اعمار']],
 ['6324543e-a30d-43e2-99a8-0d2b3ca51dd5','Midtown Condo Better Home New Capital ميدتاون',['midtown','ميدتاون'],['betterhome','بيترهوم']],
 ['3327f0fd-8e8a-4f72-8cd4-44ae03f8d7f0','Hacienda Waters Palm Hills North Coast',['haciendawaters','هاسيندا ووترز','هاسينداووترز'],['palmhills','بالمهيلز']],
 ['97874ad5-f370-4a1e-b843-72c51a0ac78b','Hyde Park New Cairo هايد بارك القاهرة الجديدة',['hydepark','هايدبارك'],['hydepark']],
];

// ⛔ كلمات في العنوان تستبعد الفيديو فوراً (سمعة/سلبي/مراجعات مشكوك فيها)
const BLOCK = ['نصب','احتيال','تحذير','خدعة','عيوب','سلبيات','لا تشتري','ماتشتريش','فضيحة','مشكلة','مشاكل','scam','fraud','warning','lawsuit','قضية','متضررين','هل فعلا','هل فعلاً','الحقيقة الكاملة','قبل ما تشتري','رأيي بصراحة'];

const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9؀-ۿ]/g,'');

// 🔑 InnerTube — الـAPI الداخلي بتاع صفحة يوتيوب نفسها (المفتاح ده عام وموجود في كل صفحة).
// سحب HTML اشتغل ٥ مرات وبعدين يوتيوب بدأ يرجّع صفحة من غير ytInitialData — ده الحل الثابت.
function ytSearch(query){ return new Promise((res,rej)=>{
  const body = JSON.stringify({context:{client:{clientName:'WEB',clientVersion:'2.20250110.00.00',hl:'ar',gl:'EG'}},query});
  const req = https.request('https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
    {method:'POST', headers:{'content-type':'application/json','user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'}},
    r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{res(JSON.parse(d))}catch(e){rej(e)} }); });
  req.setTimeout(20000, ()=>{req.destroy(); rej(new Error('timeout'));});
  req.on('error',rej);
  req.end(body);
});}

function collectVideos(node, out){
  if (!node || typeof node !== 'object') return;
  if (node.videoRenderer && node.videoRenderer.videoId) out.push(node.videoRenderer);
  for (const k in node) collectVideos(node[k], out);
}

function lenSec(t){ if(!t) return 0; const p=t.split(':').map(Number); return p.reduce((a,b)=>a*60+b,0); }

(async () => {
  const out = [];
  for (const [id,q,musts,devs] of P) {
    try {
      const data = await ytSearch(q);
      const vids = []; collectVideos(data, vids);
      if (!vids.length) { out.push({id,q,err:'no results'}); process.stdout.write('0'); continue; }
      const cands = [];
      for (const v of vids.slice(0,14)) {
        const title = v.title?.runs?.[0]?.text || '';
        const chan  = v.ownerText?.runs?.[0]?.text || '';
        const len   = v.lengthText?.simpleText || '';
        const views = v.viewCountText?.simpleText || '';
        const nt = norm(title), nc = norm(chan);
        if (BLOCK.some(b => title.includes(b))) continue;
        if (!musts.some(mu => nt.includes(norm(mu)))) continue;      // العنوان لازم يحتوي اسم المشروع
        const s = lenSec(len);
        if (s > 0 && (s < 20 || s > 2700)) continue;                 // لا شورت ثانيتين ولا بودكاست 45د+
        let score = 1;
        if (devs.some(d => nc.includes(norm(d)))) score += 4;        // قناة المطوّر = أفضل حاجة
        if (devs.some(d => nt.includes(norm(d)))) score += 2;
        if (/official|رسمي/i.test(title+chan)) score += 1;
        cands.push({vid:v.videoId, title, chan, len, views, score});
      }
      cands.sort((a,b)=>b.score-a.score);
      out.push({id, q, best:cands[0]||null, alts:cands.slice(1,3)});
      process.stdout.write(cands[0] ? '+' : '-');
    } catch(e){ out.push({id,q,err:e.message}); process.stdout.write('x'); }
    await new Promise(r=>setTimeout(r,400));
  }
  fs.writeFileSync('E:/madmona-app/scripts/yt-report.json', JSON.stringify(out,null,1));
  console.log('\nfound:', out.filter(o=>o.best).length, '/', P.length);
})();
