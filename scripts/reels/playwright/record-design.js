// scripts/reels/playwright/record-design.js
// Record a Claude Design short in Present mode as an MP4 (1080x1920, 30 fps).
// Usage: node record-design.js "شورت ١ - سؤال وجواب.dc.html" [duration_seconds]
//
// Uses Playwright's built-in recordVideo (WebM) + ffmpeg to convert to MP4.
// Runs on a persistent profile — first run needs Mohamed to be logged into claude.ai
// (headed run below leaves the browser open until Enter is pressed).

const { chromium } = require('playwright')
const ffmpegPath = require('ffmpeg-static')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const PROJECT_ID = '004b32d9-d907-4765-a1cd-d514533dddcd'
const PROFILE_DIR = path.join(__dirname, 'profile')
const OUTPUT_DIR = path.join(__dirname, 'output')

async function main() {
  const fileName = process.argv[2] || 'شورت ١ - سؤال وجواب.dc.html'
  const durationSec = Number(process.argv[3] || 30)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const slug = fileName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.mkdirSync(PROFILE_DIR, { recursive: true })

  const url = `https://claude.ai/design/p/${PROJECT_ID}?file=${encodeURIComponent(fileName)}&present=1`
  console.log(`[rec] design: ${fileName}`)
  console.log(`[rec] duration: ${durationSec}s`)
  console.log(`[rec] url: ${url}`)

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false, // First run must be headed so Mohamed can log in to claude.ai
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1080, height: 1920 } },
    args: ['--window-size=1120,1960', '--autoplay-policy=no-user-gesture-required'],
  })

  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

  // Wait for the design iframe to actually render (bootstrap iframe from claudeusercontent)
  await page.waitForFunction(() => {
    const f = document.querySelector('iframe[src*="claudeusercontent"]')
    return f && f.getBoundingClientRect().width > 500
  }, { timeout: 60000 }).catch(() => console.log('[rec] iframe wait timeout — recording anyway'))

  console.log('[rec] recording…')
  await page.waitForTimeout(durationSec * 1000)

  const pages = context.pages()
  await Promise.all(pages.map((p) => p.close()))
  await context.close()

  // Find the WebM file just created
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter((f) => f.endsWith('.webm'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(OUTPUT_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  if (files.length === 0) throw new Error('no webm produced')
  const webm = path.join(OUTPUT_DIR, files[0].f)
  const mp4 = path.join(OUTPUT_DIR, `${stamp}_${slug}.mp4`)

  console.log(`[rec] webm: ${webm}`)
  console.log(`[rec] converting to mp4 -> ${mp4}`)

  await new Promise((resolve, reject) => {
    const args = [
      '-y', '-i', webm,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20',
      '-movflags', '+faststart',
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=cover,crop=1080:1920',
      '-r', '30',
      mp4,
    ]
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => { err += d.toString() })
    p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-400)}`)))
  })

  fs.unlinkSync(webm)
  console.log(`\n✓ DONE: ${mp4}`)
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1) })
