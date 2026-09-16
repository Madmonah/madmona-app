// 🏙️ فيديو المشاريع العقارية — رأسي بحركة CSS حقيقية (محمد ١٦/٩: «فيديو العقارات ممل جدا»
// + «مش عايزك تتكلم عن سعر الصرف بالطريقة دي» + «اتكلم عن المشاريع العقارية»).
// كل رقم واسم هنا **مسحوب من property_market_items** (النشط وغير المحجوب) بسحب ١٦/٩/٢٠٢٦ —
// ممنوع أي رقم من برّه الداتا. العقد مع record-url.js: كلاس go على body + window.__replay + window.__total.
// التشغيل: node short.cjs [مدة_الصوت_بالثواني]
const fs = require('fs')
const P = 'E:/madmona-app/scripts/reels/playwright/'
const OUT = P + 'reels/re-projects.html'
const slug = 're-projects'
const C = { bg: '#04352A', ink: '#FAFAF7', dim: '#9FC3B4', red: '#C8102E', gold: '#B8873B' }
const SRC = 'بورصة مضمونة العقارية — سحب ١٦ سبتمبر ٢٠٢٦'

const S = [
  { len: 4, big: 'إيه اللي بيميّز كل مشروع؟', kicker: '٧٩ مطوّر في مكان واحد', hook: true },
  { len: 6, kicker: 'في بورصة مضمونة دلوقتي', src: SRC,
    rows: [['مشاريع نشطة', '١٤٥'], ['مطوّرين', '٧٩'], ['مناطق', '٤٩']] },
  { len: 7, kicker: 'واللي بيفرق مش السعر لوحده', src: SRC,
    rows: [['خطة سداد معلنة', '٦٨ مشروع'], ['تاريخ تسليم محدد', '١٩'], ['من ٠٪ مقدم', '١٦'], ['استلام فوري', '٣'] ] },
  { len: 6, proj: { dev: 'Matter Makers', name: 'Nedit Tower', loc: 'العاصمة الإدارية · تجاري', price: 'من ١٬٦٠٠٬٥٠٠ ج', edge: '٢٫٥٪ مقدم والباقي على ١٢ سنة' } },
  { len: 6, proj: { dev: 'قوافل للتطوير العقاري', name: 'TRI HUB', loc: 'القاهرة الجديدة · تجاري', price: 'من ٤٬٣٨١٬٢٠٠ ج', edge: 'من ٠٪ مقدم · أقساط لحد ١٠ سنين' } },
  { len: 6, proj: { dev: 'Al Kayan Real Estate', name: 'Helio Eye Residence', loc: 'هليوبوليس الجديدة · سكني', price: 'من ٤٬٣٩٠٬٠٠٠ ج', edge: 'استلام فوري' } },
  { len: 6, proj: { dev: 'ASAS Development', name: 'Calma Coast', loc: 'الساحل الشمالي · سكني', price: 'من ٢٨٬٠٠٠ ج للمتر', edge: 'تسليم ٣٠ شهر' } },
  { len: 6, proj: { dev: 'HDP Development', name: 'Mall The Gray', loc: 'القاهرة الجديدة · تجاري', price: 'من ٤٬٥٠٠٬٠٠٠ ج', edge: 'تسليم ديسمبر ٢٠٢٦' } },
  { len: 6, kicker: 'أكتر المطوّرين مشاريع عندنا', src: SRC,
    rows: [['Upwyde Developments', '٩'], ['Al Fath Group', '٥'], ['رواق للتطوير', '٥'], ['قوافل للتطوير', '٥'], ['HDP Development', '٥']] },
  { len: 6, kicker: 'عندك مشاريع؟', big: 'سجّلها مجانًا', sub: 'والسعر اللي بتطلبه هو اللي بتاخده', src: 'madmonacairo.com/start', cta: true },
  { len: 7, kicker: 'بتدوّر لنفسك؟', big: 'استشارة مجانية', sub: 'إنت بتدوّر على إيه؟ ١ سكني · ٢ تجاري · ٣ ساحل · ٤ استثمار', src: 'اكتب رقمك في كومنت 👇 · واتساب ٠١٠٠٢٢٢٩٩٨٢', cta: true },
]

