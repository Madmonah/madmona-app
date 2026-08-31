// scripts/reels/playwright/record-design-v3.js
// APPROACH: connect to a Chrome the user launched with --remote-debugging-port=9222
// This bypasses Playwright's spawn issues (both spawn UNKNOWN + CDP-pipe timeout)
// because we don't spawn Chrome at all — user does.
//
// Usage:
//   1) In PowerShell run: .\launch-chrome-debug.ps1
//      (opens Chrome on port 9222 with a fresh profile — first run login claude.ai once)
//   2) Then in another PowerShell: node record-design-v3.js "شورت ١ - سؤال وجواب.dc.html" [duration]
//
// Recording: uses CDP Page.startScreencast (JPEG frames @ 30fps) → stitches with ffmpeg
const { chromium } = require('playwright')
const ffmpegPath = require('ffmpeg-static')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const PROJECT_ID = '004b32d9-d907-4765-a1cd-d514533dddcd'
const OUTPUT_DIR = path.join(__dirname, 'output')
const FRAMES_DIR = path.join(__dirname, 'frames-tmp')
const CDP_URL    = process.env.CDP_URL || 'http://localhost:9222'
const FPS        = 30

async function main() {
  const fileName = process.argv[2] || 'شورت ١ - سؤال وجواب.dc.html'
  const durationSec = Number(process.argv[3] || 25)
  const slug = fileName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true })
  fs.mkdirSync(FRAMES_DIR, { recursive: true })

  console.log(`[rec] connecting to ${CDP_URL}…`)
  const browser = await chromium.connectOverCDP(CDP_URL)
  const ctx = browser.contexts()[0] || (await browser.newContext())

  const url = `https://claude.ai/design/p/${PROJECT_ID}?file=${encodeURIComponent(fileName)}&present=1`
  console.log(`[rec] opening ${url}`)

  // Open in a new tab, sized 1080x1920
  const page = await ctx.newPage()
  await page.setViewportSize({ width: 1080, height: 1920 }).catch(() => {})
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

  // Wait for the design iframe to be present (Cloudflare + login may add delay)
  console.log('[rec] waiting for design iframe (up to 90s)…')
  await page.waitForFunction(
    () => {
      const f = document.querySelector('iframe[src*="claudeusercontent"]')
      return f && f.getBoundingClientRect().width > 400
    },
    { timeout: 90000 }
  ).catch(() => console.log('[rec] iframe not detected in 90s — recording anyway'))

  // Fullscreen the iframe if possible by pressing Present button or F
  // (Claude Design's ?present=1 usually auto-presents)
  await page.waitForTimeout(1500)

  // Start CDP screencast
  const client = await ctx.newCDPSession(page)
  let frameCount = 0
  const framePromises = []
  client.on('Page.screencastFrame', ({ data, sessionId }) => {
    const n = frameCount++
    framePromises.push(fs.promises.writeFile(path.join(FRAMES_DIR, `f${String(n).padStart(6, '0')}.jpg`), Buffer.from(data, 'base64')))
    client.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })

  console.log(`[rec] recording ${durationSec}s @ ${FPS} fps…`)
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1, maxWidth: 1080, maxHeight: 1920 })
  await page.waitForTimeout(durationSec * 1000)
  await client.send('Page.stopScreencast')
  await Promise.all(framePromises)
  console.log(`[rec] captured ${frameCount} frames`)

  // ffmpeg: jpeg sequence → MP4 (1080x1920, H.264, yuv420p)
  const outMp4 = path.join(OUTPUT_DIR, `${slug}-${stamp}.mp4`)
  console.log(`[rec] ffmpeg → ${outMp4}`)
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

  console.log(`[rec] ✓ ${outMp4}`)
  await page.close()
  await browser.close()
}

main().catch(e => { console.error('[rec] ERROR:', e.message); process.exit(1) })
