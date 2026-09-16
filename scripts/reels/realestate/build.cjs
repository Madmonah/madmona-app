// 🏙️ باني تقرير مضمونة العقاري — فيديو أفقي 1920×1080 (١٦/٩/٢٠٢٦)
// الفكرة زي erp/build.cjs: كروت HTML → لقطات عبر كروم CDP 9222 → مقاطع ffmpeg + صوت لهجتي (بهجت V2).
// التشغيل:
//   1) node build.cjs cards     → يولّد HTML + لقطات PNG لكل كارت (محتاج كروم 9222 شغّال)
//   2) (تولّد الصوت من لهجتي لكل مقطع وتحطه في vo/g1.mp3 … g5.mp3 — النصوص في vo/g*.txt)
//   3) node build.cjs video     → يحسب المدد من طول كل مقطع صوتي ويركّب الفيديو النهائي
// المخرج: output/madmona-realestate-report.mp4
const fs = require('fs')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')
const ff = require('E:/madmona-app/node_modules/ffmpeg-static')
const { chromium } = require('E:/madmona-app/node_modules/playwright-core')
const { BRAND, cards, segments } = require('./report.config.cjs')

const D = 'E:/madmona-app/scripts/reels/realestate/'
const FONTS = 'file:///E:/madmona-app/scripts/reels/fonts/'
const OUT = 'E:/madmona-app/scripts/reels/playwright/output/'
const mk = p => { fs.mkdirSync(D + p, { recursive: true }); return D + p + '/' }
const dur = f => {
  const m = spawnSync(ff, ['-i', f], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/)
  return m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) : 0
}

const css = `
@font-face{font-family:Tajawal;src:url('${FONTS}Tajawal-Regular.ttf');font-weight:400}
@font-face{font-family:Tajawal;src:url('${FONTS}Tajawal-Bold.ttf');font-weight:700}
@font-face{font-family:Tajawal;src:url('${FONTS}Tajawal-ExtraBold.ttf');font-weight:800}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1920px;height:1080px;background:${BRAND.bg};font-family:Tajawal,sans-serif;color:${BRAND.ink};overflow:hidden}
.wrap{padding:72px 96px;height:100%;display:flex;flex-direction:column}
.bar{height:14px;background:${BRAND.dark};width:100%;position:absolute;top:0;left:0}
.brand{position:absolute;top:34px;left:96px;color:${BRAND.dark};font-weight:800;font-size:30px;letter-spacing:.5px}
h1{font-size:82px;font-weight:800;color:${BRAND.dark};line-height:1.18;margin-bottom:28px}
h2{font-size:64px;font-weight:800;color:${BRAND.dark};margin-bottom:40px}
.sub{font-size:44px;color:#2b463c;line-height:1.5}
.foot{position:absolute;bottom:56px;right:96px;left:96px;font-size:26px;color:#5b6d65}
.src{margin-top:auto;font-size:26px;color:#5b6d65;border-top:2px solid #dfe7e2;padding-top:20px}
ul{list-style:none;display:flex;flex-direction:column;gap:30px}
li{font-size:46px;line-height:1.45;display:flex;gap:22px;align-items:flex-start}
li .dot{width:18px;height:18px;border-radius:50%;background:${BRAND.accent};margin-top:22px;flex:none}
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:34px}
.stat{background:#fff;border:2px solid #e3ebe6;border-radius:26px;padding:38px 42px}
.stat .k{font-size:78px;font-weight:800;color:${BRAND.dark};line-height:1}
.stat .v{font-size:32px;color:#3a5349;margin-top:14px;line-height:1.4}
table{width:100%;border-collapse:collapse;font-size:38px}
td{padding:26px 22px;border-bottom:2px solid #e3ebe6;vertical-align:middle}
td:first-child{font-weight:700;color:${BRAND.dark};width:38%}
td:last-child{color:${BRAND.accent};font-weight:700;text-align:left;white-space:nowrap}
.tl{display:flex;flex-direction:column;gap:26px}
.tl .row{display:flex;gap:28px;align-items:center;background:#fff;border:2px solid #e3ebe6;border-radius:22px;padding:28px 34px}
.tl .t{font-size:38px;font-weight:800;color:${BRAND.accent};min-width:280px}
.tl .v{font-size:36px;color:#23382f;line-height:1.4}
.bars{display:flex;flex-direction:column;gap:24px}
.brow{display:flex;align-items:center;gap:24px}
.brow .t{font-size:36px;min-width:330px;font-weight:700}
.brow .b{height:46px;background:${BRAND.dark};border-radius:10px}
.brow .n{font-size:34px;font-weight:800;color:${BRAND.dark}}
.devs{display:flex;flex-direction:column;gap:26px}
.dev{background:#fff;border:2px solid #e3ebe6;border-radius:24px;padding:30px 36px}
.dev .n{font-size:44px;font-weight:800;color:${BRAND.dark}}
.dev .a{font-size:30px;color:#5b6d65;margin-top:8px}
.dev .x{font-size:34px;color:${BRAND.accent};font-weight:700;margin-top:12px}
.q{font-size:52px;line-height:1.5;background:#fff;border-right:12px solid ${BRAND.accent};border-radius:22px;padding:48px 54px;color:#20342c}
.cta{display:flex;flex-direction:column;gap:30px;font-size:44px;line-height:1.45}
.cta .line{background:#fff;border:2px solid #e3ebe6;border-radius:22px;padding:30px 36px}
.big{font-size:60px;font-weight:800;color:${BRAND.dark}}
.devs.compact{gap:14px}
.devs.compact .dev{padding:18px 28px}
.devs.compact .n{font-size:34px}
.devs.compact .a{font-size:24px;margin-top:4px}
.devs.compact .x{font-size:28px;margin-top:6px}
table.compact{font-size:32px}
table.compact td{padding:18px 18px}
`

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

