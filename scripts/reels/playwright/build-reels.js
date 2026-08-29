// build-reels.js — يبني ملفات HTML ٩:١٦ لريلز الحملة من reels.config.js
//
// ليه اتعمل (٢٩/٨/٢٠٢٦): كل ريل كان بيتكتب بإيد كملف HTML كامل — نسخ
// ولزق لنفس الـCSS في كل مرة، وأي تعديل في الهوية لازم يتكرر في كل ملف.
// دلوقتي القالب واحد والمحتوى في ملف تعريف، فأي ريل جديد = بضع سطور.
//
// الهوية من tailwind.config.ts: brand.green #1F6F5F · gold #2FA084
// · orange #6FCF97 · neutral #FAFAF7 · خط Cairo.
//
// 🔑 كل ملف بيعرّض window.__replay عشان record-url.js يشغّل الأنيميشن
//    من الثانية صفر ويخطو فريم بفريم.
//
//   node build-reels.js            # يبني الكل
//   node build-reels.js price      # يبني ريل واحد

const fs = require('fs')
const path = require('path')
const reels = require('./reels.config.js')

const LOGO = 'data:image/png;base64,' +
  fs.readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'madmona-logo.png')).toString('base64')

const esc = s => String(s == null ? '' : s)

// خلفية صورة لأي مشهد: بتتحوّل data URI عشان الملف يفضل مستقل
const BG = {}
function bgUri(name) {
  if (!name) return null
  if (!BG[name]) {
    const p = path.join(__dirname, 'bg', name)
    BG[name] = 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64')
  }
  return BG[name]
}

// ---------------------------------------------------------------- scenes
function renderScene(sc, i, t) {
  const cls = `sc s${i}${sc.bg ? ' has-bg' : ''}`
  const bg = sc.bg ? `<span class="bgimg"><img src="${bgUri(sc.bg)}" alt=""></span>` : ''
  switch (sc.type) {
    case 'chat':
      return `<div class="${cls} chat">${bg}
${sc.bubbles.map(b => `    <div class="bub ${b.who}">${esc(b.text)}</div>`).join('\n')}
${sc.ask ? `    <div class="ask">${esc(sc.ask)}</div>` : ''}
  </div>`

    case 'big':
      return `<div class="${cls} mid-c">${bg}
    <p class="big">${esc(sc.text)}${sc.em ? `<em>${esc(sc.em)}</em>` : ''}</p>
${sc.note ? `    <p class="note">${esc(sc.note)}</p>` : ''}
  </div>`

    case 'parties':
      return `<div class="${cls} party-sc">${bg}
    <p class="head">${esc(sc.head)}</p>
    <div class="parties">
      <div class="party"><span>${esc(sc.leftIcon || '🏭')}</span>${esc(sc.left)}</div>
      ${sc.mid
        ? `<div class="mid"><i></i><span class="mark"><img src="${LOGO}" alt="مضمونة"></span><b>مضمونة</b></div>`
        : `<div class="gapx"><i></i>${esc(sc.gapLabel || 'مفيش')}</div>`}
      <div class="party"><span>${esc(sc.rightIcon || '🙋')}</span>${esc(sc.right)}</div>
    </div>
${sc.foot ? `    <p class="head">${esc(sc.foot)}</p>` : ''}
  </div>`

    case 'rows':
      return `<div class="${cls}">${bg}
${sc.cap ? `    <p class="cap">${esc(sc.cap)}</p>` : ''}
    <div class="rows">
${sc.items.map(it => `      <div class="row ${sc.tone || 'good'}"><span class="tk">${sc.tone === 'bad' ? '✕' : '✓'}</span>${esc(it)}</div>`).join('\n')}
    </div>
  </div>`

    case 'panels':
      return `<div class="${cls} panels-sc">
${sc.items.map(p => `    <div class="panel"><span class="k">${esc(p.k)}</span><b class="v">${esc(p.v)}</b></div>`).join('\n')}
  </div>`

    case 'end':
      return `<div class="${cls} endcard">
    <span class="end-mark"><img src="${LOGO}" alt="مضمونة"></span>
    <div class="end-line">${esc(sc.line)}</div>
    <p class="end-sub">${esc(sc.sub)}</p>
  </div>`

    default:
      throw new Error(`نوع مشهد مش معروف: ${sc.type}`)
  }
}

