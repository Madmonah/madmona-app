// 🖼️ كارت معاينة اللينك (Open Graph 1200×630) — محمد ١٦/٩: «عايزين نغيّر الكلام والصورة اللي بتظهر
// لما بنبعت لينك مضمونة… اللوجو يكون ظاهر أفضل وممكن علامات لشرح اللوجو».
// بيكتب public/og-image-v3.png. التشغيل: node scripts/og-card.cjs
const { chromium } = require('playwright')
const path = require('path')
const ROOT = 'E:/madmona-app'
const LOGO = 'file:///' + ROOT + '/public/madmona-logo.png'

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:Cairo,sans-serif;overflow:hidden;
 background:radial-gradient(120% 140% at 85% 10%, #0B5B45 0%, #04352A 55%, #022A21 100%);color:#FAFAF7}
.wrap{position:relative;width:1200px;height:630px;display:flex;align-items:center;padding:0 64px;gap:48px}
.ring{position:absolute;border:2px solid rgba(255,255,255,.07);border-radius:50%}
.r1{width:520px;height:520px;top:-140px;left:-120px}
.r2{width:760px;height:760px;bottom:-320px;left:-260px}
.logoBox{position:relative;flex:0 0 372px;height:372px;border-radius:38px;background:#FAFAF7;
 display:flex;align-items:center;justify-content:center;box-shadow:0 26px 60px rgba(0,0,0,.34)}
.logoBox img{width:300px;height:300px;object-fit:contain}
/* علامات الشرح */
.tag{position:absolute;display:flex;align-items:center;gap:10px;font-size:22px;font-weight:700;white-space:nowrap}
.dot{width:14px;height:14px;border-radius:50%;background:#B8873B;box-shadow:0 0 0 5px rgba(184,135,59,.22)}
.line{height:2px;background:linear-gradient(90deg,#B8873B,rgba(184,135,59,.15))}
.t1{top:36px;right:-232px}
.t1 .line{width:120px}
.t2{top:168px;right:-268px}
.t2 .line{width:150px}
.t3{bottom:34px;right:-214px}
.t3 .line{width:104px}
.txt{flex:1;display:flex;flex-direction:column;gap:18px;padding-inline-end:190px}
h1{font-size:74px;font-weight:900;line-height:1.18;letter-spacing:-1px}
h1 b{color:#8FE3C0}
p{font-size:34px;font-weight:700;color:#CFE6DB;line-height:1.45}
.pills{display:flex;gap:14px;margin-top:6px}
.pill{background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.16);border-radius:999px;
 padding:12px 24px;font-size:26px;font-weight:700}
.foot{position:absolute;bottom:34px;right:64px;left:64px;display:flex;justify-content:space-between;
 align-items:center;font-size:26px;font-weight:700;color:#9FC3B4}
.dom{color:#FAFAF7}
</style></head><body>
<div class="wrap">
  <div class="ring r1"></div><div class="ring r2"></div>
  <div class="logoBox">
    <img src="${LOGO}">
    <div class="tag t1"><span class="dot"></span><span class="line"></span><span>إيد بتقول: تمام ✋</span></div>
    <div class="tag t2"><span class="dot"></span><span class="line"></span><span>علامة ✓ = الصفقة مضمونة</span></div>
    <div class="tag t3"><span class="dot"></span><span class="line"></span><span>اسمنا: مضمونة · MADMONA</span></div>
  </div>
  <div class="txt">
    <h1>إحنا في النص<br><b>بنضمن الصفقة</b></h1>
    <p>سوق · إدارة بيزنس · دليفري — كله في مكان واحد</p>
    <div class="pills"><span class="pill">بيع</span><span class="pill">إيجار</span><span class="pill">خدمات</span><span class="pill">مطاعم</span></div>
  </div>
  <div class="foot"><span>سجّل بيزنسك مجانًا</span><span class="dom">madmonacairo.com</span></div>
</div>
</body></html>`

;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await p.setContent(html, { waitUntil: 'load' })
  await p.waitForTimeout(2500)
  const out = path.join(ROOT, 'public', 'og-image-v3.png')
  await p.screenshot({ path: out })
  console.log('ok ->', out)
  await b.close()
})().catch(e => { console.log('ERR', e.message); process.exit(1) })
