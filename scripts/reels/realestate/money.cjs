// 💰 فيديو «الفلوس» — متوسط الأسعار وخطط السداد والقسط الحقيقي (محمد ١٦/٩:
// «فيديو بمتوسط الاسعار وخطط السداد ومتوسط الفايدة والقسط… المهم ميبقاش ممل
//  والناس تعرف تاخد قرار بعد المشاهدة»).
//
// ⛔ «متوسط الفايدة» **مش موجود في داتتنا** — راجعت كل أعمدة property_market_items:
//    مفيش سعر كاش مقابل سعر تقسيط، والفايدة في السوق المصري هي الفرق بينهم بالظبط.
//    فبدل ما نخترع رقم (خط أحمر)، الفيديو بيعلّم المشاهد **يستخرجها بنفسه**:
//    بيوريه إن القسط × عدد الشهور = الباقي بالظبط (صفر فوايد معلنة)، ويقوله
//    إن الفايدة الحقيقية في سعر الكاش اللي المطوّر مش معلنه → فيسأل عنه.
//
// كل رقم هنا من property_market_items (سحب ١٦/٩/٢٠٢٦) وموثّق في التعليق جنبه.
// التشغيل: node money.cjs [مدة_الصوت_بالثواني]
const fs = require('fs')
const P = 'E:/madmona-app/scripts/reels/playwright/'
const OUT = P + 'reels/re-money.html'
const slug = 're-money'
const SB = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/'

// ── الأرقام (كلها متقاسة من الداتابيز ١٦/٩) ──────────────────────────────
const MEDIAN_PRICE = 7000000   // وسيط سعر الوحدة من ٩٥ مشروع بسعر إجمالي
const DOWN_PCT = 5             // أشيع نسبة مقدم: ٢٨ مشروع من ٥٨ معلنين النسبة
const YEARS = 8                // أشيع مدة تقسيط: ١٨ مشروع من ٦٧ معلنين المدة
const MONTHS = YEARS * 12
const REST = Math.round(MEDIAN_PRICE * (1 - DOWN_PCT / 100))
const MONTHLY = Math.round(REST / MONTHS)

// مثال حقيقي — المصدر فيه Al Fath Group نفسه (مش سمسار)
const EX = { price: 3724930, down: 372493, monthly: 39900, months: 84 }
const EX_TOTAL = EX.monthly * EX.months            // 3,351,600
const EX_REST = EX.price - EX.down                 // 3,352,437

const ar = n => n.toLocaleString('ar-EG')

