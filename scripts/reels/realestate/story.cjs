// 🏙️ فيديو العقارات — نسخة «حكاية» (محمد ١٦/٩: «الشكل العام كله مش عاجبني» + «عايزها زي ستوري
// ومضمونة خليها في الآخر خالص»). القواعد الجديدة:
//   · مفيش لوجو ولا اسم مضمونة في أي مشهد إلا آخر مشهدين.
//   · صور المشاريع الحقيقية (cover_url من property_market_items) هي الخلفية — مش كروت مسطّحة.
//   · السرد حكاية: حيرة المشتري ← الحقيقة بالأرقام ← الحل ← مضمونة في الآخر.
// كل رقم/اسم من الداتا الحقيقية (سحب ١٦/٩/٢٠٢٦). العقد مع record-url.js: كلاس go + __replay + __total.
// التشغيل: node story.cjs [مدة_الصوت_بالثواني]
const fs = require('fs')
const P = 'E:/madmona-app/scripts/reels/playwright/'
const OUT = P + 'reels/re-story.html'
const slug = 're-story'

const SB = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/'
const S = [
  // ١) الحكاية — من غير أي برَند
  { len: 4.5, kind: 'text', big: 'بتدوّر على وحدة من ٣ شهور؟', sub: '' },
  { len: 5, kind: 'text', big: 'كل واحد بيقولك كلام…', sub: 'وكل مكتب بيرشّحلك اللي عنده هو' },
  { len: 5.5, kind: 'text', big: 'والسؤال اللي محدش بيجاوبه:', sub: 'إيه اللي بيميّز المشروع ده عن اللي جنبه؟' },

  // ٢) الحقيقة بالأرقام — لسه من غير برَند
  { len: 5, kind: 'stat', big: '١٤٥', sub: 'مشروع نشط من ٧٩ مطوّر في ٤٩ منطقة', note: 'بيانات محدّثة النهارده' },
  { len: 5, kind: 'stat', big: '٦٨', sub: 'منهم بس معلنين خطة السداد بالكامل', note: 'الباقي «كلّمنا»' },
  { len: 5, kind: 'stat', big: '١٩', sub: 'اللي كاتبين تاريخ تسليم محدد', note: 'ودي اللي تقدر تحاسبهم عليها' },

  // ٣) أمثلة حقيقية بصور المشاريع
  { len: 6, kind: 'proj', img: SB + 'nawy/nawy-media/5b3d25d9-0.jpg',
    name: 'IVOIRE East', dev: 'PRE Developments', loc: 'القاهرة الجديدة · سكني',
    price: 'من ٨٬٧٥٢٬٠٠٠ ج', edge: '٥٪ مقدم · ١٠ سنين أقساط متساوية' },
  { len: 6, kind: 'proj', img: SB + 'wa/120363412075878020/20260808/1786186912001-3y0l6.jpeg',
    name: 'ORIN Mall', dev: 'رواق للتطوير العقاري', loc: 'العبور الجديدة · تجاري',
    price: 'من ١٬٦٦٢٬٥٠٠ ج', edge: 'تقسيط ٦ سنين · استلام خلال ٣ سنين' },
  { len: 6, kind: 'proj', img: SB + 'wa-inbound/1783842286470-YyRTI3QkEA.jpg',
    name: 'Axin Business Complex', dev: 'Ahelh Elalfy', loc: 'القاهرة الجديدة · تجاري',
    price: 'من ٤٬٣٧٨٬٠٠٠ ج', edge: '١٠٪ مقدم على ٥ سنين · استلام سنتين' },

  // ٤) الخلاصة — لسه من غير برَند
  { len: 5.5, kind: 'text', big: 'لما تشوفهم جنب بعض…', sub: 'الفرق بيبان في دقيقة مش في ٣ شهور' },

  // ٥) مضمونة — آخر مشهدين بس
  { len: 5, kind: 'brand', big: 'مضمونة', sub: 'المشاريع كلها في مكان واحد — بخطط السداد وتواريخ التسليم' },
  { len: 6, kind: 'cta', big: 'عندك مشروع؟ سجّله مجانًا', sub: 'وبتشتري؟ استشارة مجانية', note: 'madmonacairo.com/start · واتساب ٠١٠٠٢٢٢٩٩٨٢' },
]