function body(c) {
  if (c.kind === 'title') return `<h1>${esc(c.title)}</h1><div class=sub>${esc(c.sub || '')}</div>`
  if (c.kind === 'bullets') return `<h2>${esc(c.title)}</h2><ul>${c.bullets.map(b => `<li><span class=dot></span><span>${esc(b)}</span></li>`).join('')}</ul>`
  if (c.kind === 'stats') return `<h2>${esc(c.title)}</h2><div class=stats>${c.stats.map(s => `<div class=stat><div class=k>${esc(s.k)}</div><div class=v>${esc(s.v)}</div></div>`).join('')}</div>`
  if (c.kind === 'rows') return `<h2>${esc(c.title)}</h2><table class="${c.rows.length > 5 ? 'compact' : ''}">${c.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2] || '')}</td></tr>`).join('')}</table>`
  if (c.kind === 'timeline') return `<h2>${esc(c.title)}</h2><div class=tl>${c.items.map(i => `<div class=row><div class=t>${esc(i.t)}</div><div class=v>${esc(i.v)}</div></div>`).join('')}</div>`
  if (c.kind === 'bars') { const mx = Math.max(...c.bars.map(b => b.n)); return `<h2>${esc(c.title)}</h2><div class=bars>${c.bars.map(b => `<div class=brow><div class=t>${esc(b.t)}</div><div class=b style="width:${Math.round((b.n / mx) * 940)}px"></div><div class=n>${b.n}</div></div>`).join('')}</div>` }
  if (c.kind === 'devs') return `<h2>${esc(c.title)}</h2><div class="devs ${c.devs.length > 3 ? 'compact' : ''}">${c.devs.map(d => `<div class=dev><div class=n>${esc(d.n)} — ${esc(d.p)}</div><div class=a>${esc(d.a)}</div><div class=x>${esc(d.x)}</div></div>`).join('')}</div>`
  if (c.kind === 'quote') return `<h2>${esc(c.title)}</h2><div class=q>${esc(c.quote)}</div>`
  if (c.kind === 'cta') return `<h2>${esc(c.title)}</h2><div class=cta>${c.lines.map((l, i) => `<div class="line${i === c.lines.length - 1 ? ' big' : ''}">${esc(l)}</div>`).join('')}</div>`
  return `<h2>${esc(c.title)}</h2>`
}

const html = c => `<!doctype html><html dir=rtl lang=ar><head><meta charset=utf-8><style>${css}</style></head><body>
<div class=bar></div><div class=brand>مضمونة · بورصة العقارات</div>
<div class=wrap>${body(c)}${c.source ? `<div class=src>${esc(c.source)}</div>` : ''}${c.foot ? `<div class=foot>${esc(c.foot)}</div>` : ''}</div></body></html>`

async function makeCards() {
  const hd = mk('html'), fr = mk('frames'), vo = mk('vo')
  for (const c of cards) fs.writeFileSync(hd + c.id + '.html', html(c), 'utf8')
  // نصوص الصوت لكل مقطع
  for (const g of segments) {
    const txt = cards.filter(c => c.seg === g).map(c => c.vo).join('\n')
    fs.writeFileSync(vo + g + '.txt', txt, 'utf8')
  }
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 20000 })
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  for (const c of cards) {
    await p.goto('file:///' + hd + c.id + '.html')
    await p.waitForTimeout(700)
    await p.screenshot({ path: fr + c.id + '.png' })
  }
  await ctx.close(); await b.close()
  console.log('cards', cards.length, 'vo segments', segments.map(g => g + ':' + fs.readFileSync(D + 'vo/' + g + '.txt', 'utf8').length).join(' '))
}

function makeVideo() {
  const fr = D + 'frames/', vo = D + 'vo/', seg = mk('seg')
  // مدة كل كارت = نصيبه من حروف مقطعه × طول صوت المقطع
  const segsOut = []
  for (const g of segments) {
    const mp3 = vo + g + '.mp3'
    if (!fs.existsSync(mp3)) throw new Error('ناقص صوت: ' + mp3)
    const total = dur(mp3)
    const list = cards.filter(c => c.seg === g)
    const w = list.map(c => c.vo.length); const sum = w.reduce((a, b) => a + b, 0)
    list.forEach((c, i) => segsOut.push({ id: c.id, len: Math.max(3, total * w[i] / sum) }))
  }
  segsOut[segsOut.length - 1].len += 1.2
  const files = []
  segsOut.forEach((s, i) => {
    const out = seg + String(i).padStart(2, '0') + '.mp4'
    const vf = `scale=1960:-2,crop=1920:1080:'(iw-1920)/2':'min(ih-1080,20*t/${s.len.toFixed(2)})',format=yuv420p`
    execFileSync(ff, ['-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-i', fr + s.id + '.png', '-t', s.len.toFixed(2), '-vf', vf, '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', out])
    files.push("file '" + out + "'")
  })
  fs.writeFileSync(seg + 'list.txt', files.join('\n'))
  execFileSync(ff, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', seg + 'list.txt', '-c', 'copy', D + 'video_only.mp4'])
  fs.writeFileSync(vo + 'list.txt', segments.map(g => "file '" + vo + g + ".mp3'").join('\n'))
  execFileSync(ff, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', vo + 'list.txt', '-c:a', 'libmp3lame', '-b:a', '160k', vo + 'full.mp3'])
  const out = OUT + 'madmona-realestate-report.mp4'
  execFileSync(ff, ['-y', '-v', 'error', '-i', D + 'video_only.mp4', '-i', vo + 'full.mp3', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', out])
  console.log('DONE', out, 'video', dur(D + 'video_only.mp4').toFixed(1), 'audio', dur(vo + 'full.mp3').toFixed(1))
}

const cmd = process.argv[2] || 'cards'
if (cmd === 'cards') makeCards().catch(e => { console.error(e); process.exit(1) })
else makeVideo()