// توقيت تراكمي + تأخير كل عنصر جوّه مشهده
function timing(scenes) {
  let t = 0
  const out = []
  scenes.forEach((sc, idx) => {
    const i = idx + 1
    out.push(`.s${i}{animation-delay:${t.toFixed(2)}s;animation-duration:${sc.len.toFixed(2)}s}`)
    // العناصر اللي بتدخل واحد ورا التاني
    const stagger = (sel, n, step, from) => {
      for (let k = 0; k < n; k++) {
        out.push(`body.go .s${i} ${sel}:nth-of-type(${k + 1}){animation-delay:${(t + from + k * step).toFixed(2)}s}`)
      }
    }
    if (sc.type === 'chat') {
      stagger('.bub', sc.bubbles.length, 1.5, 0.3)
      if (sc.ask) out.push(`body.go .s${i} .ask{animation-delay:${(t + 0.3 + sc.bubbles.length * 1.5).toFixed(2)}s}`)
    }
    if (sc.type === 'rows') stagger('.row', sc.items.length, 0.35, 0.25)
    if (sc.type === 'panels') stagger('.panel', sc.items.length, 0.9, 0.35)
    if (sc.type === 'parties' && sc.mid) out.push(`body.go .s${i} .mid{animation-delay:${(t + 0.5).toFixed(2)}s}`)
    if (sc.type === 'end') out.push(`body.go .s${i} .end-mark{animation-delay:${(t + 0.25).toFixed(2)}s}`)
    t += sc.len
  })
  return { css: out.join('\n'), total: t }
}

