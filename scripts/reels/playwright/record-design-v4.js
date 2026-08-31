// v4 — use Page.captureScreenshot in a fixed-interval loop instead of screencast.
// Works whether the tab is foreground or background.
const { chromium } = require('playwright')
const ffmpegPath = require('ffmpeg-static')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const PROJECT_ID = '004b32d9-d907-4765-a1cd-d514533dddcd'
const OUTPUT_DIR = path.join(__dirname, 'output')
const FRAMES_DIR = path.join(__dirname, 'frames-tmp')
const CDP_URL    = process.env.CDP_URL || 'http://localhost:9222'
const FPS        = 25  // 25 fps is plenty and reduces load

async function main() {
  const fileName = process.argv[2] || 'شورت ١ - سؤال وجواب.dc.html'
  const durationSec = Number(process.argv[3] || 20)
  const slug = fileName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true })
  fs.mkdirSync(FRAMES_DIR, { recursive: true })

  console.log(`[v4] connecting to ${CDP_URL}…`)
  const browser = await chromium.connectOverCDP(CDP_URL)
  const ctx = browser.contexts()[0]

  const url = `https://claude.ai/design/p/${PROJECT_ID}?file=${encodeURIComponent(fileName)}&present=1`
  console.log(`[v4] opening ${url}`)
  const page = await ctx.newPage()
  await page.bringToFront()
  await page.setViewportSize({ width: 1080, height: 1920 }).catch(() => {})
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

  // Wait for design iframe to render inside content
  console.log('[v4] waiting up to 60s for design content…')
  await page.waitForFunction(
    () => {
      const f = document.querySelector('iframe[src*="claudeusercontent"]')
      if (!f) return false
      const r = f.getBoundingClientRect()
      return r.width > 500 && r.height > 500
    },
    { timeout: 60000 }
  ).catch(() => console.log('[v4] iframe wait timed out — proceeding anyway'))

  // Extra pause for iframe internals to settle
  await page.waitForTimeout(3000)

  // Snapshot 0 = pre-record sanity check
  await page.screenshot({ path: path.join(FRAMES_DIR, '_precheck.png') })
  console.log(`[v4] pre-record snapshot saved`)

  // CAPTURE LOOP — Page.captureScreenshot on CDP
  const client = await ctx.newCDPSession(page)
  const totalFrames = durationSec * FPS
  const intervalMs = 1000 / FPS
  console.log(`[v4] capturing ${totalFrames} frames @ ${FPS} fps for ${durationSec}s…`)

  const t0 = Date.now()
  for (let i = 0; i < totalFrames; i++) {
    const target = t0 + i * intervalMs
    const wait = target - Date.now()
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    try {
      const { data } = await client.send('Page.captureScreenshot', {
        format: 'jpeg', quality: 85, captureBeyondViewport: false,
      })
      fs.writeFileSync(path.join(FRAMES_DIR, `f${String(i).padStart(6,'0')}.jpg`), Buffer.from(data, 'base64'))
      if (i % 25 === 0) process.stdout.write(`.`)
    } catch (e) {
      console.log(`\n[v4] frame ${i} failed: ${e.message}`)
    }
  }
  console.log(`\n[v4] captured ${totalFrames} frames in ${((Date.now()-t0)/1000).toFixed(1)}s`)

  // ffmpeg — sequence → MP4
  const outMp4 = path.join(OUTPUT_DIR, `${slug}-${stamp}.mp4`)
  console.log(`[v4] ffmpeg → ${outMp4}`)
  await new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, [
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(FRAMES_DIR, 'f%06d.jpg'),
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-movflags', '+faststart',
      outMp4,
    ], { stdio: 'inherit' })
    p.on('exit', c => c === 0 ? resolve() : reject(new Error(`ffmpeg exit ${c}`)))
  })

  console.log(`[v4] ✓ ${outMp4}`)
  console.log(`[v4] pre-record snapshot: ${path.join(FRAMES_DIR, '_precheck.png')}`)
  await page.close()
  await browser.close()
}
main().catch(e => { console.error('[v4] ERROR:', e.message); process.exit(1) })
