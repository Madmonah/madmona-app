// 🏦 «إمتى تكسب من العقارات؟» — كل العوامل في مكان واحد (محمد ١٦/٩: «حط كل العوامل
// قدامك وقارن بين البريمري والريسيل وسعر إعادة البيع ونسبة التضخم — مش عايزك تسيب
// فاكتور مش معمول حسابه»).
//
// مصادر الأرقام (كل واحد مكتوب على الشاشة):
//  · متوسط سعر الوحدة ٧٬٨٧٦٬٦٣٠ والقسط ٧٧٬٩٤٦ → property_market_items (٩٤ عرض، سحب ١٦/٩).
//  · العائد الإيجاري ٨٫٣٪ للقاهرة → تقارير السوق المنشورة.
//  · شهادات البنوك تصل ٢١٪ (الأهلي) → أخبار البنوك سبتمبر ٢٠٢٦؛ المركزي ١٩–٢٠٪.
//  · التضخم السنوي ١٢٫٧٪ (أغسطس ٢٠٢٦) → الجهاز المركزي للتعبئة والإحصاء.
//
// ⚠️ **الفاكتور اللي محدش بيحسبه** ومتحط هنا صراحةً: فترة التسليم = سنين بتدفع فيها
//    من غير أي إيجار. و٨٥٪ من عروضنا من غير تاريخ تسليم معلن أصلاً.
// ⛔ **ممنوع استخدام رقم «المسكن +٣٣٪»** كنمو أسعار عقارات — ده بند في مؤشر أسعار
//    المستهلك (إيجارات ومرافق) مش أسعار بيع، واستخدامه كده تضليل. الفيديو بيسيب
//    نمو سعر الوحدة كـ«الرقم اللي إنت تقدّره لمنطقتك» وبيدّي المعادلة اللي تحكم بيها.
//
// التشغيل: node when.cjs [مدة_الصوت_بالثواني]
const fs = require('fs')
const P = 'E:/madmona-app/scripts/reels/playwright/'
const OUT = P + 'reels/re-when.html'
const slug = 're-when'
const SB = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/'

const PRICE = 7876630
const INSTALLMENT = 77946
const Y_RENT = 8.3
const CERT = 21          // أعلى عائد شهادة معلن (الأهلي)
const INFL = 12.7        // التضخم السنوي أغسطس ٢٠٢٦
const RENT_MO = Math.round(PRICE * (Y_RENT / 100) / 12)      // 54,480
const CERT_YR = Math.round(PRICE * (CERT / 100))             // 1,654,092
const CERT_MO = Math.round(CERT_YR / 12)                     // 137,841
const REAL_CERT = +(CERT - INFL).toFixed(1)                  // 8.3
const NEED_GROWTH = +(CERT - Y_RENT).toFixed(1)              // 12.7
const ar = n => n.toLocaleString('ar-EG')

