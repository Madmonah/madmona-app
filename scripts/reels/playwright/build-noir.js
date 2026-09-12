// ============================================================================
// 🎞️ build-noir.js — ريلز «قصة بالرسم» بأسلوب الكارتون الأسود/الأبيض (١١/٩/٢٠٢٦)
//
// محمد: «شوفت الفيديو ده (قوي ذهنك — «هكذا تبدو حياتك داخل كارتل سينالوا»)؟ عايزين نعمل فيديوهات شبهه».
// الأسلوب: خلفية سودا · شخصيات خطية بيضا (stick figures) · لمسة حمرا واحدة · عمود نور · راوي درامي (بهجت V2)
// · جملة الراوي كترجمة كبيرة تحت. كل حاجة SVG + CSS animations — صفر أصول خارجية، صفر API.
//
// الاستخدام: node build-noir.js <slug>   ← بيقرا noir.config.js وبيكتب reels/noir-<slug>.html
// التسجيل: node record-url.js "file:///…/reels/noir-<slug>.html" <sec> --audio vo-<slug>-lahajati.mp3
// ============================================================================
const fs = require('fs')
const path = require('path')
const reels = require('./noir.config.js')

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------- الشخصية: رأس + جسم + ذراعين + رجلين. الوضعيات بالـclass ----------
// x,y = مكان القدمين (وسط)، h = طول الشخصية بوحدات SVG (اللوحة 1080×1920)
function fig({ x, y, h = 320, pose = 'stand', cls = '', flip = false, red = false, delay = 0 }) {
  const s = h / 320
  const t = `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`
  // الرأس عند y=-300، الكتف -220، الحوض -110، القدم 0
  return `<g class="fig-pos" transform="${t}"><g class="fig pose-${pose} ${cls}" style="animation-delay:${delay}s">
    <circle class="head" cx="0" cy="-268" r="34"/>
    ${red ? '<path class="band" d="M-34 -276 Q0 -292 34 -276 L34 -262 Q0 -248 -34 -262 Z"/>' : ''}
    <line class="torso" x1="0" y1="-234" x2="0" y2="-110"/>
    <g class="arm arm-l"><line x1="0" y1="-220" x2="-52" y2="-140"/></g>
    <g class="arm arm-r"><line x1="0" y1="-220" x2="52" y2="-140"/></g>
    <g class="leg leg-l"><line x1="0" y1="-110" x2="-38" y2="0"/></g>
    <g class="leg leg-r"><line x1="0" y1="-110" x2="38" y2="0"/></g>
    ${pose === 'phone' ? '<rect class="phone" x="40" y="-262" width="26" height="46" rx="5"/><circle class="glow" cx="53" cy="-239" r="60"/>' : ''}
    ${pose === 'headdown' ? '<circle class="sweat" cx="44" cy="-300" r="6"/>' : ''}
  </g></g>`
}

