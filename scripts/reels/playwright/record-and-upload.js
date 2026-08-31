// record-and-upload.js — records each design in designs.json AND uploads to Supabase design_clips.
// Run once with your Chrome open on port 9222.
// After this finishes, the daily cron will rotate through all uploaded designs autonomously.
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
const SUPA       = 'https://mjhflxpxunwycbiquoig.supabase.co'
const SUPA_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'

function slugify(s) {
  return s.replace(/[^\wء-ي]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).toLowerCase() || 'design'
}

async function upload(mp4Path, slug) {
  const bytes = fs.readFileSync(mp4Path)
  const storagePath = 'designs/' + slug + '.mp4'
  const res = await fetch(SUPA + '/storage/v1/object/generated-reels/' + storagePath, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'video/mp4', 'x-upsert': 'true' },
    body: bytes,
  })
  if (!res.ok) throw new Error('upload: ' + res.status + ' ' + await res.text())
  return { storagePath, url: SUPA + '/storage/v1/object/public/' + 'generated-reels/' + storagePath, bytes: bytes.length }
}

async function register(entry, upl) {
  const body = {
    slug: entry.slug,
    title: entry.title,
    design_file: entry.file,
    storage_path: upl.storagePath,
    video_url: upl.url,
    duration_sec: entry.duration || 20,
    size_bytes: upl.bytes,
    caption_text: entry.caption || ('✨ ' + entry.title + '\n\n🔗 https://madmonacairo.com\n#مضمونة'),
    categories: entry.categories || ['general'],
    active: true,
  }
  const res = await fetch(SUPA + '/rest/v1/design_clips', {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('register: ' + res.status + ' ' + await res.text())
  return await res.json()
}

async function record(browser, entry) {
  const { file, duration = 20 } = entry
  const slug = entry.slug || slugify(file.replace(/\.dc\.html$/, ''))
  entry.slug = slug
  const outMp4 = path.join(OUTPUT_DIR, slug + '.mp4')
  console.log('\n=== ' + file + ' → ' + slug + ' ===')

  if (fs.existsSync(outMp4) && !process.env.FORCE) {
    console.log('[cached] using existing mp4')
  } else {
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
    }, { timeout: 60000 }).catch(() => console.log('[warn] iframe wait timeout'))
    await page.waitForTimeout(3500)

    const client = await ctx.newCDPSession(page)
    const totalFrames = duration * FPS
    const intervalMs = 1000 / FPS
    const t0 = Date.now()
    for (let i = 0; i < totalFrames; i++) {
      const target = t0 + i * intervalMs
      const w = target - Date.now(); if (w > 0) await new Promise(r => setTimeout(r, w))
      try {
        const { data } = await client.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, captureBeyondViewport: false })
        fs.writeFileSync(path.join(FRAMES_DIR, 'f' + String(i).padStart(6, '0') + '.jpg'), Buffer.from(data, 'base64'))
        if (i % 25 === 0) process.stdout.write('.')
      } catch (e) { console.log('\n[frame ' + i + '] ' + e.message) }
    }
    console.log('\n[capture done] ' + totalFrames + ' frames')
    await new Promise((res, rej) => {
      const p = spawn(ffmpegPath, [
        '-y', '-framerate', String(FPS),
        '-i', path.join(FRAMES_DIR, 'f%06d.jpg'),
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
        '-movflags', '+faststart',
        outMp4,
      ], { stdio: 'inherit' })
      p.on('exit', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c)))
    })
    await page.close()
  }

  console.log('[upload]…')
  const upl = await upload(outMp4, slug)
  console.log('  → ' + upl.url + '  (' + upl.bytes + 'B)')
  console.log('[register]…')
  const [row] = await register(entry, upl)
  console.log('✓ registered design_clip id=' + row.id)
  return { slug, url: upl.url, id: row.id }
}

async function main() {
  const listPath = path.join(__dirname, 'designs.json')
  if (!fs.existsSync(listPath)) { console.error('designs.json not found'); process.exit(1) }
  const raw = fs.readFileSync(listPath, 'utf8').replace(/^﻿/, '')
  const designs = JSON.parse(raw)
  console.log('[all] ' + designs.length + ' designs')

  const browser = await chromium.connectOverCDP(CDP_URL)
  const results = []
  for (const d of designs) {
    try { results.push(await record(browser, d)) }
    catch (e) { console.error('[FAIL] ' + d.file + ': ' + e.message); results.push({ file: d.file, error: e.message }) }
  }
  await browser.close()
  fs.writeFileSync(path.join(OUTPUT_DIR, '_upload_summary.json'), JSON.stringify(results, null, 2))
  console.log('\n=== SUMMARY ===')
  for (const r of results) console.log(r.error ? '✗ ' + (r.file || '?') + ': ' + r.error : '✓ ' + r.slug)
  console.log('\nAll uploaded designs are now in design_clips table.')
  console.log('Daily cron will auto-rotate through them at 9 AM Cairo.')
}
main().catch(e => { console.error(e); process.exit(1) })
