// record-all.js — record every design in designs.json sequentially
const { chromium } = require('playwright')
const ffmpegPath = require('ffmpeg-static')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const PROJECT_ID = '004b32d9-d907-4765-a1cd-d514533dddcd'
const OUTPUT_DIR = path.join(__dirname, 'output')
const FRAMES_DIR = path.join(__dirname, 'frames-tmp')
const CDP_URL    = process.env.CDP_URL || 'http://localhost:9222'
const FPS        = 25

async function record(browser, entry) {
  const { file, duration = 20, out_name } = entry
  const slug = out_name || file.replace(/[^\w؀-ۿ]+/g, '_').slice(0, 60)
  const outMp4 = path.join(OUTPUT_DIR, slug + '.mp4')
  if (fs.existsSync(outMp4) && !process.env.FORCE) {
    console.log('[SKIP] ' + slug + ' — exists (set FORCE=1 to re-record)')
    return { file, out: outMp4, skipped: true }
  }
  console.log('\n=== ' + file + ' (' + duration + 's) ===')

  fs.rmSync(FRAMES_DIR, { recursive: true, force: true })
  fs.mkdirSync(FRAMES_DIR, { recursive: true })
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const ctx = browser.contexts()[0]
  const url = 'https://claude.ai/design/p/' + PROJECT_ID + '?file=' + encodeURIComponent(file) + '&present=1'
  const page = await ctx.newPage()
  await page.bringToFront()
  await page.setViewportSize({ width: 1080, height: 1920 }).catch(() => {})
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

  await page.waitForFunction(() => {
    const f = document.querySelector('iframe[src*="claudeusercontent"]')
    if (!f) return false
    const r = f.getBoundingClientRect()
    return r.width > 500 && r.height > 500
  }, { timeout: 60000 }).catch(() => console.log('[warn] iframe wait timeout — recording anyway'))
  await page.waitForTimeout(3500)

  const client = await ctx.newCDPSession(page)
  const totalFrames = duration * FPS
  const intervalMs = 1000 / FPS
  const t0 = Date.now()
  for (let i = 0; i < totalFrames; i++) {
    const target = t0 + i * intervalMs
    const wait = target - Date.now()
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    try {
      const { data } = await client.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, captureBeyondViewport: false })
      fs.writeFileSync(path.join(FRAMES_DIR, 'f' + String(i).padStart(6, '0') + '.jpg'), Buffer.from(data, 'base64'))
      if (i % 25 === 0) process.stdout.write('.')
    } catch (e) { console.log('\n[frame ' + i + '] ' + e.message) }
  }
  console.log('\n[done] ' + totalFrames + ' frames')

  await new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, [
      '-y', '-framerate', String(FPS),
      '-i', path.join(FRAMES_DIR, 'f%06d.jpg'),
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-movflags', '+faststart',
      outMp4,
    ], { stdio: 'inherit' })
    p.on('exit', c => c === 0 ? resolve() : reject(new Error('ffmpeg ' + c)))
  })

  await page.close()
  console.log('✓ ' + outMp4)
  return { file, out: outMp4 }
}

async function main() {
  const listPath = path.join(__dirname, 'designs.json')
  if (!fs.existsSync(listPath)) { console.error('designs.json not found'); process.exit(1) }
  const raw = fs.readFileSync(listPath, 'utf8').replace(/^﻿/, '')
  const designs = JSON.parse(raw)
  console.log('[all] ' + designs.length + ' designs to record')

  const browser = await chromium.connectOverCDP(CDP_URL)
  const results = []
  for (const d of designs) {
    try { results.push(await record(browser, d)) }
    catch (e) { console.error('[FAIL] ' + d.file + ': ' + e.message); results.push({ file: d.file, error: e.message }) }
  }
  await browser.close()

  const summary = path.join(OUTPUT_DIR, '_summary.json')
  fs.writeFileSync(summary, JSON.stringify(results, null, 2))
  console.log('\n=== SUMMARY ===')
  for (const r of results) console.log(r.error ? '✗ ' + r.file + ': ' + r.error : r.skipped ? '- ' + r.file + ' (skipped)' : '✓ ' + r.file)
}

main().catch(e => { console.error(e); process.exit(1) })
