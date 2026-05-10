// scripts/reels/render-reel.js
// Renders a reel script into an MP4 video using:
// - Pexels API for stock videos (one per scene)
// - FFmpeg for text overlays, concat, music, and 9:16 portrait formatting
// - Supabase for reading reel_scripts and uploading the final video
//
// Usage:
//   node scripts/reels/render-reel.js <reel_id>
//   node scripts/reels/render-reel.js --latest
//   node scripts/reels/render-reel.js --all-drafted

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env.local') })

const fs = require('fs')
const path = require('path')
const https = require('https')
const { spawn } = require('child_process')

// FFmpeg static binary
let ffmpegPath
try {
  ffmpegPath = require('ffmpeg-static')
} catch {
  console.error('❌ ffmpeg-static not installed. Run: npm install --save-dev ffmpeg-static node-fetch@2')
  process.exit(1)
}

// Polyfill fetch for Node < 18
const fetch = (...args) => globalThis.fetch ? globalThis.fetch(...args) : import('node-fetch').then(m => m.default(...args))

// ============================================================================
// Config
// ============================================================================

const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!PEXELS_API_KEY) {
  console.error('❌ Missing PEXELS_API_KEY in .env.local')
  console.error('   Get free key: https://www.pexels.com/api/')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const TMP_DIR = path.join(__dirname, '.tmp')
const OUTPUT_DIR = path.join(__dirname, 'output')
fs.mkdirSync(TMP_DIR, { recursive: true })
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// Bundled royalty-free music (place files in scripts/reels/music/)
const MUSIC_DIR = path.join(__dirname, 'music')
const DEFAULT_MUSIC = path.join(MUSIC_DIR, 'default.mp3')

// ============================================================================
// Helpers
// ============================================================================

function log(...args) { console.log('[render-reel]', ...args) }
function logErr(...args) { console.error('[render-reel] ❌', ...args) }

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve, reject)
      }
      response.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    log('FFmpeg:', args.slice(0, 8).join(' '), '...')
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg exit ${code}\n${stderr.slice(-500)}`))
    })
  })
}

// ============================================================================
// Supabase
// ============================================================================

async function fetchReel(reelId) {
  const url = reelId === '--latest'
    ? `${SUPABASE_URL}/rest/v1/reel_scripts?select=*&order=created_at.desc&limit=1`
    : `${SUPABASE_URL}/rest/v1/reel_scripts?id=eq.${reelId}&select=*`

  const r = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  })
  if (!r.ok) throw new Error(`Supabase fetch failed: ${r.status}`)
  const data = await r.json()
  if (!data || data.length === 0) throw new Error('Reel not found')
  return data[0]
}

async function fetchAllDrafted() {
  const url = `${SUPABASE_URL}/rest/v1/reel_scripts?status=eq.drafted&select=*&order=created_at.desc`
  const r = await fetch(url, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
  })
  return r.ok ? await r.json() : []
}

async function uploadToSupabase(localFile, remoteName) {
  const buf = fs.readFileSync(localFile)
  const url = `${SUPABASE_URL}/storage/v1/object/reels/${remoteName}`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: buf,
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`Upload failed: ${r.status} ${text}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/reels/${remoteName}`
}

async function updateReelStatus(reelId, videoUrl) {
  const url = `${SUPABASE_URL}/rest/v1/reel_scripts?id=eq.${reelId}`
  await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ video_url: videoUrl, status: 'rendered' }),
  })
}

// ============================================================================
// Pexels
// ============================================================================

// Map Arabic scene actions to English search terms (Pexels works best in English)
const SCENE_KEYWORD_MAP = {
  // Cars
  'كاميرا بتدور حوالين': 'car exterior shot',
  'فتح باب السواق': 'opening car door interior',
  'لقطة للوحة القيادة': 'car dashboard',
  'لقطة للمقاعد': 'car interior seats',
  'بيمشي': 'person walking to car',
  'بتتحرك من قدام': 'car driving away',
  'لوجو': 'logo abstract green',
  // Office / coworking
  'مساحة خارجية': 'outdoor workspace',
  'تراس': 'sunny terrace',
  'مكتب خاص': 'private office',
  'Hot Desk': 'coworking space hot desk',
  'Content Creators': 'content creator filming',
  // Generic
  'كاميرا': 'cinematic shot',
  'لقطة': 'cinematic close up',
}

function arabicToEnglishQuery(arabic, fallback = 'business cinematic') {
  if (!arabic) return fallback
  for (const [ar, en] of Object.entries(SCENE_KEYWORD_MAP)) {
    if (arabic.includes(ar)) return en
  }
  return fallback
}

async function searchPexels(query) {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait&size=medium`
  const r = await fetch(url, { headers: { 'Authorization': PEXELS_API_KEY } })
  if (!r.ok) throw new Error(`Pexels API: ${r.status}`)
  const data = await r.json()
  if (!data.videos || data.videos.length === 0) {
    // Fallback: any orientation
    const r2 = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5`, {
      headers: { 'Authorization': PEXELS_API_KEY },
    })
    const d2 = await r2.json()
    if (!d2.videos || d2.videos.length === 0) return null
    return d2.videos[0]
  }
  return data.videos[0]
}

function pickBestVideoFile(video) {
  // Prefer 720p portrait, fallback to anything reasonable
  const files = video.video_files || []
  const portrait = files.filter((f) => f.height > f.width)
  const sorted = (portrait.length > 0 ? portrait : files)
    .sort((a, b) => Math.abs(720 - a.height) - Math.abs(720 - b.height))
  return sorted[0]
}

// ============================================================================
// Rendering
// ============================================================================

async function renderReel(reel) {
  const reelDir = path.join(TMP_DIR, reel.id)
  fs.mkdirSync(reelDir, { recursive: true })

  log(`▶ Rendering: ${reel.title}`)
  log(`  ${reel.scenes.length} scenes, ${reel.total_duration_sec}s total`)

  // 1. Download a stock video for each scene
  const sceneFiles = []
  for (let i = 0; i < reel.scenes.length; i++) {
    const scene = reel.scenes[i]
    const query = arabicToEnglishQuery(scene.action)
    log(`  Scene ${i + 1}/${reel.scenes.length}: "${scene.text_overlay}" — searching "${query}"`)

    const video = await searchPexels(query)
    if (!video) { log(`    ⚠ No video found, skipping scene ${i + 1}`); continue }
    const file = pickBestVideoFile(video)
    if (!file) { log(`    ⚠ No video file, skipping`); continue }

    const localFile = path.join(reelDir, `scene_${i}.mp4`)
    log(`    ↓ ${file.link.slice(0, 60)}...`)
    await downloadFile(file.link, localFile)
    sceneFiles.push({ file: localFile, scene })
  }

  if (sceneFiles.length === 0) throw new Error('No scenes downloaded')

  // 2. Process each scene: trim, scale to 1080x1920, add text overlay
  const processedFiles = []
  for (let i = 0; i < sceneFiles.length; i++) {
    const { file, scene } = sceneFiles[i]
    const out = path.join(reelDir, `processed_${i}.mp4`)

    // Build text overlay using drawtext (FFmpeg).
    // Note: Arabic text needs a font that supports it (Cairo, Tajawal, NotoNaskhArabic).
    // For now, we escape the text minimally and use a default font (drawtext renders LTR).
    // Better Arabic shaping requires libass + ASS subtitles — see fallback below.
    const text = (scene.text_overlay || '').replace(/'/g, '').replace(/:/g, ' ')

    // Try drawtext first; if it fails, just scale + trim without overlay
    const args = [
      '-y',
      '-ss', '0', '-t', String(scene.duration_sec || 3),
      '-i', file,
      '-vf', [
        // 1080x1920 portrait with crop-fill (no black bars)
        'scale=1080:1920:force_original_aspect_ratio=increase',
        'crop=1080:1920',
        // Subtle dark overlay for text legibility
        'drawbox=x=0:y=h-260:w=iw:h=260:color=black@0.4:t=fill',
      ].join(','),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-an',
      out,
    ]

    await runFFmpeg(args)
    processedFiles.push(out)
  }

  // 3. Concatenate all processed scenes
  const concatList = path.join(reelDir, 'concat.txt')
  fs.writeFileSync(concatList, processedFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'))

  const concatOutput = path.join(reelDir, 'concat.mp4')
  await runFFmpeg([
    '-y', '-f', 'concat', '-safe', '0', '-i', concatList,
    '-c', 'copy', concatOutput,
  ])

  // 4. Add music (if available)
  const finalOutput = path.join(OUTPUT_DIR, `${reel.id}.mp4`)
  if (fs.existsSync(DEFAULT_MUSIC)) {
    const totalDur = reel.total_duration_sec || 22
    await runFFmpeg([
      '-y',
      '-i', concatOutput,
      '-i', DEFAULT_MUSIC,
      '-filter_complex', `[1:a]volume=0.3,afade=t=out:st=${totalDur - 1}:d=1[a]`,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-shortest',
      finalOutput,
    ])
  } else {
    log(`  ⚠ No default music found (${DEFAULT_MUSIC}). Outputting silent video.`)
    fs.copyFileSync(concatOutput, finalOutput)
  }

  // 5. Upload to Supabase Storage
  log(`  ↑ Uploading to Supabase Storage...`)
  let videoUrl = null
  try {
    videoUrl = await uploadToSupabase(finalOutput, `${reel.id}.mp4`)
    await updateReelStatus(reel.id, videoUrl)
    log(`  ✅ Uploaded: ${videoUrl}`)
  } catch (e) {
    log(`  ⚠ Upload failed (kept locally): ${e.message}`)
  }

  // Cleanup tmp
  try { fs.rmSync(reelDir, { recursive: true, force: true }) } catch {}

  return { reel, finalOutput, videoUrl }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.log('Usage:')
    console.log('  node scripts/reels/render-reel.js <reel_id>')
    console.log('  node scripts/reels/render-reel.js --latest')
    console.log('  node scripts/reels/render-reel.js --all-drafted')
    process.exit(0)
  }

  if (arg === '--all-drafted') {
    const reels = await fetchAllDrafted()
    log(`Found ${reels.length} drafted reels.`)
    for (const reel of reels) {
      try { await renderReel(reel) }
      catch (e) { logErr(`Failed ${reel.id}: ${e.message}`) }
    }
  } else {
    const reel = await fetchReel(arg)
    const { finalOutput, videoUrl } = await renderReel(reel)
    log('')
    log('🎬 DONE!')
    log(`   Local file: ${finalOutput}`)
    if (videoUrl) log(`   Public URL: ${videoUrl}`)
  }
}

main().catch((e) => { logErr(e.message); process.exit(1) })
