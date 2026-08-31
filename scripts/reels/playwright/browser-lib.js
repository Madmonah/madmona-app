// browser-lib.js — shared helpers for platform uploaders
const { chromium } = require('playwright')
const fs = require('fs')

const CDP_URL = process.env.CDP_URL || 'http://localhost:9222'

async function connect() {
  const browser = await chromium.connectOverCDP(CDP_URL)
  const ctx = browser.contexts()[0]
  if (!ctx) throw new Error('No browser context found — is Chrome launched with --remote-debugging-port=9222?')
  return { browser, ctx }
}

async function newTab(ctx, url) {
  const page = await ctx.newPage()
  await page.bringToFront()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  return page
}

async function saveScreenshot(page, tag) {
  const path = require('path')
  const dir = path.join(process.cwd(), 'diag', 'post-' + tag)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, Date.now() + '.png')
  await page.screenshot({ path: file, fullPage: false })
  console.log('[shot] ' + file)
  return file
}

async function readReel(id) {
  // fetch latest ready reel from Supabase — or use MP4_PATH env override
  const local = process.env.MP4_PATH
  if (local) return { mp4: local, caption: process.env.CAPTION || '✨ من مضمونة\n🔗 https://madmonacairo.com' }
  const SUPA = 'https://mjhflxpxunwycbiquoig.supabase.co'
  const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'
  const q = id ? `id=eq.${id}` : 'active=eq.true&order=last_used_at.asc.nullsfirst&limit=1'
  const res = await fetch(`${SUPA}/rest/v1/design_clips?select=id,slug,video_url,caption_text&${q}`, {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
  })
  const rows = await res.json()
  if (!rows.length) throw new Error('no active design_clips')
  const clip = rows[0]
  // Download mp4 to local temp
  const path = require('path')
  const os = require('os')
  const mp4 = path.join(os.tmpdir(), 'reel-' + clip.slug + '.mp4')
  const buf = Buffer.from(await (await fetch(clip.video_url)).arrayBuffer())
  fs.writeFileSync(mp4, buf)
  return { mp4, caption: clip.caption_text, slug: clip.slug, id: clip.id }
}

async function markPosted(id, platform, url) {
  const SUPA = 'https://mjhflxpxunwycbiquoig.supabase.co'
  const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'
  const body = { platform, target_url: url, posted_at: new Date().toISOString(), clip_id: id }
  await fetch(`${SUPA}/rest/v1/design_clip_posts`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

module.exports = { connect, newTab, saveScreenshot, readReel, markPosted }
