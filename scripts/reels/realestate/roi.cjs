// 📉 فيديو «تكسب ولا تخسر؟» — ROI تقديري للوحدة المقسّطة (محمد ١٦/٩: «لو نعرف نحسب roi تقديري يبقى تمام»).
//
// كل رقم هنا إما من داتتنا أو من مصدر منشور — ومصدره مكتوب على الشاشة:
//  · سعر الوحدة الوسيط ٧ مليون + القسط ٦٩٬٢٧١ → من property_market_items (نفس أرقام فيديو الفلوس).
//  · العائد الإيجاري ٨.٣٪ للقاهرة → تقارير السوق المنشورة (المنصة العقارية المصرية الرسمية + تقارير ٢٠٢٦).
//  · العائد ٥.٦٪ → محسوب من إعلاناتنا إحنا: ٧ إعلانات إيجار شقق في القاهرة (وسيط ٢٦٬٠٠٠/شهر)
//    مقابل ٣ إعلانات بيع شقق في القاهرة (وسيط ٥٬٦٠٠٬٠٠٠) — العدد مكتوب على الشاشة عشان القارئ يحكم.
// ⚠️ العينة صغيرة، فالفيديو بيقول «تقديري» صراحةً ومابيدّعيش دقة مطلقة.
//
// التشغيل: node roi.cjs [مدة_الصوت_بالثواني]
const fs = require('fs')
const P = 'E:/madmona-app/scripts/reels/playwright/'
const OUT = P + 'reels/re-roi.html'
const slug = 're-roi'
const SB = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/'

const PRICE = 7000000
const INSTALLMENT = 69271          // من فيديو الفلوس: (٧م − ٥٪) ÷ ٩٦ شهر
const Y_PUB = 8.3                  // عائد القاهرة المنشور
const Y_OURS = 5.6                 // محسوب من إعلاناتنا (١٠ إعلانات في القاهرة)
const rentMo = y => Math.round(PRICE * (y / 100) / 12)
const R_PUB = rentMo(Y_PUB)        // 48,417
const R_OURS = rentMo(Y_OURS)      // 32,667
const GAP_PUB = INSTALLMENT - R_PUB
const GAP_OURS = INSTALLMENT - R_OURS
const ar = n => n.toLocaleString('ar-EG')
// ⚠️ toFixed بترجّع أرقام لاتينية — لازم تعدّي على ar() وإلا بتطلع «12 سنة» وسط فيديو عربي.
const YRS_PUB = ar(Math.round(100 / Y_PUB))
const YRS_OURS = ar(Math.round(100 / Y_OURS))

