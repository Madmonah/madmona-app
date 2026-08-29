// record-site-reel.js — يسجّل ريل ٩:١٦ من صفحة إعلان حقيقية على madmonacairo.com
//
// ليه اتعمل (٢٩/٨/٢٠٢٦): محمد: «عايزين نخليها من صفحة عالنت».
// التصميم المرسوم مهما اتظبط بيفضل موك-أب. ده بيفتح الإعلان الحقيقي
// بصوره ومقاسه وسعره واسم المعرض، وبيحط رسالة الحملة فوقه — فاللي
// المشاهد بيشوفه هو الموقع نفسه مش رسمة.
//
// الرسالة (قاعدة مقفولة): مضمونة **في النص مش طرف**.
// ممنوع أي نص هنا يقول «من مضمونة» أو «اشتري من مضمونة».
//
// اللوجو بيتحمّل من /madmona-logo.png بتاع الموقع نفسه — نفس الأصل،
// فمفيش مشكلة CORS ومفيش نسخة قديمة متلزقة في السكريبت.
//
// التشغيل:
//   powershell -File launch-chrome-debug.ps1
//   node record-site-reel.js "<slug>" [ثواني] [--audio "مسار الصوت"]
//
// مثال:
//   node record-site-reel.js "دولاب-جرار-Techwood-موديل-WOD-01-klr46" 24 --audio music.mp3
//
// ⚠️ الصوت: Page.captureScreenshot بيجيب صور بس — مفيش أوديو خالص.
//    فالصوت بيتركّب في ffmpeg من ملف إنت بتديهوله. من غير --audio
//    الفيديو بيطلع صامت.

const { chromium } = require('playwright')
const ffmpegPath = require('ffmpeg-static')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const SITE = process.env.SITE || 'https://madmonacairo.com'
const OUTPUT_DIR = path.join(__dirname, 'output')
const FRAMES_DIR = path.join(__dirname, 'frames-site')
const CDP_URL = process.env.CDP_URL || 'http://localhost:9222'
const FPS = 25