const props = {
  lamp: (x, y, h = 700) => `<g class="lamp" transform="translate(${x} ${y})">
      <line class="pole" x1="0" y1="0" x2="0" y2="${-h}"/><line class="pole" x1="0" y1="${-h}" x2="90" y2="${-h + 20}"/>
      <circle class="bulb" cx="96" cy="${-h + 34}" r="14"/>
      <path class="cone" d="M96 ${-h + 40} L-260 0 L452 0 Z"/></g>`,
  ground: (y = 1500) => `<line class="ground" x1="0" y1="${y}" x2="1080" y2="${y}"/>`,
  house: (x, y, w = 200, cls = '') => `<g class="house ${cls}" transform="translate(${x} ${y})">
      <path d="M0 0 L0 ${-w * 0.7} L${w / 2} ${-w * 1.05} L${w} ${-w * 0.7} L${w} 0 Z"/>
      <rect x="${w * 0.38}" y="${-w * 0.42}" width="${w * 0.24}" height="${w * 0.42}"/>
      <rect class="win" x="${w * 0.1}" y="${-w * 0.6}" width="${w * 0.18}" height="${w * 0.18}"/></g>`,
  car: (x, y, w = 340) => `<g class="car" transform="translate(${x} ${y})">
      <path d="M0 0 L0 ${-w * 0.22} L${w * 0.22} ${-w * 0.24} L${w * 0.34} ${-w * 0.42} L${w * 0.72} ${-w * 0.42} L${w * 0.86} ${-w * 0.24} L${w} ${-w * 0.2} L${w} 0 Z"/>
      <circle cx="${w * 0.22}" cy="0" r="${w * 0.08}"/><circle cx="${w * 0.78}" cy="0" r="${w * 0.08}"/></g>`,
  desk: (x, y, w = 420) => `<g class="desk" transform="translate(${x} ${y})">
      <line x1="0" y1="0" x2="${w}" y2="0"/><line x1="${w * 0.08}" y1="0" x2="${w * 0.08}" y2="130"/><line x1="${w * 0.92}" y1="0" x2="${w * 0.92}" y2="130"/></g>`,
  papers: (x, y, n = 7) => `<g class="papers" transform="translate(${x} ${y})">${Array.from({ length: n }, (_, i) =>
    `<rect class="paper" x="${(i % 4) * 46 - 90}" y="${-Math.floor(i / 4) * 30}" width="60" height="76" rx="3" style="animation-delay:${(i * 0.25).toFixed(2)}s" transform="rotate(${(i * 37) % 30 - 15})"/>`).join('')}</g>`,
  bubble: (x, y, text, w = 420) => `<g transform="translate(${x} ${y})"><g class="bubble">
      <rect x="${-w / 2}" y="-70" width="${w}" height="112" rx="26"/><path d="M-30 42 L-10 90 L20 42 Z"/>
      <text x="0" y="8" text-anchor="middle">${esc(text)}</text></g></g>`,
  qmark: (x, y) => `<text class="qmark" x="${x}" y="${y}" text-anchor="middle">؟</text>`,
  ring: (x, y) => `<g class="ring" transform="translate(${x} ${y})"><circle r="40"/><circle r="70"/><circle r="100"/></g>`,
  calendar: (x, y) => `<g class="calendar" transform="translate(${x} ${y})">
      <rect x="-120" y="-140" width="240" height="260" rx="14"/><rect class="cal-top" x="-120" y="-140" width="240" height="58" rx="14"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect class="day" x="${-90 + (i % 4) * 58}" y="${-60 + Math.floor(i / 4) * 58}" width="40" height="40" rx="6" style="animation-delay:${(i * 0.3).toFixed(2)}s"/>`).join('')}</g>`,
  bigphone: (x, y, lines = []) => `<g class="bigphone" transform="translate(${x} ${y})">
      <rect x="-190" y="-380" width="380" height="760" rx="46"/><rect class="screen" x="-170" y="-350" width="340" height="700" rx="30"/>
      ${lines.map((l, i) => `<rect class="row" x="-140" y="${-300 + i * 96}" width="280" height="64" rx="12" style="animation-delay:${(0.4 + i * 0.35).toFixed(2)}s"/>
        <text class="rowtxt" x="0" y="${-258 + i * 96}" text-anchor="middle" style="animation-delay:${(0.5 + i * 0.35).toFixed(2)}s">${esc(l)}</text>`).join('')}</g>`,
  flash: (x, y) => `<circle class="flash" cx="${x}" cy="${y}" r="220"/>`,
}

// كل مشهد: { len, sub (جملة الراوي), draw: (p)=>svg , mood: 'dark'|'turn'|'brand' }
function renderScene(sc, i, t) {
  const body = typeof sc.draw === 'function' ? sc.draw(props, fig) : ''
  return `<div class="sc s${i} mood-${sc.mood || 'dark'}" style="animation-delay:${t.toFixed(2)}s;animation-duration:${sc.len.toFixed(2)}s">
    <svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">${body}</svg>
    ${sc.title ? `<h1 class="title">${esc(sc.title)}${sc.em ? `<em>${esc(sc.em)}</em>` : ''}</h1>` : ''}
    ${sc.sub ? `<p class="sub">${esc(sc.sub)}</p>` : ''}
  </div>`
}

function html(reel) {
  let t = 0
  const scenes = reel.scenes.map((sc, i) => { const h = renderScene(sc, i, t); t += sc.len; return h }).join('\n')
  const total = t
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(reel.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0a0a;--ink:#f2f2f2;--dim:#8a8a8a;--red:#e0262e;--green:#2FA084;--mint:#6FCF97}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:#000;display:grid;place-items:center;direction:rtl;overflow:hidden;font-family:"Cairo",system-ui,sans-serif}
.stage{position:relative;overflow:hidden;container-type:size;width:min(100vw,calc(100vh*9/16));height:min(100vh,calc(100vw*16/9));background:var(--bg);color:var(--ink)}
.sc{position:absolute;inset:0;opacity:0}
body.go .sc{animation-name:fade;animation-fill-mode:both;animation-timing-function:cubic-bezier(.3,.8,.3,1)}
@keyframes fade{0%{opacity:0}6%{opacity:1}94%{opacity:1}100%{opacity:0}}
/* 🖼️ (١٢/٩/٢٠٢٦) محمد: «كل الفيديوهات بتتعرض كشاشة بيضاء قبل ما تدوس» — الفريم الأول كان أسود (fade من 0). المشهد الأول يبدأ ظاهر عشان الثمبنيل يبقى فيه محتوى. */
body.go .sc.s0{animation-name:fadeFirst}
@keyframes fadeFirst{0%{opacity:1}94%{opacity:1}100%{opacity:0}}
.sc svg{position:absolute;inset:0;width:100%;height:100%}
/* الخطوط */
.fig line,.fig circle.head,.lamp .pole,.house path,.house rect,.car path,.car circle,.desk line,.calendar rect,.bigphone rect,.ground,.bubble rect,.bubble path,.ring circle{fill:none;stroke:var(--ink);stroke-width:9;stroke-linecap:round;stroke-linejoin:round}
.fig circle.head{fill:var(--bg)}
.fig .band{fill:var(--red);stroke:none}
.fig .phone{fill:var(--ink);stroke:none}
.fig .glow{fill:rgba(255,255,255,.10);stroke:none}
.fig .sweat{fill:var(--ink);stroke:none}
.lamp .bulb{fill:#fff7d6;stroke:none;filter:drop-shadow(0 0 30px #fff3b0)}
.lamp .cone{fill:rgba(255,246,200,.11);stroke:none}
.house .win{fill:#fff7d6;stroke:none}
.car path,.car circle{stroke:var(--dim)}
.papers .paper{fill:var(--ink);stroke:none;opacity:0}
.bubble rect,.bubble path{fill:var(--bg)}
.bubble text{fill:var(--ink);font-family:Cairo;font-weight:900;font-size:44px}
.qmark{fill:var(--red);font-family:Cairo;font-weight:900;font-size:220px;opacity:0}
.ring circle{stroke:var(--red);opacity:0}
.calendar .cal-top{fill:var(--red);stroke:none}
.calendar .day{fill:none;stroke:var(--dim);stroke-width:5}
.bigphone .screen{fill:#0f1613;stroke:var(--green)}
.bigphone .row{fill:rgba(47,160,132,.18);stroke:var(--green);stroke-width:4;opacity:0}
.bigphone .rowtxt{fill:var(--mint);font-family:Cairo;font-weight:800;font-size:34px;opacity:0}
.flash{fill:#fff;opacity:0}
/* النصوص */
.title{position:absolute;top:12cqw;inset-inline:7cqw;text-align:center;font-size:9.5cqw;font-weight:900;line-height:1.25;color:var(--ink);text-shadow:0 2px 30px rgba(0,0,0,.9)}
.title em{display:block;font-style:normal;color:var(--red)}
.mood-brand .title em,.mood-turn .title em{color:var(--mint)}
.sub{position:absolute;bottom:5cqw;inset-inline:7cqw;text-align:center;font-size:6.4cqw;font-weight:800;line-height:1.5;color:var(--ink);background:rgba(0,0,0,.55);padding:2.4cqw 3cqw;border-radius:3cqw;border-inline-start:1.6cqw solid var(--red)}
.mood-brand .sub,.mood-turn .sub{border-color:var(--green)}
.mood-brand{background:#071711}
.mood-brand .fig line,.mood-brand .fig circle.head,.mood-brand .desk line,.mood-brand .ground{stroke:var(--mint)}
/* الحركة */
@keyframes walk{0%,100%{transform:rotate(-22deg)}50%{transform:rotate(22deg)}}
@keyframes walkR{0%,100%{transform:rotate(22deg)}50%{transform:rotate(-22deg)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-140px)}}
@keyframes fall{0%{opacity:0;transform:translateY(-500px) rotate(0)}30%{opacity:1}100%{opacity:1;transform:translateY(0) rotate(0)}}
@keyframes popin{0%{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
@keyframes ringout{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(1.4)}}
@keyframes flashk{0%,100%{opacity:0}8%{opacity:.85}30%{opacity:0}}
@keyframes flicker{0%,19%,21%,23%,80%,100%{opacity:1}20%,22%{opacity:.35}}
@keyframes dayfill{to{fill:var(--red)}}
@keyframes rowin{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
@keyframes shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
.fig .leg,.fig .arm{transform-box:fill-box;transform-origin:top center}
body.go .pose-walk .leg-l{animation:walk .7s infinite ease-in-out}
body.go .pose-walk .leg-r{animation:walkR .7s infinite ease-in-out}
body.go .pose-walk .arm-l{animation:walkR .7s infinite ease-in-out}
body.go .pose-walk .arm-r{animation:walk .7s infinite ease-in-out}
body.go .pose-phone .arm-r{transform:rotate(-95deg)}
.pose-phone .arm-r{transform:rotate(-95deg)}
.pose-point .arm-r{transform:rotate(-70deg)}
.pose-headdown .head{transform:translateY(26px)}
.pose-headdown .arm-r{transform:rotate(60deg)}
.pose-headdown .arm-l{transform:rotate(-60deg)}
body.go .pose-headdown{animation:shake 2.2s infinite ease-in-out}
body.go .fig.walker{animation:drift 6s linear both}
body.go .papers .paper{animation:fall 1.4s both cubic-bezier(.2,.7,.3,1)}
body.go .qmark{animation:popin .6s both}
body.go .ring circle{animation:ringout 1.6s infinite}
body.go .ring circle:nth-child(2){animation-delay:.4s}
body.go .ring circle:nth-child(3){animation-delay:.8s}
body.go .flash{animation:flashk 2.4s 1.2s both}
body.go .lamp .bulb{animation:flicker 5s infinite}
body.go .calendar .day{animation:dayfill .3s both}
body.go .bigphone .row,body.go .bigphone .rowtxt{animation:rowin .5s both}
body.go .bubble{animation:popin .6s .6s both;transform-box:fill-box;transform-origin:center}
body.go .title{animation:popin .8s .2s both}
body.go .sub{animation:popin .6s .5s both}
</style></head>
<body><div class="stage" onclick="document.body.classList.add('go')">
${scenes}
</div>
<script>
window.__replay=()=>{document.body.classList.remove('go');void document.body.offsetWidth;document.body.classList.add('go')}
window.__total=${total.toFixed(2)}
setTimeout(()=>document.body.classList.add('go'),300)
</script></body></html>`
}

const only = process.argv[2]
for (const reel of reels) {
  if (only && reel.slug !== only) continue
  const out = path.join(__dirname, 'reels', 'noir-' + reel.slug + '.html')
  fs.writeFileSync(out, html(reel))
  const total = reel.scenes.reduce((p, s) => p + s.len, 0)
  console.log(`✓ ${out} (${total.toFixed(1)}s)`)
  console.log(`  node record-url.js "file:///${out.replace(/\\/g, '/')}" ${Math.ceil(total) + 1} --audio vo-${reel.slug}-lahajati.mp3`)
}