const S = [
  { len: 4.0, kind: 'hook', big: 'اشتريت بسبعة مليون', sub: 'وأجّرتها… تكسب ولا تخسر؟' },

  { len: 4.6, kind: 'stat', big: ar(INSTALLMENT), sub: 'القسط الشهري', note: 'وسيط ٧ مليون · مقدم ٥٪ · ٨ سنين' },

  { len: 7.0, kind: 'calc', title: 'طيب الإيجار هيجيب كام؟',
    lines: ['العائد الإيجاري في القاهرة ٨٫٣٪ سنويًا', '٧ مليون × ٨٫٣٪ ÷ ١٢ شهر'],
    big: ar(R_PUB), bigSub: 'جنيه إيجار في الشهر · المصدر: تقارير السوق المنشورة' },

  // ⚠️ ممنوع علامة «−» بين رقمين في RTL — بتتزحزح وتتقرا غلط. الكلمة «ناقص» بدلها،
  // والفرق نفسه رقم موجب بالأحمر + جملة توضّح إنه بيطلع من جيبك (مش سالب برقمه).
  { len: 6.6, kind: 'gap', title: 'يبقى الفرق',
    a: ar(INSTALLMENT), aSub: 'قسط', b: ar(R_PUB), bSub: 'إيجار',
    big: ar(GAP_PUB), bigSub: 'جنيه من جيبك كل شهر' },

  { len: 7.0, kind: 'calc', title: 'وبأرقام إعلاناتنا إحنا؟',
    lines: ['وسيط إيجار شقة في القاهرة ٢٦ ألف · ٧ إعلانات', 'وسيط بيع شقة في القاهرة ٥٫٦ مليون · ٣ إعلانات'],
    big: '٥٫٦٪', bigSub: 'عائد سنوي — أقل من المنشور' },

  { len: 6.2, kind: 'gap', title: 'وساعتها الفرق',
    a: ar(INSTALLMENT), aSub: 'قسط', b: ar(R_OURS), bSub: 'إيجار',
    big: ar(GAP_OURS), bigSub: 'جنيه من جيبك كل شهر' },

  { len: 5.4, kind: 'two', a: YRS_PUB + ' سنة', aSub: 'ترجع فلوسك بالعائد المنشور',
    b: YRS_OURS + ' سنة', bSub: 'بأرقام إعلاناتنا' },

  { len: 6.0, kind: 'ask', big: 'يعني الإيجار مايغطّيش القسط',
    sub: 'في كل السيناريوهات',
    note: 'اللي بيكسب مش اللي بيأجّر — اللي داخل بحسبة صح من الأول' },

  { len: 4.8, kind: 'proj', img: SB + 'content-images/nawy/nawy-media/5b3d25d9-0.jpg',
    name: 'الحسبة قبل الحجز', dev: 'مش بعده', loc: 'اعرف القسط والإيجار المتوقع للمنطقة',
    edge: 'والفرق ده هو اللي هتدفعه من دخلك كل شهر' },

  { len: 8.4, kind: 'rows', title: 'إمتى تبقى صفقة كويسة؟',
    rows: ['الإيجار المتوقع قريب من القسط', 'خصم الكاش يستاهل لو معاك سيولة', 'منطقة إيجاراتها بتتحرك فعلًا'] },

  { len: 5.4, kind: 'brand', big: 'مضمونة', sub: 'الأسعار وخطط السداد وتواريخ التسليم في مكان واحد', note: 'madmonacairo.com/start' },
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
      <div class="dev" style="animation-delay:${d(.25)}s">${esc(s.dev)}</div>
      <div class="pname" style="animation-delay:${d(.4)}s">${esc(s.name)}</div>
      <div class="ploc" style="animation-delay:${d(.65)}s">${esc(s.loc)}</div>
      <div class="pedge" style="animation-delay:${d(.9)}s">${esc(s.edge)}</div>
    </div>`
  } else if (s.kind === 'stat') {
    inner = `<div class="mid">
      <div class="num" style="animation-delay:${d(.15)}s">${esc(s.big)}</div>
      <div class="nsub" style="animation-delay:${d(.5)}s">${esc(s.sub)}</div>
      <div class="note" style="animation-delay:${d(.8)}s">${esc(s.note)}</div>
    </div>`
  } else if (s.kind === 'two') {
    inner = `<div class="mid">
      <div class="half" style="animation-delay:${d(.15)}s"><div class="num2">${esc(s.a)}</div><div class="nsub">${esc(s.aSub)}</div></div>
      <div class="sep" style="animation-delay:${d(.45)}s"></div>
      <div class="half" style="animation-delay:${d(.6)}s"><div class="num2">${esc(s.b)}</div><div class="nsub">${esc(s.bSub)}</div></div>
    </div>`
  } else if (s.kind === 'calc') {
    inner = `<div class="mid">
      <div class="ctitle" style="animation-delay:${d(.15)}s">${esc(s.title)}</div>
      ${s.lines.map((l, i) => `<div class="cline" style="animation-delay:${d(.6 + i * .8)}s">${esc(l)}</div>`).join('')}
      <div class="cbig" style="animation-delay:${d(.6 + s.lines.length * .8 + .4)}s">${esc(s.big)}</div>
      <div class="note" style="animation-delay:${d(.6 + s.lines.length * .8 + .65)}s">${esc(s.bigSub)}</div>
    </div>`
  } else if (s.kind === 'gap') {
    inner = `<div class="mid">
      <div class="ctitle" style="animation-delay:${d(.15)}s">${esc(s.title)}</div>
      <div class="vs" style="animation-delay:${d(.5)}s">
        <div class="vsCol"><div class="vsNum">${esc(s.a)}</div><div class="note">${esc(s.aSub)}</div></div>
        <div class="vsDash">ناقص</div>
        <div class="vsCol"><div class="vsNum">${esc(s.b)}</div><div class="note">${esc(s.bSub)}</div></div>
      </div>
      <div class="cbig red" style="animation-delay:${d(1.3)}s">${esc(s.big)}</div>
      <div class="note" style="animation-delay:${d(1.6)}s">${esc(s.bigSub)}</div>
    </div>`
  } else if (s.kind === 'ask') {
    inner = `<div class="mid">
      <div class="hookBig gold" style="animation-delay:${d(.15)}s">${esc(s.big)}</div>
      <div class="nsub" style="animation-delay:${d(.6)}s">${esc(s.sub)}</div>
      <div class="note" style="animation-delay:${d(.95)}s">${esc(s.note)}</div>
    </div>`
  } else if (s.kind === 'rows') {
    inner = `<div class="mid">
      <div class="ctitle" style="animation-delay:${d(.15)}s">${esc(s.title)}</div>
      ${s.rows.map((r, i) => `<div class="row" style="animation-delay:${d(.7 + i * .85)}s"><b>${i + 1}</b><span>${esc(r)}</span></div>`).join('')}
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
.mid{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:130px 80px;text-align:center;gap:26px}
.hookBig{font-size:108px;font-weight:900;line-height:1.16;opacity:0;animation:pop .7s cubic-bezier(.2,.9,.2,1) both}
.hookBig.gold{color:#E3B96B;font-size:92px}
.num{font-size:185px;font-weight:900;line-height:1;opacity:0;animation:pop .8s cubic-bezier(.2,.9,.2,1) both}
.num2{font-size:130px;font-weight:900;line-height:1}
.half{opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both;display:flex;flex-direction:column;gap:12px}
.sep{width:340px;height:6px;background:#1DB07A;border-radius:4px;opacity:0;animation:up .6s both}
.nsub{font-size:50px;font-weight:700;line-height:1.45;color:#DCEAE4;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.note{font-size:38px;font-weight:700;color:#9FB8AE;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both;line-height:1.5}
.note.gold{color:#E3B96B;font-size:42px}
.ctitle{font-size:62px;font-weight:900;color:#BFE9D6;opacity:0;animation:up .7s both}
.cline{font-size:50px;font-weight:700;color:#fff;opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both;line-height:1.4}
.cbig{font-size:145px;font-weight:900;color:#34D399;line-height:1.05;opacity:0;animation:pop .8s cubic-bezier(.2,.9,.2,1) both}
.cbig.red{color:#F87171}
.vs{display:flex;align-items:center;justify-content:center;gap:40px;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.vsCol{display:flex;flex-direction:column;gap:10px}
.vsNum{font-size:96px;font-weight:900;line-height:1}
.vsDash{font-size:80px;font-weight:900;color:#9FB8AE}
.row{display:flex;align-items:center;gap:26px;width:100%;text-align:right;opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both}
.row b{flex:0 0 78px;height:78px;border-radius:50%;background:#1DB07A;color:#04352A;font-size:44px;display:flex;align-items:center;justify-content:center}
.row span{font-size:48px;font-weight:700;line-height:1.35}
.brandName{font-size:158px;font-weight:900;letter-spacing:-2px;opacity:0;animation:pop .9s cubic-bezier(.2,.9,.2,1) both}
.bline{width:0;height:10px;background:#1DB07A;border-radius:6px;animation:wide .9s cubic-bezier(.2,.8,.2,1) both}
.ph{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.05);animation:kb 7s linear both}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,18,15,.15) 0%,rgba(7,18,15,.55) 50%,rgba(7,18,15,.96) 100%)}
.pinfo{position:absolute;left:70px;right:70px;bottom:210px;text-align:right}
.dev{font-size:40px;font-weight:700;color:#BFE9D6;opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both}
.pname{font-size:92px;font-weight:900;line-height:1.12;margin-top:6px;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.ploc{font-size:44px;font-weight:700;color:#D7E5DF;margin-top:12px;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.pedge{margin-top:22px;font-size:42px;font-weight:900;color:#E3B96B;line-height:1.4;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
@keyframes up{from{opacity:0;transform:translateY(38px)}to{opacity:1;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(.85)}62%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
@keyframes wide{from{width:0}to{width:300px}}
@keyframes kb{from{transform:scale(1.05)}to{transform:scale(1.14)}}
body:not(.go) .hookBig,body:not(.go) .num,body:not(.go) .nsub,body:not(.go) .note,body:not(.go) .brandName,
body:not(.go) .bline,body:not(.go) .dev,body:not(.go) .pname,body:not(.go) .ploc,body:not(.go) .pedge,
body:not(.go) .ph,body:not(.go) .half,body:not(.go) .sep,body:not(.go) .ctitle,body:not(.go) .cline,
body:not(.go) .cbig,body:not(.go) .row,body:not(.go) .vs{animation:none}
</style></head><body>
<div class="stage">${body}</div>
<script>
window.__replay=()=>{document.body.classList.remove('go');void document.body.offsetWidth;document.body.classList.add('go')}
window.__total=${total.toFixed(2)}
document.body.classList.add('go')
</script></body></html>`
fs.writeFileSync(OUT, html)

const vo = [
  'اشتريت شقة بسبعة مليون… وأجّرتها. تكسب ولا تخسر؟',
  'القسط الشهري تسعة وستين ألف ومية وواحد وسبعين جنيه.',
  'طيب الإيجار هيجيب كام؟ العائد الإيجاري في القاهرة تمنية وتلاتة من عشرة في المية سنويًا… يعني تمنية وأربعين ألف وأربعمية وسبعتاشر جنيه في الشهر.',
  'يبقى الفرق عشرين ألف وتمنمية وأربعة وخمسين جنيه بتدفعهم من جيبك كل شهر.',
  'وبأرقام إعلاناتنا إحنا؟ وسيط إيجار الشقة في القاهرة ستة وعشرين ألف، ووسيط البيع خمسة وستة من عشرة مليون. يعني عائد خمسة وستة من عشرة في المية بس.',
  'وساعتها الفرق بيبقى ستة وتلاتين ألف وستمية وأربعة في الشهر.',
  'يعني فلوسك ترجع في اتناشر سنة بالعائد المنشور، أو تمنتاشر سنة بأرقامنا.',
  'الخلاصة: الإيجار مايغطّيش القسط في كل السيناريوهات. اللي بيكسب مش اللي بيأجّر، اللي داخل بحسبة صح من الأول.',
  'فاعرف القسط والإيجار المتوقع للمنطقة قبل الحجز مش بعده.',
  'الصفقة بتبقى كويسة لما الإيجار المتوقع يقرب من القسط، أو لما خصم الكاش يستاهل، أو في منطقة إيجاراتها بتتحرك فعلًا.',
  'مضمونة. الأسعار وخطط السداد وتواريخ التسليم في مكان واحد.',
].join('\n')
fs.writeFileSync(P + 'output/vo-' + slug + '.txt', vo)
console.log('ok scenes', sc.length, '| total', total, 'ث | vo', vo.length, 'حرف | إيجار', R_PUB, '/', R_OURS, '| عجز', GAP_PUB, '/', GAP_OURS, '->', OUT)
