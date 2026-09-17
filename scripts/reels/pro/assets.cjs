// 🎨 أصول الريل الاحترافي كـPNG شفافة (موكاب الموبايل · الخلفيات · العناوين) — بتترسم بـHTML وبتتركّب بـffmpeg.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const A = path.join(__dirname, 'assets'); fs.mkdirSync(A, { recursive: true })
const FONT = 'file:///E:/madmona-app/scripts/reels/fonts/'
const css = `@font-face{font-family:T;src:url(${FONT}Tajawal-Black.ttf)}@font-face{font-family:TB;src:url(${FONT}Tajawal-Bold.ttf)}@font-face{font-family:TM;src:url(${FONT}Tajawal-Medium.ttf)}
*{margin:0;padding:0;box-sizing:border-box}html,body{background:transparent;direction:rtl}`

// شاشة الموبايل 660×1428 · الإطار 712×1480
const SW = 660, SH = 1428, BZ = 26
const jobs = [
  ['phone-frame', 712, 1480, `<div style="width:712px;height:1480px;border-radius:112px;position:relative;
     background:linear-gradient(145deg,#2b2f33,#0c0d0e 45%,#23272b);box-shadow:inset 0 0 0 3px #3a3f44,inset 0 0 0 9px #111">
     <div style="position:absolute;inset:${BZ}px;border-radius:88px;background:#000;-webkit-mask:linear-gradient(#000,#000);"></div>
     <div style="position:absolute;top:44px;left:50%;transform:translateX(-50%);width:190px;height:52px;border-radius:30px;background:#000"></div></div>`],
  ['screen-mask', SW, SH, `<div style="width:${SW}px;height:${SH}px;border-radius:88px;background:#fff"></div>`],
  ['bg-dark', 1080, 1920, `<div style="width:1080px;height:1920px;background:
     radial-gradient(900px 700px at 80% 20%,rgba(46,211,155,.28),transparent 60%),
     radial-gradient(800px 800px at 10% 90%,rgba(231,185,75,.18),transparent 60%),
     linear-gradient(160deg,#063f32,#021f18)"></div>`],
  ['bg-light', 1080, 1920, `<div style="width:1080px;height:1920px;background:
     radial-gradient(700px 600px at 85% 10%,rgba(46,211,155,.22),transparent 60%),#FAFAF7"></div>`],
]
const head = (t, em, color = '#fff', emc = '#2ED39B') => `<div style="width:1000px;padding:10px 20px;text-align:center;font-family:T;font-size:84px;line-height:1.12;color:${color};text-shadow:0 6px 30px rgba(0,0,0,.25)">${t}${em ? `<br><span style="color:${emc}">${em}</span>` : ''}</div>`
const hookLine = (t, bg, c) => `<div style="display:inline-block;font-family:T;font-size:118px;line-height:1.05;padding:18px 44px 30px;border-radius:28px;background:${bg};color:${c}">${t}</div>`

const texts = [
  ['h1a', hookLine('عندك عيادة؟', '#04352A', '#fff')],
  ['h1b', hookLine('مواعيد متداخلة؟', '#fff', '#04352A')],
  ['h1c', hookLine('ملفات في الدرج؟', '#E7B94B', '#04352A')],
  ['t2', head('لوحة عيادتك', 'في دقيقة')],
  ['t3', head('كل عيادتك', 'في شاشة واحدة')],
  ['t4', head('وصفحة حجز', 'باسم عيادتك', '#fff', '#E7B94B')],
  ['chip2', `<div style="font-family:TB;font-size:40px;color:#04352A;background:#2ED39B;padding:14px 34px;border-radius:999px">٤ خانات بس</div>`],
  ['chip3', `<div style="font-family:TB;font-size:40px;color:#04352A;background:#fff;padding:14px 34px;border-radius:999px">مواعيد · ملفات · مخزون</div>`],
  ['chip4', `<div style="font-family:TB;font-size:40px;color:#04352A;background:#E7B94B;padding:14px 34px;border-radius:999px">المريض بيحجز لوحده</div>`],
  ['cta', `<div style="width:1080px;height:1920px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:46px;text-align:center">
     <img src="file:///E:/madmona-app/public/madmona-logo.png" style="width:330px;height:330px;border-radius:70px;box-shadow:0 30px 80px rgba(0,0,0,.35)">
     <div style="font-family:T;font-size:96px;color:#fff;line-height:1.1">جرّبها ببلاش</div>
     <div style="font-family:TB;font-size:50px;color:#2ED39B">مجاني لصاحب البيزنس + موظف</div>
     <div style="font-family:T;font-size:58px;color:#04352A;background:#E7B94B;padding:22px 54px;border-radius:999px;direction:ltr">madmonacairo.com/start</div></div>`],
]

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  const shot = async (name, html, w, h) => {
    await p.setViewportSize({ width: w || 1080, height: h || 1920 })
    const f = path.join(A, '_tmp.html')
    fs.writeFileSync(f, `<!doctype html><meta charset=utf-8><style>${css}</style><div id=r style="display:inline-block">${html}</div>`)
    await p.goto('file:///' + f.split(path.sep).join('/'))
    await p.evaluate(() => document.fonts.ready)
    await p.waitForTimeout(400)
    await p.locator('#r').screenshot({ path: path.join(A, name + '.png'), omitBackground: true })
  }
  for (const [n, w, h, html] of jobs) await shot(n, html, w, h)
  for (const [n, html] of texts) await shot(n, html)
  console.log('assets ok', fs.readdirSync(A).length)
  await b.close()
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