const S = [
  { len: 3.8, kind: 'hook', big: 'إمتى تكسب من العقارات؟', sub: 'فيه فاكتور محدش بيحسبه' },

  { len: 5.6, kind: 'rows', title: 'العوامل اللي بتحكم المكسب',
    rows: ['سعر الشراء والقسط', 'الإيجار المتوقع', 'فترة التسليم', 'التضخم والبديل البنكي', 'نمو سعر الوحدة'] },

  { len: 5.0, kind: 'stat', big: ar(INSTALLMENT), sub: 'القسط الشهري',
    note: 'متوسط السعر ٧٫٨٧ مليون · مقدم ٥٪ · ٨ سنين' },

  { len: 5.6, kind: 'gap', title: 'الإيجار مقابل القسط',
    a: ar(INSTALLMENT), aSub: 'قسط', b: ar(RENT_MO), bSub: 'إيجار',
    big: ar(INSTALLMENT - RENT_MO), bigSub: 'جنيه من جيبك كل شهر' },

  // الفاكتور المنسي
  { len: 6.6, kind: 'ask', big: 'والفاكتور المنسي؟', sub: 'فترة التسليم',
    note: 'سنين بتدفع فيها قسط من غير ما تقبض إيجار — و٨٥٪ من العروض من غير تاريخ تسليم معلن' },

  // البديل البنكي — تكلفة الفرصة
  { len: 7.2, kind: 'calc', title: 'وفيه بديل لازم تقارن بيه',
    lines: ['شهادات البنوك بتوصل ٢١٪ سنويًا', 'نفس المبلغ في شهادة يدّي في الشهر'],
    big: ar(CERT_MO), bigSub: 'جنيه — من غير مجهود ولا صيانة ولا مشتري' },

  // التضخم بيأكل الاتنين
  { len: 7.4, kind: 'calc', title: 'بس استنى — التضخم',
    lines: ['التضخم السنوي ١٢٫٧٪ (أغسطس ٢٠٢٦)', 'يعني عائد الشهادة الحقيقي ٢١٪ ناقص ١٢٫٧٪'],
    big: ar(REAL_CERT) + '٪', bigSub: 'العائد الحقيقي للشهادة بعد التضخم' },

  { len: 6.4, kind: 'two', a: '٨٫٣٪', aSub: 'العائد الإيجاري للعقار',
    b: ar(REAL_CERT) + '٪', bSub: 'عائد الشهادة بعد التضخم' },

  // المعادلة
  { len: 7.6, kind: 'calc', title: 'يبقى إمتى العقار يكسب؟',
    lines: ['لما الإيجار زائد نمو سعر الوحدة', 'يعدّي عائد الشهادة'],
    big: ar(NEED_GROWTH) + '٪', bigSub: 'نمو سنوي في سعر الوحدة — ده حد التعادل' },

  // بريمري ولا ريسيل — بالعوامل مش بأسعار مخترعة
  { len: 9.0, kind: 'rows', title: 'بريمري ولا ريسيل؟',
    rows: ['البريمري: تقسيط أطول — بس تسليم بعد سنين وصفر إيجار فيها',
           'الريسيل: استلام فوري وإيجار من أول شهر — بس سيولة أكبر مقدمًا',
           'القاعدة: كل سنة تسليم زيادة = سنة عائد ضايعة من الحسبة'] },

  { len: 6.0, kind: 'ask', big: 'وسعر إعادة البيع؟', sub: 'هو اللي بيحسم المعادلة',
    note: 'اسأل عن سعر المتر النهارده في نفس الكمبوند — ومقارنته بسعر لانشه' },

  { len: 8.6, kind: 'rows', title: 'تكسب لما يتحقق ده',
    rows: ['نمو سعر المنطقة أعلى من حد التعادل', 'التسليم قريب ومكتوب في العقد', 'الإيجار المتوقع يقرب من القسط', 'تقدر تستنى — العقار مش سايل زي الشهادة'] },

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
  if (s.kind === 'stat') {
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
      ${s.rows.map((r, i) => `<div class="row" style="animation-delay:${d(.6 + i * .7)}s"><b>${ar(i + 1)}</b><span>${esc(r)}</span></div>`).join('')}
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
.mid{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:120px 70px;text-align:center;gap:24px}
.hookBig{font-size:104px;font-weight:900;line-height:1.16;opacity:0;animation:pop .7s cubic-bezier(.2,.9,.2,1) both}
.hookBig.gold{color:#E3B96B;font-size:90px}
.num{font-size:180px;font-weight:900;line-height:1;opacity:0;animation:pop .8s cubic-bezier(.2,.9,.2,1) both}
.num2{font-size:128px;font-weight:900;line-height:1}
.half{opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both;display:flex;flex-direction:column;gap:12px}
.sep{width:340px;height:6px;background:#1DB07A;border-radius:4px;opacity:0;animation:up .6s both}
.nsub{font-size:50px;font-weight:700;line-height:1.45;color:#DCEAE4;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.note{font-size:37px;font-weight:700;color:#9FB8AE;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both;line-height:1.5}
.note.gold{color:#E3B96B;font-size:42px}
.ctitle{font-size:60px;font-weight:900;color:#BFE9D6;opacity:0;animation:up .7s both}
.cline{font-size:48px;font-weight:700;color:#fff;opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both;line-height:1.4}
.cbig{font-size:140px;font-weight:900;color:#34D399;line-height:1.05;opacity:0;animation:pop .8s cubic-bezier(.2,.9,.2,1) both}
.cbig.red{color:#F87171}
.vs{display:flex;align-items:center;justify-content:center;gap:36px;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.vsCol{display:flex;flex-direction:column;gap:10px}
.vsNum{font-size:92px;font-weight:900;line-height:1}
.vsDash{font-size:52px;font-weight:900;color:#9FB8AE}
.row{display:flex;align-items:flex-start;gap:24px;width:100%;text-align:right;opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both}
.row b{flex:0 0 68px;height:68px;border-radius:50%;background:#1DB07A;color:#04352A;font-size:38px;display:flex;align-items:center;justify-content:center}
.row span{font-size:44px;font-weight:700;line-height:1.4}
.brandName{font-size:158px;font-weight:900;letter-spacing:-2px;opacity:0;animation:pop .9s cubic-bezier(.2,.9,.2,1) both}
.bline{width:0;height:10px;background:#1DB07A;border-radius:6px;animation:wide .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes up{from{opacity:0;transform:translateY(38px)}to{opacity:1;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(.85)}62%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
@keyframes wide{from{width:0}to{width:300px}}
body:not(.go) .hookBig,body:not(.go) .num,body:not(.go) .nsub,body:not(.go) .note,body:not(.go) .brandName,
body:not(.go) .bline,body:not(.go) .half,body:not(.go) .sep,body:not(.go) .ctitle,body:not(.go) .cline,
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
  'إمتى تكسب من العقارات؟ فيه فاكتور محدش بيحسبه.',
  'العوامل خمسة: سعر الشراء والقسط، الإيجار المتوقع، فترة التسليم، التضخم والبديل البنكي، ونمو سعر الوحدة.',
  'القسط الشهري سبعة وسبعين ألف وتسعمية وستة وأربعين جنيه.',
  'والإيجار المتوقع أربعة وخمسين ألف وأربعمية وتمانين. يعني تلاتة وعشرين ألف بتطلع من جيبك كل شهر.',
  'والفاكتور المنسي؟ فترة التسليم. سنين بتدفع فيها من غير ما تقبض إيجار.',
  'وفيه بديل: شهادات البنوك بتوصل واحد وعشرين في المية. نفس المبلغ يدّيك مية سبعة وتلاتين ألف في الشهر.',
  'بس التضخم اتناشر وسبعة في المية. يعني عائد الشهادة الحقيقي تمنية وتلاتة في المية بس.',
  'وده نفس العائد الإيجاري للعقار بالظبط.',
  'يبقى العقار يكسب لما الإيجار زائد نمو سعر الوحدة يعدّي عائد الشهادة. وحد التعادل اتناشر وسبعة في المية.',
  'بريمري ولا ريسيل؟ البريمري تقسيط أطول بس تسليم بعد سنين. والريسيل إيجار من أول شهر بس سيولة أكبر.',
  'وسعر إعادة البيع هو اللي بيحسم — اسأل عن سعر المتر النهارده وقارنه بسعر اللانش.',
  'فتكسب لما النمو يعدّي حد التعادل، والتسليم قريب ومكتوب، والإيجار يقرب من القسط، وتكون قادر تستنى.',
  'مضمونة. الأسعار وخطط السداد وتواريخ التسليم في مكان واحد.',
].join('\n')
fs.writeFileSync(P + 'output/vo-' + slug + '.txt', vo)
console.log('ok scenes', sc.length, '| total', total, 'ث | vo', vo.length, 'حرف | شهادة/شهر', CERT_MO, '| حد التعادل', NEED_GROWTH, '->', OUT)