const fit = parseFloat(process.argv[2] || '0')
const raw = S.reduce((a, s) => a + s.len, 0)
const k = fit > 0 ? fit / raw : 1
let t = 0
const sc = S.map(s => { const st = t; const len = +(s.len * k).toFixed(2); t += len; return { ...s, st: +st.toFixed(2), len } })
const total = +t.toFixed(2)
const esc = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;')

const body = sc.map(s => {
  const d = x => (s.st + x).toFixed(2)
  let inner = ''
  if (s.kind === 'proj') {
    inner = `<div class="ph" style="background-image:url('${s.img}');animation-delay:${d(0)}s"></div>
    <div class="shade"></div>
    <div class="pinfo">
      <div class="dev" style="animation-delay:${d(.45)}s">${esc(s.dev)}</div>
      <div class="pname" style="animation-delay:${d(.6)}s">${esc(s.name)}</div>
      <div class="ploc" style="animation-delay:${d(.85)}s">${esc(s.loc)}</div>
      <div class="prow" style="animation-delay:${d(1.1)}s"><span>${esc(s.price)}</span></div>
      <div class="pedge" style="animation-delay:${d(1.4)}s">${esc(s.edge)}</div>
    </div>`
  } else if (s.kind === 'stat') {
    inner = `<div class="mid">
      <div class="num" style="animation-delay:${d(.2)}s">${esc(s.big)}</div>
      <div class="nsub" style="animation-delay:${d(.6)}s">${esc(s.sub)}</div>
      ${s.note ? `<div class="note" style="animation-delay:${d(.95)}s">${esc(s.note)}</div>` : ''}
    </div>`
  } else if (s.kind === 'brand') {
    inner = `<div class="mid">
      <div class="brandName" style="animation-delay:${d(.2)}s">${esc(s.big)}</div>
      <div class="bline" style="animation-delay:${d(.55)}s"></div>
      <div class="nsub" style="animation-delay:${d(.8)}s">${esc(s.sub)}</div>
    </div>`
  } else if (s.kind === 'cta') {
    inner = `<div class="mid">
      <div class="ctaBig" style="animation-delay:${d(.2)}s">${esc(s.big)}</div>
      <div class="nsub" style="animation-delay:${d(.6)}s">${esc(s.sub)}</div>
      ${s.note ? `<div class="note gold" style="animation-delay:${d(1)}s">${esc(s.note)}</div>` : ''}
    </div>`
  } else {
    inner = `<div class="mid">
      <div class="big" style="animation-delay:${d(.2)}s">${esc(s.big)}</div>
      ${s.sub ? `<div class="nsub" style="animation-delay:${d(.7)}s">${esc(s.sub)}</div>` : ''}
    </div>`
  }
  return `<section class="sc ${s.kind}" style="animation-duration:${s.len}s;animation-delay:${s.st}s">${inner}</section>`
}).join('\n')

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:#07120F;font-family:Cairo,sans-serif;color:#fff}
.stage{position:relative;width:1080px;height:1920px;overflow:hidden}
.sc{position:absolute;inset:0;opacity:0}
body.go .sc{animation-name:show;animation-timing-function:linear;animation-fill-mode:both}
@keyframes show{0%{opacity:0}4%{opacity:1}94%{opacity:1}100%{opacity:0}}
.mid{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:140px 90px;text-align:center;gap:26px}
.big{font-size:104px;font-weight:900;line-height:1.2;opacity:0;animation:up .9s cubic-bezier(.2,.8,.2,1) both}
.nsub{font-size:50px;font-weight:700;line-height:1.5;color:#D7E5DF;opacity:0;animation:up .9s cubic-bezier(.2,.8,.2,1) both}
.num{font-size:280px;font-weight:900;line-height:1;color:#fff;opacity:0;animation:pop 1s cubic-bezier(.2,.9,.2,1) both}
.note{font-size:38px;font-weight:700;color:#9FB8AE;opacity:0;animation:up .9s cubic-bezier(.2,.8,.2,1) both}
.note.gold{color:#E3B96B}
.brandName{font-size:150px;font-weight:900;letter-spacing:-2px;opacity:0;animation:pop 1s cubic-bezier(.2,.9,.2,1) both}
.bline{width:0;height:10px;background:#1DB07A;border-radius:6px;animation:wide 1s cubic-bezier(.2,.8,.2,1) both}
.ctaBig{font-size:86px;font-weight:900;line-height:1.25;color:#E3B96B;opacity:0;animation:pop 1s cubic-bezier(.2,.9,.2,1) both}
/* مشهد المشروع: صورة حقيقية ملء الشاشة + تدرّج + بيانات تحت */
.ph{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.06);animation:kb 7s linear both}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,18,15,.15) 0%,rgba(7,18,15,.55) 52%,rgba(7,18,15,.96) 100%)}
.pinfo{position:absolute;left:70px;right:70px;bottom:190px;text-align:right}
.dev{font-size:40px;font-weight:700;color:#BFE9D6;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.pname{font-size:96px;font-weight:900;line-height:1.15;margin-top:8px;opacity:0;animation:up .9s cubic-bezier(.2,.8,.2,1) both}
.ploc{font-size:44px;font-weight:700;color:#D7E5DF;margin-top:10px;opacity:0;animation:up .9s cubic-bezier(.2,.8,.2,1) both}
.prow{display:inline-block;margin-top:26px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.22);
 border-radius:999px;padding:16px 34px;font-size:54px;font-weight:900;opacity:0;animation:up .9s cubic-bezier(.2,.8,.2,1) both}
.pedge{margin-top:20px;font-size:44px;font-weight:700;color:#E3B96B;opacity:0;animation:up .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes up{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(.86)}62%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
@keyframes wide{from{width:0}to{width:300px}}
@keyframes kb{from{transform:scale(1.06)}to{transform:scale(1.16)}}
body:not(.go) .big,body:not(.go) .nsub,body:not(.go) .num,body:not(.go) .note,body:not(.go) .brandName,
body:not(.go) .bline,body:not(.go) .ctaBig,body:not(.go) .dev,body:not(.go) .pname,body:not(.go) .ploc,
body:not(.go) .prow,body:not(.go) .pedge,body:not(.go) .ph{animation:none}
</style></head><body>
<div class="stage">${body}</div>
<script>
window.__replay=()=>{document.body.classList.remove('go');void document.body.offsetWidth;document.body.classList.add('go')}
window.__total=${total.toFixed(2)}
document.body.classList.add('go')
</script></body></html>`
fs.writeFileSync(OUT, html)

const vo = [
  'بتدوّر على وحدة من تلات شهور؟',
  'كل واحد بيقولك كلام… وكل مكتب بيرشّحلك اللي عنده هو.',
  'والسؤال اللي محدش بيجاوبه: إيه اللي بيميّز المشروع ده عن اللي جنبه؟',
  'مية خمسة وأربعين مشروع نشط، من تسعة وسبعين مطوّر، في تسعة وأربعين منطقة.',
  'تمنية وستين منهم بس معلنين خطة السداد بالكامل… الباقي بيقولك كلّمنا.',
  'وتسعتاشر بس اللي كاتبين تاريخ تسليم محدد… ودي اللي تقدر تحاسبهم عليها.',
  'إيفوار إيست، من بي آر إي، في القاهرة الجديدة… من تمنية مليون وسبعمية واتنين وخمسين ألف، بخمسة في المية مقدم وعشر سنين أقساط متساوية.',
  'أورين مول، من رواق، في العبور الجديدة… من مليون وستمية واتنين وستين ألف، بتقسيط ست سنين واستلام خلال تلات سنين.',
  'أكسين بيزنس كومبلكس، من أهل الألفي، في القاهرة الجديدة… من أربعة مليون وتلتمية وتمنية وسبعين ألف، بعشرة في المية مقدم على خمس سنين.',
  'لما تشوفهم جنب بعض… الفرق بيبان في دقيقة مش في تلات شهور.',
  'مضمونة. المشاريع كلها في مكان واحد — بخطط السداد وتواريخ التسليم.',
  'عندك مشروع؟ سجّله مجانًا. وبتشتري؟ استشارة مجانية على واتساب.',
].join('\n')
fs.writeFileSync(P + 'output/vo-' + slug + '.txt', vo)
console.log('ok scenes', sc.length, 'total', total, 'vo', vo.length, '->', OUT)