// ---------------------------------------------------------------- overlay
// بيتحقن جوّه الصفحة الحقيقية. بيعرّض window.__replay عشان التسجيل
// يبدأ من الثانية صفر بالظبط.
function overlay(logoUrl) {
  const css = `
  #mdm{position:fixed;inset:0;z-index:2147483647;pointer-events:none;
       font-family:"Cairo",system-ui,sans-serif;direction:rtl;color:#0A0A0A}
  #mdm *{box-sizing:border-box;margin:0}
  #mdm .scrim{position:absolute;inset:0;background:#FAFAF7;opacity:0}
  #mdm .ly{position:absolute;inset:0;display:flex;flex-direction:column;
           justify-content:center;gap:3.5vh;padding:9vh 7vw;opacity:0}
  #mdm .bar{position:absolute;top:0;right:0;height:5px;background:#2FA084;width:0;opacity:.85}

  #mdm .l1{justify-content:flex-end;padding-bottom:12vh}
  #mdm .bub{max-width:80%;padding:2vh 3.4vw;border-radius:3.4vw;font-size:3.1vh;
            font-weight:600;line-height:1.55;opacity:0;
            box-shadow:0 .6vh 2.4vh rgba(10,10,10,.18)}
  #mdm .them{align-self:flex-start;background:#fff;border:1px solid #DFE3E0}
  #mdm .me{align-self:flex-end;background:#1F6F5F;color:#EFF7F4}
  #mdm .ask{align-self:flex-end;margin-top:1.4vh;font-size:5.6vh;font-weight:900;
            color:#1F6F5F;letter-spacing:-.02em;opacity:0;
            text-shadow:0 .4vh 1.6vh rgba(250,250,247,.9)}

  #mdm .head{font-size:4.2vh;font-weight:900;line-height:1.4;letter-spacing:-.02em}
  #mdm .head em{font-style:normal;color:#1F6F5F}
  #mdm .sub{font-size:2.7vh;font-weight:600;color:#5B6360}

  #mdm .parties{display:flex;align-items:center;justify-content:space-between;gap:1.5vw}
  #mdm .party{flex:1;background:#fff;border:1px solid #DFE3E0;border-radius:2.6vw;
              padding:3vh 1vw;text-align:center;font-size:2.6vh;font-weight:700;color:#5B6360}
  #mdm .party span{display:block;font-size:5vh;margin-bottom:.7vh}
  #mdm .gapx{flex:0 0 22%;display:grid;place-items:center;font-size:2.9vh;
             font-weight:800;color:#B4552F}
  #mdm .gapx i{display:block;width:100%;border-top:5px dashed #D8C2B7;margin-bottom:1vh}
  #mdm .mid{flex:0 0 30%;display:flex;flex-direction:column;align-items:center;gap:1vh;opacity:0}
  #mdm .mid i{display:block;width:100%;border-top:5px solid #6FCF97}
  #mdm .mark{width:11vh;height:11vh;border-radius:50%;background:#fff;
             border:3px solid #1F6F5F;display:grid;place-items:center;overflow:hidden;
             box-shadow:0 1vh 2.6vh rgba(31,111,95,.26)}
  #mdm .mark img{width:8.6vh;height:8.6vh;object-fit:contain}
  #mdm .mid b{font-size:2.5vh;font-weight:800;color:#1F6F5F}

  #mdm .rows{display:flex;flex-direction:column;gap:1.8vh}
  #mdm .row{display:flex;align-items:center;gap:2.4vw;background:#fff;
            border:1px solid #DFE3E0;border-radius:2vw;padding:2.2vh 3vw;
            font-size:2.7vh;font-weight:700;line-height:1.5;opacity:0}
  #mdm .row .tk{width:4.4vh;height:4.4vh;flex:none;border-radius:50%;
                background:rgba(47,160,132,.14);display:grid;place-items:center;
                color:#2FA084;font-size:2.4vh;font-weight:900}
  #mdm .cap{font-size:3.1vh;font-weight:900;color:#1F6F5F;letter-spacing:-.02em}

  #mdm .l5{background:#1F6F5F;align-items:center;text-align:center;justify-content:center;gap:3.5vh}
  #mdm .endmark{width:20vh;height:20vh;border-radius:50%;background:#FAFAF7;
                display:grid;place-items:center;overflow:hidden;opacity:0}
  #mdm .endmark img{width:17vh;height:17vh;object-fit:contain}
  #mdm .endline{font-size:6.4vh;font-weight:900;color:#FAFAF7;line-height:1.3;letter-spacing:-.03em}
  #mdm .endsub{font-size:2.8vh;font-weight:600;color:#BFE0D6}

  @keyframes mdmFade{0%{opacity:0}8%{opacity:1}92%{opacity:1}100%{opacity:0}}
  @keyframes mdmScrim{0%{opacity:0}12%{opacity:.97}100%{opacity:.97}}
  @keyframes mdmPop{from{opacity:0;transform:translateY(1.4vh) scale(.97)}to{opacity:1;transform:none}}
  @keyframes mdmDrop{from{opacity:0;transform:translateY(-4vh) scale(.8)}to{opacity:1;transform:none}}
  @keyframes mdmSlide{from{opacity:0;transform:translateX(2vw)}to{opacity:1;transform:none}}
  @keyframes mdmGrow{to{width:100%}}

  /* ---- التوقيت · إجمالي ٢٤ ثانية ---- */
  .go #mdm .bar   {animation:mdmGrow 24s linear both}
  .go #mdm .scrim {animation:mdmScrim 4s both;animation-delay:6.5s}
  .go #mdm .l1{animation:mdmFade 6.6s both}
  .go #mdm .l2{animation:mdmFade 4.2s both;animation-delay:6.6s}
  .go #mdm .l3{animation:mdmFade 5.0s both;animation-delay:10.8s}
  .go #mdm .l4{animation:mdmFade 4.7s both;animation-delay:15.8s}
  .go #mdm .l5{animation:mdmFade 3.5s both;animation-delay:20.5s}

  .go #mdm .l1 .bub:nth-of-type(1){animation:mdmPop .45s both;animation-delay:.4s}
  .go #mdm .l1 .bub:nth-of-type(2){animation:mdmPop .45s both;animation-delay:2.0s}
  .go #mdm .l1 .bub:nth-of-type(3){animation:mdmPop .45s both;animation-delay:3.2s}
  .go #mdm .l1 .ask{animation:mdmPop .5s both;animation-delay:4.6s}
  .go #mdm .l3 .mid{animation:mdmDrop .6s both;animation-delay:11.4s}
  .go #mdm .l4 .row:nth-child(2){animation:mdmSlide .5s both;animation-delay:16.1s}
  .go #mdm .l4 .row:nth-child(3){animation:mdmSlide .5s both;animation-delay:16.45s}
  .go #mdm .l4 .row:nth-child(4){animation:mdmSlide .5s both;animation-delay:16.8s}
  .go #mdm .l5 .endmark{animation:mdmDrop .55s both;animation-delay:20.7s}
  `

  const html = `
  <div class="bar"></div>
  <div class="scrim"></div>

  <div class="ly l1">
    <div class="bub them">شوفت الدولاب ده؟</div>
    <div class="bub me">من فين؟</div>
    <div class="bub them">معرض مش عارفه</div>
    <div class="ask">هي مضمونة؟</div>
  </div>

  <div class="ly l2">
    <p class="head">من غير حد <em>في النص</em></p>
    <div class="parties">
      <div class="party"><span>🏬</span>المعرض</div>
      <div class="gapx"><i></i>مفيش</div>
      <div class="party"><span>🙋</span>إنت</div>
    </div>
    <p class="sub">تدفع عربون الأول… وتتوكل على الله.</p>
  </div>

  <div class="ly l3">
    <p class="head">إحنا <em>مابنبعش</em>.</p>
    <div class="parties">
      <div class="party"><span>🏬</span>المعرض</div>
      <div class="mid"><i></i><span class="mark"><img src="${logoUrl}" alt="مضمونة"></span><b>مضمونة</b></div>
      <div class="party"><span>🙋</span>إنت</div>
    </div>
    <p class="head">إحنا بنقف <em>في النص</em>.</p>
  </div>

  <div class="ly l4">
    <p class="cap">يعني إيه في النص؟</p>
    <div class="rows">
      <div class="row"><span class="tk">✓</span>التواصل بيفتح في شات مضمونة — الطرفين وإحنا</div>
      <div class="row"><span class="tk">✓</span>رقمك مايظهرش لحد ما تتفقوا</div>
      <div class="row"><span class="tk">✓</span>مابناخدش حاجة غير لما البيعة تتم — فمصلحتنا تتم صح</div>
    </div>
  </div>

  <div class="ly l5">
    <span class="endmark"><img src="${logoUrl}" alt="مضمونة"></span>
    <div class="endline">مضمونة<br>في النص</div>
    <p class="endsub">مش بايع ولا مشتري — ضامن.</p>
  </div>
  `

  document.getElementById('mdm')?.remove()
  document.getElementById('mdm-css')?.remove()

  const st = document.createElement('style')
  st.id = 'mdm-css'
  st.textContent = css
  document.head.appendChild(st)

  const el = document.createElement('div')
  el.id = 'mdm'
  el.innerHTML = html
  document.body.appendChild(el)

  // تمرير الصفحة الحقيقية تحت الأوفرلاي — عشان الصور والتفاصيل تعدّي
  let raf = null
  function drive() {
    const t0 = performance.now()
    const from = 0, to = 1250, startAt = 600, endAt = 6200
    cancelAnimationFrame(raf)
    window.scrollTo(0, 0)
    ;(function step(now) {
      const t = (now || performance.now()) - t0
      if (t < endAt) {
        const p = Math.min(1, Math.max(0, (t - startAt) / (endAt - startAt)))
        const eased = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        window.scrollTo(0, from + (to - from) * eased)
        raf = requestAnimationFrame(step)
      }
    })()
  }

  window.__replay = function () {
    document.documentElement.classList.remove('go')
    void document.body.offsetWidth
    document.documentElement.classList.add('go')
    drive()
  }
  window.__replay()
  return true
}