// ---------------------------------------------------------------- template
function html(reel) {
  const { css: times, total } = timing(reel.scenes)
  const body = reel.scenes.map((sc, i) => renderScene(sc, i + 1)).join('\n\n  ')

  return `<title>${reel.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap">

<style>
/* هوية مضمونة — tailwind.config.ts */
:root{--green:#1F6F5F;--green-2:#2FA084;--mint:#6FCF97;--neutral:#FAFAF7;
      --ink:#0A0A0A;--ink-soft:#5B6360;--line:#DFE3E0;--card:#FFF;--warn:#B4552F}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--ink);display:grid;place-items:center;direction:rtl;overflow:hidden;
     font-family:"Cairo",system-ui,"Segoe UI",sans-serif}
.stage{position:relative;overflow:hidden;container-type:size;cursor:pointer;
       width:min(100vw,calc(100vh*9/16));height:min(100vh,calc(100vw*16/9));
       background:var(--neutral);color:var(--ink)}

.sc{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;
    gap:4cqw;padding:13cqw 8cqw;opacity:0}
body.go .sc{animation-name:fade;animation-fill-mode:both;animation-timing-function:cubic-bezier(.3,.8,.3,1)}
@keyframes fade{0%{opacity:0;transform:translateY(2.6cqw)}8%{opacity:1;transform:none}
                91%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-1.4cqw)}}

/* خلفية صورة — زووم بطيء والنص فوقها بتدرّج غامق */
.has-bg{color:#F3F0EC}
.bgimg{position:absolute;inset:0;overflow:hidden;z-index:0}
.bgimg img{width:100%;height:100%;object-fit:cover;transform-origin:58% 45%}
.bgimg::after{content:"";position:absolute;inset:0;
  background:linear-gradient(to top, rgba(8,10,9,.92) 0%, rgba(8,10,9,.66) 45%, rgba(8,10,9,.34) 100%)}
.has-bg > *:not(.bgimg){position:relative;z-index:1}
.has-bg .big em,.has-bg .head em,.has-bg .cap{color:var(--mint)}
.has-bg .note{color:#C8CFCB}
body.go .has-bg .bgimg img{animation:kenburns 15s linear both}
@keyframes kenburns{from{transform:scale(1.04)}to{transform:scale(1.20)}}

/* chat */
.chat{justify-content:flex-end;padding-bottom:22cqw}
.bub{max-width:80%;padding:3.4cqw 4.4cqw;border-radius:4.5cqw;font-size:5.4cqw;
     line-height:1.6;font-weight:600;opacity:0}
.bub.them{align-self:flex-start;background:var(--card);border:1px solid var(--line);border-bottom-right-radius:1.2cqw}
.bub.me{align-self:flex-end;background:var(--green);color:#EFF7F4;border-bottom-left-radius:1.2cqw}
.ask{align-self:flex-end;margin-top:2.4cqw;font-size:10.5cqw;font-weight:900;
     color:var(--green);letter-spacing:-.02em;opacity:0}
body.go .bub,body.go .ask{animation:pop .45s both cubic-bezier(.2,.85,.3,1.05)}
@keyframes pop{from{opacity:0;transform:translateY(2.2cqw) scale(.97)}to{opacity:1;transform:none}}

/* big */
.mid-c{justify-content:center;align-items:center;text-align:center;gap:5cqw}
.big{font-size:11cqw;font-weight:900;line-height:1.25;letter-spacing:-.03em}
.big em{font-style:normal;color:var(--green);display:block}
.note{font-size:4.6cqw;color:var(--ink-soft);font-weight:600;max-width:78%}

/* parties */
.party-sc{justify-content:center;gap:5cqw}
.head{font-size:6.6cqw;font-weight:900;line-height:1.4;letter-spacing:-.02em;text-align:center}
.head em{font-style:normal;color:var(--green)}
.parties{display:flex;align-items:center;justify-content:space-between;gap:2cqw}
.party{flex:1;background:var(--card);border:1px solid var(--line);border-radius:3.4cqw;
       padding:5cqw 2cqw;text-align:center;font-size:4.4cqw;font-weight:700;color:var(--ink-soft)}
.party span{display:block;font-size:8.5cqw;margin-bottom:1.4cqw}
.gapx{flex:0 0 22%;display:grid;place-items:center;font-size:5cqw;font-weight:800;color:var(--warn)}
.gapx i{display:block;width:100%;border-top:.7cqw dashed #D8C2B7;margin-bottom:1.6cqw}
.mid{flex:0 0 30%;display:flex;flex-direction:column;align-items:center;gap:1.6cqw;opacity:0}
.mid i{display:block;width:100%;border-top:.7cqw solid var(--mint)}
.mark{width:19cqw;height:19cqw;border-radius:50%;background:var(--card);
      border:.5cqw solid var(--green);display:grid;place-items:center;overflow:hidden;
      box-shadow:0 1.4cqw 3.4cqw rgba(31,111,95,.26)}
.mark img{width:15cqw;height:15cqw;object-fit:contain}
.mid b{font-size:4.2cqw;font-weight:800;color:var(--green)}
body.go .mid{animation:drop .6s both cubic-bezier(.2,.9,.25,1.12)}
@keyframes drop{from{opacity:0;transform:translateY(-5cqw) scale(.8)}to{opacity:1;transform:none}}

/* rows */
.cap{font-size:5.2cqw;font-weight:900;color:var(--green);letter-spacing:-.02em;margin-bottom:1cqw}
.rows{display:flex;flex-direction:column;gap:3cqw}
.row{display:flex;align-items:center;gap:3.2cqw;background:var(--card);border:1px solid var(--line);
     border-radius:2.6cqw;padding:3.6cqw 4cqw;font-size:4.7cqw;font-weight:700;line-height:1.5;opacity:0}
.row .tk{width:7cqw;height:7cqw;flex:none;border-radius:50%;display:grid;place-items:center;
         font-size:4cqw;font-weight:900}
.row.good .tk{background:rgba(47,160,132,.14);color:var(--green-2)}
.row.bad .tk{background:rgba(180,85,47,.14);color:var(--warn)}
body.go .row{animation:slide .5s both cubic-bezier(.2,.8,.3,1)}
@keyframes slide{from{opacity:0;transform:translateX(3cqw)}to{opacity:1;transform:none}}

/* panels — ٣ بانلات أفقية */
.panels-sc{justify-content:center;gap:3cqw;padding:13cqw 7cqw}
.panel{flex:1;max-height:22cqw;background:var(--card);border:1px solid var(--line);border-radius:3cqw;
       display:flex;align-items:center;justify-content:space-between;padding:0 6cqw;opacity:0}
.panel .k{font-size:5.4cqw;font-weight:700;color:var(--ink-soft)}
.panel .v{font-size:11cqw;font-weight:900;color:var(--green);letter-spacing:-.03em}
body.go .panel{animation:slide .55s both cubic-bezier(.2,.8,.3,1)}

/* end */
.endcard{background:var(--green);align-items:center;text-align:center;justify-content:center;gap:5.5cqw}
.end-mark{width:34cqw;height:34cqw;border-radius:50%;background:#FFF;display:grid;
          place-items:center;overflow:hidden;opacity:0}
.end-mark img{width:29cqw;height:29cqw;object-fit:contain}
.end-line{font-size:10.5cqw;font-weight:900;color:var(--neutral);line-height:1.35;letter-spacing:-.03em}
.end-sub{font-size:4.6cqw;font-weight:600;color:#BFE0D6}
body.go .end-mark{animation:drop .55s both cubic-bezier(.2,.9,.25,1.12)}

.bar{position:absolute;top:0;right:0;height:.6cqw;background:var(--green-2);width:0;opacity:.8}
body.go .bar{animation:grow ${total.toFixed(2)}s linear both}
@keyframes grow{to{width:100%}}

${times}

@media (prefers-reduced-motion:reduce){
  body.go .sc,body.go .row,body.go .mid,body.go .end-mark,body.go .bar,
  body.go .bub,body.go .ask,body.go .panel{animation-duration:.01s}
}
</style>

<div class="stage" id="stage" title="دوس عشان تبدأ من الأول">
  <div class="bar"></div>

  ${body}
</div>

<script>
(function () {
  var b = document.body, s = document.getElementById('stage');
  function play () { b.classList.remove('go'); void s.offsetWidth; b.classList.add('go') }
  s.addEventListener('click', play);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'r' || e.key === 'R' || e.key === ' ') { e.preventDefault(); play() }
  });
  window.__replay = play;   // record-url.js بيناديها قبل أول فريم
  play();
})();
</script>
`
}

// ---------------------------------------------------------------- main
const only = process.argv[2]
const outDir = path.join(__dirname, 'reels')
fs.mkdirSync(outDir, { recursive: true })

const built = []
for (const reel of reels) {
  if (only && reel.slug !== only) continue
  const { total } = timing(reel.scenes)
  const file = path.join(outDir, `reel-${reel.slug}.html`)
  fs.writeFileSync(file, html(reel), 'utf8')
  // +total.toFixed(2) لأن جمع الكسور بيدي 23.000000000000004 فـceil يطلّع 24
  built.push({ slug: reel.slug, file, seconds: Math.ceil(+total.toFixed(2)) })
  console.log(`✓ ${reel.slug}  →  ${path.relative(process.cwd(), file)}  (${total.toFixed(1)}s)`)
}

if (!built.length) { console.error(only ? `مفيش ريل اسمه "${only}"` : 'مفيش ريلز'); process.exit(1) }

console.log('\nللتسجيل:')
for (const b of built) {
  console.log(`  node record-url.js "file:///${b.file.replace(/\\/g, '/')}" ${b.seconds}`)
}
