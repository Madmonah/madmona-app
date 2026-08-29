// record-url.js — يسجّل أي صفحة ٩:١٦ من لينك مباشر إلى MP4 جاهز للنشر.
//
// ليه اتعمل (٢٩/٨/٢٠٢٦): record-design-v4.js مربوط بمشروع Claude Design
// (بيبني اللينك من PROJECT_ID + اسم ملف .dc.html). ريلز الحملة اتعملت
// كصفحات HTML مستقلة، فمحتاجين نسجّل من لينك أيًا كان مصدره.
//
// الفرق الجوهري عن v4: بينادي window.__replay() في آخر لحظة قبل أول فريم،
// فالأنيميشن بيبدأ من الثانية صفر مظبوط بدل ما يكون عدّى منه جزء وإحنا
// مستنيين الصفحة تحمّل — ده كان بيقطع أول مشهد.
//
// التشغيل:
//   powershell -File launch-chrome-debug.ps1        (مرة واحدة)
//   node record-url.js "<URL>" 24
//
// الناتج: output/<slug>-<timestamp>.mp4  (1080×1920, H.264)

const { chromium } = require('playwright')
const ffmpegPath = require('ffmpeg-static')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const OUTPUT_DIR = path.join(__dirname, 'output')
const FRAMES_DIR = path.join(__dirname, 'frames-url')
const CDP_URL = process.env.CDP_URL || 'http://localhost:9222'
const FPS = 25

async function main() {
  const args = process.argv.slice(2)
  const audioIdx = args.indexOf('--audio')
  const audioFile = audioIdx > -1 ? args[audioIdx + 1] : null
  const positional = audioIdx > -1
    ? args.filter((a, i) => i !== audioIdx && i !== audioIdx + 1)
    : args
  const url = positional[0]
  const durationSec = Number(positional[1] || 24)

  if (audioFile && !fs.existsSync(audioFile)) {
    console.error(`ملف الصوت مش موجود: ${audioFile}`)
    process.exit(1)
  }

  if (!url) {
    console.error('الاستخدام: node record-url.js "<URL>" [ثواني] [--audio ملف]')
    process.exit(1)
  }

  const slug = (url.split('/').filter(Boolean).pop() || 'reel')
    .replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 40)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true })
  fs.mkdirSync(FRAMES_DIR, { recursive: true })

  console.log(`[url] connecting to ${CDP_URL}…`)
  const browser = await chromium.connectOverCDP(CDP_URL)
  const ctx = browser.contexts()[0]

  const page = await ctx.newPage()
  await page.bringToFront()
  await page.setViewportSize({ width: 1080, height: 1920 }).catch(() => {})

  console.log(`[url] opening ${url}`)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

  // الخطوط لازم تتحمّل قبل التسجيل — غير كده أول ثانيتين بيتسجلوا بخط بديل
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  await page.waitForTimeout(1500)

  await page.screenshot({ path: path.join(FRAMES_DIR, '_precheck.png') })
  console.log('[url] pre-record snapshot saved')

  const client = await ctx.newCDPSession(page)
  const totalFrames = Math.round(durationSec * FPS)
  const intervalMs = 1000 / FPS

  // إعادة تشغيل الأنيميشن من أوله — الصفحة بتعرّض window.__replay
  const replayed = await page.evaluate(() => {
    if (typeof window.__replay === 'function') { window.__replay(); return true }
    return false
  }).catch(() => false)
  console.log(replayed
    ? '[url] __replay() اتنادت — الأنيميشن من الثانية صفر'
    : '[url] ⚠️ الصفحة مافيهاش __replay()')

  // 🔑 الخطو بالفريم (٢٩/٨/٢٠٢٦):
  // captureScreenshot بياخد أكتر من 40ms للفريم، فلو سيبنا الأنيميشن
  // ماشي بالساعة الحقيقية بيخلص وإحنا لسه بنصوّر — الفيديو بيطلع
  // مستعجل وآخره فريمات فاضية. الحل: نوقّف كل الأنيميشنز ونحرّكها
  // إحنا لكل فريم، فالنتيجة مظبوطة مهما كان التصوير بطيء.
  await page.evaluate(() => {
    window.__seek = function (ms) {
      document.getAnimations().forEach(function (a) {
        try { a.pause(); a.currentTime = ms } catch (e) {}
      })
    }
  })
  console.log('[url] وضع الخطو بالفريم شغّال — التوقيت مش معتمد على سرعة التصوير')

  console.log(`[url] capturing ${totalFrames} frames @ ${FPS} fps for ${durationSec}s…`)
  const t0 = Date.now()
  for (let i = 0; i < totalFrames; i++) {
    try {
      await page.evaluate(ms => window.__seek && window.__seek(ms), i * intervalMs)
      // تايم-أوت لكل فريم: captureScreenshot بيعلّق للأبد لو نافذة كروم
      // اتغطّت أو اتصغّرت (الرندرر بيبطّل يرسم) — من غير السباق ده
      // التسجيل بيقف ساكت في نص الطريق. (٢٩/٨/٢٠٢٦)
      const { data } = await Promise.race([
        client.send('Page.captureScreenshot', {
          format: 'jpeg', quality: 90, captureBeyondViewport: false,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('capture timeout')), 4000)),
      ])
      fs.writeFileSync(path.join(FRAMES_DIR, `f${String(i).padStart(6, '0')}.jpg`), Buffer.from(data, 'base64'))
      if (i % 25 === 0) process.stdout.write('.')
    } catch (e) {
      console.log(`\n[url] frame ${i} failed: ${e.message}`)
    }
  }
  console.log(`\n[url] captured ${totalFrames} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  const outMp4 = path.join(OUTPUT_DIR, `${slug}-${stamp}.mp4`)
  console.log(`[url] ffmpeg → ${outMp4}`)
  const vf = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p'
  const ff = ['-y', '-framerate', String(FPS), '-i', path.join(FRAMES_DIR, 'f%06d.jpg')]
  if (audioFile) ff.push('-i', audioFile)
  ff.push('-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20')
  if (audioFile) {
    const fadeStart = Math.max(0, durationSec - 2)
    ff.push('-af', `afade=t=out:st=${fadeStart}:d=2`, '-c:a', 'aac', '-b:a', '192k', '-shortest')
  }
  ff.push('-movflags', '+faststart', outMp4)

  await new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ff, { stdio: 'inherit' })
    p.on('exit', c => (c === 0 ? resolve() : reject(new Error(`ffmpeg exit ${c}`))))
  })

  console.log(`[url] ✓ ${outMp4}`)
  await page.close()
  await browser.close()
}

main().catch(e => { console.error('[url] ERROR:', e.message); process.exit(1) })