// ---------------------------------------------------------------- main
async function main() {
  const args = process.argv.slice(2)
  const audioIdx = args.indexOf('--audio')
  const audioFile = audioIdx > -1 ? args[audioIdx + 1] : null
  const positional = args.filter((a, i) => i !== audioIdx && i !== audioIdx + 1)

  const slug = positional[0]
  const durationSec = Number(positional[1] || 24)

  if (!slug) {
    console.error('الاستخدام: node record-site-reel.js "<slug>" [ثواني] [--audio ملف]')
    process.exit(1)
  }
  if (audioFile && !fs.existsSync(audioFile)) {
    console.error(`ملف الصوت مش موجود: ${audioFile}`)
    process.exit(1)
  }

  const url = /^https?:/.test(slug) ? slug : `${SITE}/marketplace/${encodeURIComponent(slug)}`
  const logoUrl = `${SITE}/madmona-logo.png`
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true })
  fs.mkdirSync(FRAMES_DIR, { recursive: true })

  console.log(`[site] connecting to ${CDP_URL}…`)
  const browser = await chromium.connectOverCDP(CDP_URL)
  const ctx = browser.contexts()[0]
  const page = await ctx.newPage()
  await page.bringToFront()
  await page.setViewportSize({ width: 1080, height: 1920 }).catch(() => {})

  console.log(`[site] opening ${url}`)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

  const title = await page.title()
  if (/مش موجود|not found|404/i.test(title)) {
    console.error(`[site] ❌ الصفحة رجّعت ٤٠٤ — اتأكد من الـslug.\n    ${url}`)
    await page.close(); await browser.close(); process.exit(1)
  }
  console.log(`[site] ✓ ${title}`)

  // الخط والصور لازم يتحمّلوا قبل التسجيل
  await page.addStyleTag({
    url: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap',
  }).catch(() => console.log('[site] ⚠️ Cairo مااتحملش — هيقع على خط النظام'))
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  await page.waitForTimeout(2500)

  await page.evaluate(overlay, logoUrl)
  await page.screenshot({ path: path.join(FRAMES_DIR, '_precheck.png') })
  console.log(`[site] overlay injected · precheck: ${path.join(FRAMES_DIR, '_precheck.png')}`)

  const client = await ctx.newCDPSession(page)
  const totalFrames = Math.round(durationSec * FPS)
  const intervalMs = 1000 / FPS

  await page.evaluate(() => window.__replay && window.__replay())
  console.log(`[site] capturing ${totalFrames} frames @ ${FPS} fps…`)

  const t0 = Date.now()
  for (let i = 0; i < totalFrames; i++) {
    const target = t0 + i * intervalMs
    const wait = target - Date.now()
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    try {
      const { data } = await client.send('Page.captureScreenshot', {
        format: 'jpeg', quality: 90, captureBeyondViewport: false,
      })
      fs.writeFileSync(path.join(FRAMES_DIR, `f${String(i).padStart(6, '0')}.jpg`), Buffer.from(data, 'base64'))
      if (i % 25 === 0) process.stdout.write('.')
    } catch (e) {
      console.log(`\n[site] frame ${i} failed: ${e.message}`)
    }
  }
  console.log(`\n[site] captured in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  const outMp4 = path.join(OUTPUT_DIR, `site-reel-${stamp}.mp4`)
  const vf = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p'

  const ff = ['-y', '-framerate', String(FPS), '-i', path.join(FRAMES_DIR, 'f%06d.jpg')]
  if (audioFile) ff.push('-i', audioFile)
  ff.push('-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20')
  if (audioFile) {
    // فيد-أوت آخر ثانيتين عشان الصوت مايتقطعش فجأة
    const fadeStart = Math.max(0, durationSec - 2)
    ff.push('-af', `afade=t=out:st=${fadeStart}:d=2`, '-c:a', 'aac', '-b:a', '192k', '-shortest')
  }
  ff.push('-movflags', '+faststart', outMp4)

  console.log(`[site] ffmpeg → ${outMp4}${audioFile ? `  (+ صوت: ${path.basename(audioFile)})` : '  (صامت)'}`)
  await new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ff, { stdio: 'inherit' })
    p.on('exit', c => (c === 0 ? resolve() : reject(new Error(`ffmpeg exit ${c}`))))
  })

  console.log(`[site] ✓ ${outMp4}`)
  if (!audioFile) console.log('[site] ⚠️ من غير صوت — زوّد --audio "ملف.mp3"')
  await page.close()
  await browser.close()
}

main().catch(e => { console.error('[site] ERROR:', e.message); process.exit(1) })