const S = [
  // ٠–٤ ث: الخطاف — من غير أي برَند (قاعدة الـ٣ ثواني في viral-reference.md)
  { len: 3.6, kind: 'hook', big: '«٥٪ مقدم بس»', sub: 'طيب القسط كام؟ محدش بيقولك' },

  { len: 4.6, kind: 'stat', big: ar(MEDIAN_PRICE), sub: 'وسيط سعر الوحدة', note: 'من ٩٤ عرض معلن سعره' },
  { len: 5.0, kind: 'two', a: '٥٪', aSub: 'أشيع مقدم · ٢٨ مشروع', b: '٨ سنين', bSub: 'أشيع تقسيط · ١٨ مشروع' },

  // الحسبة قدام عينه — ده اللي بيخلي القرار ممكن
  { len: 7.0, kind: 'calc', title: 'يبقى القسط بكام؟',
    lines: [
      ar(MEDIAN_PRICE) + ' − ٥٪ مقدم = ' + ar(REST),
      ar(REST) + ' ÷ ٩٦ شهر',
    ],
    big: ar(MONTHLY), bigSub: 'جنيه في الشهر' },

  // مثال موثّق بالاسم
  { len: 6.4, kind: 'proj', img: SB + 'content-images/wa-inbound/1783810441277-VCRjBEQzAA.jpg',
    name: 'Jazeel Residence', dev: 'Al Fath Group', loc: 'العبور الجديدة — ٣ غرف ١٤٦م',
    edge: ar(EX.price) + ' ج · مقدم ' + ar(EX.down) + ' · قسط ' + ar(EX.monthly) },

  // الكشف: صفر فوايد على السعر المعلن
  { len: 7.2, kind: 'calc', title: 'خد بالك من الحتة دي',
    lines: [
      ar(EX.monthly) + ' × ٨٤ شهر = ' + ar(EX_TOTAL),
      'والباقي بعد المقدم = ' + ar(EX_REST),
    ],
    big: 'صفر فوايد', bigSub: 'على السعر المعلن' },

  // السؤال اللي بيكشف الفايدة الحقيقية
  { len: 6.6, kind: 'ask', big: 'طيب فين الفايدة؟',
    sub: 'في سعر الكاش — اللي مش مكتوب في الإعلان',
    note: 'الفرق بين سعر الكاش وسعر التقسيط = الفايدة الحقيقية' },

  // المقدم الأعلى بيطوّل المدة — قاعدة حقيقية من مشروع معلن خططه الأربعة
  { len: 6.0, kind: 'proj', img: SB + 'content-images/projects/ritz-00.jpg',
    // ⚠️ (١٦/٩) ممنوع سلسلة أرقام مفصولة بـ« · » — الفاصلة محايدة الاتجاه فبتلزق
    // بالأرقام وتقراها العين غلط («٥٪ · ١٠٪» كانت بتطلع ٥٠ و١٠٠). الكلام بكلمات عربية.
    name: 'RITZ New Zayed', dev: 'ARQA Development', loc: 'الشيخ زايد — أربع خطط معلنة',
    edge: 'من غير مقدم يبقى التقسيط ٧ سنين — وكل ما المقدم يزيد المدة تطول' },

  { len: 5.2, kind: 'stat', big: '٨٥٪', sub: 'من العروض من غير تاريخ تسليم معلن', note: '١١٢ عرض من ١٣١' },

  // كارت القرار — ده اللي المشاهد بياخد منه فعل
  { len: 8.0, kind: 'rows', title: '٣ أسئلة قبل ما توقّع',
    rows: ['سعر الكاش كام؟ (الفرق = الفايدة)', 'التسليم إمتى — مكتوب في العقد؟', 'القسط ثابت ولا بيزيد سنويًا؟'] },

  // مضمونة في الآخر خالص (أمر محمد ١٦/٩)
  { len: 5.4, kind: 'brand', big: 'مضمونة', sub: 'المشاريع بخطط سدادها وتواريخ تسليمها مكتوبة قدامك', note: 'madmonacairo.com/start' },
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
      ${s.note ? `<div class="note" style="animation-delay:${d(.8)}s">${esc(s.note)}</div>` : ''}
    </div>`
  } else if (s.kind === 'two') {
    inner = `<div class="mid">
      <div class="half" style="animation-delay:${d(.15)}s">
        <div class="num2">${esc(s.a)}</div><div class="nsub">${esc(s.aSub)}</div>
      </div>
      <div class="sep" style="animation-delay:${d(.45)}s"></div>
      <div class="half" style="animation-delay:${d(.6)}s">
        <div class="num2">${esc(s.b)}</div><div class="nsub">${esc(s.bSub)}</div>
      </div>
    </div>`
  } else if (s.kind === 'calc') {
    inner = `<div class="mid">
      <div class="ctitle" style="animation-delay:${d(.15)}s">${esc(s.title)}</div>
      ${s.lines.map((l, i) => `<div class="cline" style="animation-delay:${d(.6 + i * .7)}s">${esc(l)}</div>`).join('')}
      <div class="cbig" style="animation-delay:${d(.6 + s.lines.length * .7 + .35)}s">${esc(s.big)}</div>
      <div class="note" style="animation-delay:${d(.6 + s.lines.length * .7 + .6)}s">${esc(s.bigSub)}</div>
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
.hookBig{font-size:112px;font-weight:900;line-height:1.16;opacity:0;animation:pop .7s cubic-bezier(.2,.9,.2,1) both}
.hookBig.gold{color:#E3B96B;font-size:100px}
.num{font-size:190px;font-weight:900;line-height:1;opacity:0;animation:pop .8s cubic-bezier(.2,.9,.2,1) both}
.num2{font-size:150px;font-weight:900;line-height:1}
.half{opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both;display:flex;flex-direction:column;gap:12px}
.sep{width:340px;height:6px;background:#1DB07A;border-radius:4px;opacity:0;animation:up .6s both}
.nsub{font-size:52px;font-weight:700;line-height:1.45;color:#DCEAE4;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.note{font-size:40px;font-weight:700;color:#9FB8AE;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both;line-height:1.5}
.note.gold{color:#E3B96B;font-size:44px}
.ctitle{font-size:64px;font-weight:900;color:#BFE9D6;opacity:0;animation:up .7s both}
.cline{font-size:56px;font-weight:700;color:#fff;opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both;direction:ltr;unicode-bidi:plaintext}
.cbig{font-size:150px;font-weight:900;color:#34D399;line-height:1.05;opacity:0;animation:pop .8s cubic-bezier(.2,.9,.2,1) both}
.row{display:flex;align-items:center;gap:26px;width:100%;text-align:right;opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both}
.row b{flex:0 0 78px;height:78px;border-radius:50%;background:#1DB07A;color:#04352A;font-size:44px;display:flex;align-items:center;justify-content:center}
.row span{font-size:50px;font-weight:700;line-height:1.35}
.brandName{font-size:158px;font-weight:900;letter-spacing:-2px;opacity:0;animation:pop .9s cubic-bezier(.2,.9,.2,1) both}
.bline{width:0;height:10px;background:#1DB07A;border-radius:6px;animation:wide .9s cubic-bezier(.2,.8,.2,1) both}
.ph{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.05);animation:kb 7s linear both}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,18,15,.15) 0%,rgba(7,18,15,.55) 50%,rgba(7,18,15,.96) 100%)}
.pinfo{position:absolute;left:70px;right:70px;bottom:210px;text-align:right}
.dev{font-size:40px;font-weight:700;color:#BFE9D6;opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both}
.pname{font-size:98px;font-weight:900;line-height:1.12;margin-top:6px;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.ploc{font-size:44px;font-weight:700;color:#D7E5DF;margin-top:12px;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.pedge{margin-top:22px;font-size:42px;font-weight:900;color:#E3B96B;line-height:1.4;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
@keyframes up{from{opacity:0;transform:translateY(38px)}to{opacity:1;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(.85)}62%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
@keyframes wide{from{width:0}to{width:300px}}
@keyframes kb{from{transform:scale(1.05)}to{transform:scale(1.14)}}
body:not(.go) .hookBig,body:not(.go) .num,body:not(.go) .nsub,body:not(.go) .note,body:not(.go) .brandName,
body:not(.go) .bline,body:not(.go) .dev,body:not(.go) .pname,body:not(.go) .ploc,body:not(.go) .pedge,
body:not(.go) .ph,body:not(.go) .half,body:not(.go) .sep,body:not(.go) .ctitle,body:not(.go) .cline,
body:not(.go) .cbig,body:not(.go) .row{animation:none}
</style></head><body>
<div class="stage">${body}</div>
<script>
window.__replay=()=>{document.body.classList.remove('go');void document.body.offsetWidth;document.body.classList.add('go')}
window.__total=${total.toFixed(2)}
document.body.classList.add('go')
</script></body></html>`
fs.writeFileSync(OUT, html)

// نص الراوي — بهجت V2 · المصرية القاهرية · رسمي ومهني
const vo = [
  'خمسة في المية مقدم بس… رقم بيخطف العين. طيب القسط كام؟ محدش بيقولك.',
  'وسيط سعر الوحدة عندنا سبعة مليون جنيه، من أربعة وتسعين عرض معلن سعره.',
  'وأشيع مقدم خمسة في المية، وأشيع تقسيط تمن سنين.',
  'يبقى الحسبة كده: سبعة مليون ناقص خمسة في المية، على ستة وتسعين شهر… تسعة وستين ألف جنيه في الشهر.',
  'خد مثال حقيقي: جزيل ريزيدنس، تلات غرف، بمقدم تلتمية اتنين وسبعين ألف وقسط تسعة وتلاتين ألف وتسعمية.',
  'القسط في أربعة وتمانين شهر بيساوي الباقي بالظبط. يعني صفر فوايد على السعر المعلن.',
  'طيب فين الفايدة؟ في سعر الكاش اللي مش مكتوب في الإعلان. الفرق بينهم هو الفايدة الحقيقية.',
  'وفي ريتز نيو زايد مثلًا: كل ما المقدم يزيد، المدة تطول.',
  'وخمسة وتمانين في المية من العروض من غير تاريخ تسليم معلن.',
  'فقبل ما توقّع اسأل تلاتة: سعر الكاش كام؟ التسليم إمتى في العقد؟ والقسط ثابت ولا بيزيد؟',
  'مضمونة. المشاريع بخطط سدادها وتواريخ تسليمها مكتوبة قدامك.',
].join('\n')
fs.writeFileSync(P + 'output/vo-' + slug + '.txt', vo)
console.log('ok scenes', sc.length, '| total', total, 'ث | vo', vo.length, 'حرف | القسط المحسوب', MONTHLY, '->', OUT)