const fit = parseFloat(process.argv[2] || '0')
const raw = S.reduce((a, s) => a + s.len, 0)
const k = fit > 0 ? fit / raw : 1
let t = 0
const sc = S.map(s => { const st = t; const len = +(s.len * k).toFixed(2); t += len; return { ...s, st: +st.toFixed(2), len } })
const total = +t.toFixed(2)
const esc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;')

const body = sc.map(s => {
  const d = (x) => (s.st + x).toFixed(2)
  const inner = s.proj ? `
  <div class="kick" style="animation-delay:${d(.1)}s">${esc(s.proj.dev)}</div>
  <div class="big" style="animation-delay:${d(.25)}s">${esc(s.proj.name)}</div>
  <div class="under" style="animation-delay:${d(.5)}s"></div>
  <div class="sub" style="animation-delay:${d(.55)}s">${esc(s.proj.loc)}</div>
  <div class="rows">
    <div class="row" style="animation-delay:${d(.8)}s"><span class="n">السعر من</span><span class="v">${esc(s.proj.price)}</span></div>
    <div class="row edge" style="animation-delay:${d(1.15)}s"><span class="n">اللي بيميّزه</span><span class="v">${esc(s.proj.edge)}</span></div>
  </div>
  <div class="src" style="animation-delay:${d(1.4)}s">${esc(SRC)}</div>` : `
  ${s.kicker ? `<div class="kick" style="animation-delay:${d(.1)}s">${esc(s.kicker)}</div>` : ''}
  ${s.big ? `<div class="big${[...s.big].length > 16 ? ' small' : ''}" style="animation-delay:${d(.25)}s">${esc(s.big)}</div><div class="under" style="animation-delay:${d(.5)}s"></div>` : ''}
  ${s.sub ? `<div class="sub" style="animation-delay:${d(.55)}s">${esc(s.sub)}</div>` : ''}
  ${s.rows ? `<div class="rows">${s.rows.map((r, i) => `<div class="row" style="animation-delay:${d(.35 + i * .35)}s"><span class="n">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join('')}</div>` : ''}
  ${s.src ? `<div class="src" style="animation-delay:${d(1.1)}s">${esc(s.src)}</div>` : ''}`
  return `<section class="sc${s.hook ? ' hook' : ''}${s.cta ? ' cta' : ''}${s.proj ? ' pj' : ''}" style="animation-duration:${s.len}s;animation-delay:${s.st}s">${inner}</section>`
}).join('\n')

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:${C.bg};font-family:Cairo,sans-serif;color:${C.ink}}
.stage{position:relative;width:1080px;height:1920px;overflow:hidden}
.bar{position:absolute;left:0;top:0;height:10px;width:0;background:${C.gold};opacity:.9}
body.go .bar{animation:grow ${total.toFixed(2)}s linear both}
@keyframes grow{from{width:0}to{width:1080px}}
.brand{position:absolute;top:66px;left:0;right:0;text-align:center;font-size:36px;font-weight:900;color:${C.dim};letter-spacing:2px}
.sc{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:150px 80px;text-align:center;opacity:0}
body.go .sc{animation-name:show;animation-timing-function:linear;animation-fill-mode:both}
@keyframes show{0%{opacity:0}5%{opacity:1}93%{opacity:1}100%{opacity:0}}
.kick{font-size:46px;font-weight:700;color:${C.dim};opacity:0;animation:up .7s cubic-bezier(.2,.8,.2,1) both}
.big{font-size:118px;font-weight:900;line-height:1.16;margin:22px 0 0;opacity:0;animation:pop .85s cubic-bezier(.2,.9,.2,1) both}
.big.small{font-size:84px}
.sub{font-size:50px;font-weight:700;line-height:1.5;color:#E8F3EE;margin-top:18px;opacity:0;animation:up .8s cubic-bezier(.2,.8,.2,1) both}
.under{height:12px;width:0;background:${C.red};border-radius:8px;margin:20px auto 0;animation:wipe .9s cubic-bezier(.2,.8,.2,1) both}
.src{position:absolute;bottom:130px;left:60px;right:60px;font-size:32px;font-weight:700;color:${C.dim};opacity:0;animation:fade 1s linear both}
.hook .big{color:${C.red}}
.cta .big{color:${C.gold}}
.rows{width:100%;display:flex;flex-direction:column;gap:20px;margin-top:34px}
.row{display:flex;justify-content:space-between;align-items:center;gap:20px;background:rgba(255,255,255,.07);border-right:10px solid ${C.gold};padding:28px 32px;border-radius:18px;opacity:0;animation:slide .7s cubic-bezier(.2,.8,.2,1) both}
.row.edge{border-right-color:${C.red}}
.row .n{font-size:44px;font-weight:700;color:#CFE6DB;white-space:nowrap}
.row .v{font-size:50px;font-weight:900;color:${C.gold};text-align:left}
.row.edge .v{color:#FFD9DF;font-size:44px}
.pj .big{font-size:96px}
@keyframes up{from{opacity:0;transform:translateY(38px)}to{opacity:1;transform:none}}
@keyframes pop{0%{opacity:0;transform:scale(.84)}60%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
@keyframes slide{from{opacity:0;transform:translateX(64px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:.95}}
@keyframes wipe{from{width:0}to{width:320px}}
body:not(.go) .kick,body:not(.go) .big,body:not(.go) .sub,body:not(.go) .row,body:not(.go) .src,body:not(.go) .under{animation:none}
</style></head><body>
<div class="stage">
<div class="bar"></div>
<div class="brand">مضمونة · بورصة العقارات</div>
${body}
</div>
<script>
window.__replay=()=>{document.body.classList.remove('go');void document.body.offsetWidth;document.body.classList.add('go')}
window.__total=${total.toFixed(2)}
document.body.classList.add('go')
</script></body></html>`
fs.writeFileSync(OUT, html)

const vo = [
  'تسعة وسبعين مطوّر في مكان واحد… إيه اللي بيميّز كل مشروع؟',
  'في بورصة مضمونة العقارية دلوقتي: مية خمسة وأربعين مشروع نشط، من تسعة وسبعين مطوّر، في تسعة وأربعين منطقة.',
  'واللي بيفرق مش السعر لوحده: تمنية وستين مشروع معلنين خطة السداد، وتسعتاشر محددين تاريخ التسليم، وستاشر بيبدأوا من صفر في المية مقدم، وتلاتة استلام فوري.',
  'نيديت تاور، من ماتر ميكرز، في العاصمة الإدارية… تجاري، من مليون وستمية ألف جنيه، ومقدم اتنين ونص في المية والباقي على اتناشر سنة.',
  'تراي هَب، من قوافل للتطوير، في القاهرة الجديدة… تجاري، من أربعة مليون وتلتمية وواحد وتمانين ألف، ويبدأ من صفر في المية مقدم وأقساط لحد عشر سنين.',
  'هيليو آي ريزيدنس، من الكيان العقارية، في هليوبوليس الجديدة… سكني، من أربعة مليون وتلتمية وتسعين ألف، والاستلام فوري.',
  'كالما كوست، من أساس ديفلوبمنت، في الساحل الشمالي… سكني، من تمنية وعشرين ألف جنيه للمتر، والتسليم تلاتين شهر.',
  'مول ذا جراي، من إتش دي بي، في القاهرة الجديدة… تجاري، من أربعة مليون وخمسمية ألف، والتسليم ديسمبر ألفين ستة وعشرين.',
  'وأكتر المطوّرين مشاريع عندنا: أب-وايد بتسعة مشاريع، وبعدها الفتح جروب ورواق وقوافل وإتش دي بي بخمسة لكل واحد.',
  'عندك مشاريع؟ سجّلها مجانًا… والسعر اللي بتطلبه هو اللي بتاخده.',
  'وبتدوّر لنفسك؟ استشارة مجانية. إنت بتدوّر على إيه؟ واحد سكني، اتنين تجاري، تلاتة ساحل، أربعة استثمار… اكتب رقمك في كومنت.',
].join('\n')
fs.writeFileSync(P + 'output/vo-' + slug + '.txt', vo)

const link = (s, m) => `\nhttps://www.madmonacairo.com/start?utm_source=${s}&utm_medium=${m}&utm_campaign=realestate_projects&utm_content=${slug}`
const w = (p, t) => fs.writeFileSync(`${P}output/caption-${slug}-${p}.txt`, t)
const q = '\n\n❓ إنت بتدوّر على إيه؟ ١ سكني · ٢ تجاري · ٣ ساحل · ٤ استثمار — اكتب رقمك في كومنت 👇'
w('youtube', 'مشاريع المطوّرين في مصر — وإيه اللي بيميّز كل واحد #shorts\nمن بورصة مضمونة العقارية: ١٤٥ مشروع نشط من ٧٩ مطوّر في ٤٩ منطقة — بخطط السداد وتواريخ التسليم واللي بيميّز كل مشروع (٠٪ مقدم · استلام فوري · تقسيط ١٢ سنة).' + link('youtube', 'shorts') + q)
w('tiktok', 'مشاريع المطوّرين في مصر… وإيه اللي بيميّز كل واحد 🏙️ ٠٪ مقدم · استلام فوري · تقسيط لحد ١٢ سنة. إنت بتدوّر على إيه؟ ١/٢/٣/٤ في كومنت 👇 #عقارات_مصر #العاصمة_الإدارية #الساحل_الشمالي #مضمونة')
w('instagram', 'مشاريع المطوّرين في مصر — وإيه اللي بيميّز كل مشروع 🏙️\n\n١٤٥ مشروع نشط من ٧٩ مطوّر في ٤٩ منطقة على بورصة مضمونة: مين معلن خطة السداد، ومين محدد تاريخ التسليم، ومين بيبدأ من ٠٪ مقدم، ومين استلامه فوري.\n\nعندك مشروع؟ سجّله مجانًا — والسعر اللي بتطلبه هو اللي بتاخده. اللينك في البايو 👆' + q)
w('facebook', '🏙️ مشاريع المطوّرين في مصر — وإيه اللي بيميّز كل مشروع\n\nمن بورصة مضمونة العقارية (سحب النهارده): ١٤٥ مشروع نشط · ٧٩ مطوّر · ٤٩ منطقة. ٦٨ مشروع معلنين خطة السداد، ١٩ محددين تاريخ التسليم، ١٦ بيبدأوا من ٠٪ مقدم، و٣ استلام فوري.\n\nوفي الفيديو نماذج بالاسم: Nedit Tower (٢٫٥٪ مقدم وتقسيط ١٢ سنة) · TRI HUB (من ٠٪ مقدم لحد ١٠ سنين) · Helio Eye Residence (استلام فوري) · Calma Coast (الساحل) · Mall The Gray (تسليم ديسمبر ٢٠٢٦).\n\n📌 مطوّر أو مكتب؟ سجّل مشاريعك مجانًا — والسعر اللي بتطلبه هو اللي بتاخده:' + link('facebook', 'post') + '\n\n📌 بتشتري؟ استشارة مجانية — واتساب ٠١٠٠٢٢٢٩٩٨٢' + q)
w('threads', 'مشاريع المطوّرين في مصر وإيه اللي بيميّز كل واحد 🏙️ ١٤٥ مشروع من ٧٩ مطوّر — ٠٪ مقدم · استلام فوري · تقسيط لحد ١٢ سنة.' + link('threads', 'post'))
w('telegram', '🏙️ مشاريع المطوّرين — وإيه اللي بيميّز كل مشروع\n\n١٤٥ مشروع نشط · ٧٩ مطوّر · ٤٩ منطقة. نماذج بالاسم وخطط السداد وتواريخ التسليم.' + link('telegram', 'channel'))
w('comment', 'كل المشاريع بخطط السداد وتواريخ التسليم 👇 سجّل مشروعك مجانًا: https://www.madmonacairo.com/start?utm_source=facebook&utm_medium=comment&utm_campaign=realestate_projects&utm_content=' + slug + '\nاستشارة مجانية للمشترين: واتساب ٠١٠٠٢٢٢٩٩٨٢')
console.log('ok scenes', sc.length, 'total', total, 'vo', vo.length, '->', OUT)
