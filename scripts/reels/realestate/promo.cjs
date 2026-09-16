// 🎬 برومو العقارات — ١٨ ثانية (محمد ١٦/٩: «محتاج أشوف برومو للفيديو»).
// مبني على قواعد docs/marketing/viral-reference.md:
//   · الخطاف في أول ٣ ثواني — نص كبير، من غير لوجو ولا اسمنا.
//   · كل مشهد ≤ ٦ ثواني · صور مشاريع حقيقية · مضمونة في آخر مشهد بس.
// كل رقم من property_market_items الموثّق بمصدرين. العقد: كلاس go + __replay + __total.
// التشغيل: node promo.cjs [مدة_الصوت_بالثواني]
const fs = require('fs')
const P = 'E:/madmona-app/scripts/reels/playwright/'
const OUT = P + 'reels/re-promo.html'
const slug = 're-promo'
const SB = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/'

const S = [
  // ٠–٣ ث: الخطاف — من غير أي برَند
  { len: 3.2, kind: 'hook', big: 'قبل ما تحجز وحدة…', sub: 'اسأل السؤال ده الأول' },
  // الجسم
  { len: 4.2, kind: 'stat', big: '١٢٧', sub: 'مشروع مطروح دلوقتي', note: 'من ٦٧ مطوّر' },
  { len: 4.6, kind: 'stat', big: '٦٨ بس', sub: 'معلنين خطة السداد بالكامل', note: 'الباقي بيقولك «كلّمنا»' },
  { len: 4.4, kind: 'proj', img: SB + 'nawy/nawy-media/5b3d25d9-0.jpg',
    // ⚠️ (١٦/٩) ممنوع « · » بين كلمة عربي ورقم — الفاصلة محايدة الاتجاه فبتلزق بالرقم
    // وبتقراها العين غلط («١٠٤ فدان · القاهرة» كانت بتطلع ١٠٤٠). الفاصل بين كلمتين عربي بس.
    name: 'IVOIRE East', dev: 'PRE Developments', loc: 'القاهرة الجديدة — مساحته ١٠٤ فدان',
    edge: 'مقدم ٥٪ وأقساط متساوية على ١٠ سنين' },
  // مضمونة — آخر مشهد بس
  { len: 4.6, kind: 'brand', big: 'مضمونة', sub: 'المشاريع كلها بخطط السداد وتواريخ التسليم', note: 'madmonacairo.com/start' },
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
  let inner
  if (s.kind === 'proj') {
    inner = `<div class="ph" style="background-image:url('${s.img}')"></div><div class="shade"></div>
    <div class="pinfo">
      <div class="dev" style="animation-delay:${d(.3)}s">${esc(s.dev)}</div>
      <div class="pname" style="animation-delay:${d(.45)}s">${esc(s.name)}</div>
      <div class="ploc" style="animation-delay:${d(.7)}s">${esc(s.loc)}</div>
      <div class="pedge" style="animation-delay:${d(.95)}s">${esc(s.edge)}</div>
    </div>`
  } else if (s.kind === 'stat') {
    inner = `<div class="mid">
      <div class="num" style="animation-delay:${d(.15)}s">${esc(s.big)}</div>
      <div class="nsub" style="animation-delay:${d(.5)}s">${esc(s.sub)}</div>
      ${s.note ? `<div class="note" style="animation-delay:${d(.8)}s">${esc(s.note)}</div>` : ''}
    </div>`
  } else if (s.kind === 'brand') {
    inner = `<div class="mid">
      <div class="brandName" style="animation-delay:${d(.15)}s">${esc(s.big)}</div>
      <div class="bline" style="animation-delay:${d(.5)}s"></div>
      <div class="nsub" style="animation-delay:${d(.7)}s">${esc(s.sub)}</div>
      <div class="note gold" style="animation-delay:${d(1)}s">${esc(s.note)}</div>
    </div>`
  } else {
    inner = `<div class="mid">
      <div class="hookBig" style="animation-delay:${d(.1)}s">${esc(s.big)}</div>
      <div class="nsub" style="animation-delay:${d(.55)}s">${esc(s.sub)}</div>
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
.mid{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:130px 80px;text-align:center;gap:24px}
.hookBig{font-size:112px;font-weight:900;line-height:1.16;color:#fff;opacity:0;animation:pop .7s cubic-bezier(.2,.9,.2,1) both}
.num{font-size:300px;font-weight:900;line-height:1;opacity:0;animation:pop .8s cubic-bezier(.2,.9,.2,1) both}
.nsub{font-size:54px;font-weight:700;line-height:1.45;color:#DCEAE4;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.note{font-size:40px;font-weight:700;color:#9FB8AE;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.note.gold{color:#E3B96B;font-size:44px}
.brandName{font-size:158px;font-weight:900;letter-spacing:-2px;opacity:0;animation:pop .9s cubic-bezier(.2,.9,.2,1) both}
.bline{width:0;height:10px;background:#1DB07A;border-radius:6px;animation:wide .9s cubic-bezier(.2,.8,.2,1) both}
.ph{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.05);animation:kb 6s linear both}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,18,15,.1) 0%,rgba(7,18,15,.5) 50%,rgba(7,18,15,.95) 100%)}
.pinfo{position:absolute;left:70px;right:70px;bottom:210px;text-align:right}
.dev{font-size:40px;font-weight:700;color:#BFE9D6;opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both}
.pname{font-size:104px;font-weight:900;line-height:1.12;margin-top:6px;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.ploc{font-size:46px;font-weight:700;color:#D7E5DF;margin-top:12px;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.pedge{margin-top:22px;font-size:46px;font-weight:900;color:#E3B96B;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
@keyframes up{from{opacity:0;transform:translateY(38px)}to{opacity:1;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(.85)}62%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
@keyframes wide{from{width:0}to{width:300px}}
@keyframes kb{from{transform:scale(1.05)}to{transform:scale(1.14)}}
body:not(.go) .hookBig,body:not(.go) .num,body:not(.go) .nsub,body:not(.go) .note,body:not(.go) .brandName,
body:not(.go) .bline,body:not(.go) .dev,body:not(.go) .pname,body:not(.go) .ploc,body:not(.go) .pedge,body:not(.go) .ph{animation:none}
</style></head><body>
<div class="stage">${body}</div>
<script>
window.__replay=()=>{document.body.classList.remove('go');void document.body.offsetWidth;document.body.classList.add('go')}
window.__total=${total.toFixed(2)}
document.body.classList.add('go')
</script></body></html>`
fs.writeFileSync(OUT, html)

const vo = [
  'قبل ما تحجز وحدة… اسأل السؤال ده الأول.',
  'مية سبعة وعشرين مشروع مطروح دلوقتي، من سبعة وستين مطوّر.',
  'تمنية وستين بس معلنين خطة السداد بالكامل… الباقي بيقولك كلّمنا.',
  'إيفوار إيست، من بي آر إي، في القاهرة الجديدة… مية وأربعة فدان، بخمسة في المية مقدم وعشر سنين.',
  'مضمونة. المشاريع كلها بخطط السداد وتواريخ التسليم.',
].join('\n')
fs.writeFileSync(P + 'output/vo-' + slug + '.txt', vo)
console.log('ok scenes', sc.length, '| total', total, 'ث | vo', vo.length, 'حرف ->', OUT)
