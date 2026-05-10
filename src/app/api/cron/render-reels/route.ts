// src/app/api/cron/render-reels/route.ts
// Renders reels with Arabic text overlays + Madmona branding via @vercel/og + FFmpeg.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { spawn } from 'child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, chmodSync, createWriteStream, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

export const runtime = 'nodejs'
export const maxDuration = 300

interface Scene {
  duration_sec?: number
  text_overlay?: string
  voice_over?: string
  action?: string
}

interface Reel {
  id: string
  title: string
  hook: string
  scenes: Scene[] | null
  cta: string | null
  total_duration_sec: number | null
}

// ============================================================================
// FFmpeg binary - downloaded once on cold-start
// ============================================================================

const FFMPEG_PATH = '/tmp/ffmpeg'
const FFMPEG_URL = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b4.4.1/linux-x64'
let ffmpegReady = false

async function ensureFFmpeg(): Promise<string> {
  if (ffmpegReady && existsSync(FFMPEG_PATH)) return FFMPEG_PATH
  if (existsSync(FFMPEG_PATH)) {
    const sz = statSync(FFMPEG_PATH).size
    if (sz > 50_000_000) {
      try { chmodSync(FFMPEG_PATH, 0o755) } catch {}
      ffmpegReady = true
      return FFMPEG_PATH
    }
  }
  console.log('[ffmpeg] downloading...')
  const r = await fetch(FFMPEG_URL)
  if (!r.ok || !r.body) throw new Error(`Failed to download FFmpeg: ${r.status}`)
  const file = createWriteStream(FFMPEG_PATH)
  await pipeline(Readable.fromWeb(r.body as never), file)
  chmodSync(FFMPEG_PATH, 0o755)
  ffmpegReady = true
  return FFMPEG_PATH
}

function runFFmpeg(ffmpegPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('error', (err) => reject(new Error(`spawn error: ${err.message}`)))
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg exit ${code}: ${stderr.slice(-400)}`))
    })
  })
}

// ============================================================================
// Frame generation via @vercel/og endpoint with strict timeout
// ============================================================================

const FRAME_ORIGIN = 'https://www.madmonacairo.com'

async function generateFrame(text: string, type: 'hook' | 'middle' | 'cta', index: number): Promise<Buffer | null> {
  const url = `${FRAME_ORIGIN}/api/og/reel-scene?text=${encodeURIComponent(text.slice(0, 100))}&type=${type}&index=${index}`
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(25_000),
      cache: 'no-store',
    })
    if (!r.ok) {
      console.error(`[og] ${r.status} for "${text.slice(0, 30)}"`)
      return null
    }
    const buf = Buffer.from(await r.arrayBuffer())
    return buf.length > 1000 ? buf : null
  } catch (e) {
    console.error('[og] fetch error:', e instanceof Error ? e.message : e)
    return null
  }
}

// ============================================================================
// Render
// ============================================================================

interface FramePlan {
  text: string
  type: 'hook' | 'middle' | 'cta'
  duration: number
}

function buildPlan(reel: Reel): FramePlan[] {
  const total = reel.total_duration_sec || 22
  const scenes = (reel.scenes ?? []) as Scene[]
  const plan: FramePlan[] = []

  // Hook frame
  plan.push({ text: reel.hook || reel.title, type: 'hook', duration: Math.min(4, Math.max(3, total * 0.18)) })

  // Middle frames from scenes
  const middleScenes = scenes.filter(s => s.text_overlay && s.text_overlay.length > 0)
  // Skip first (it's the hook) and last (likely CTA-related)
  const middles = middleScenes.length > 2 ? middleScenes.slice(1, -1) : middleScenes
  const middleTotalDur = total - 8  // reserve 4s hook + 4s CTA
  const perMiddle = middles.length > 0 ? middleTotalDur / middles.length : 0

  for (const s of middles) {
    plan.push({
      text: (s.text_overlay || '').slice(0, 80),
      type: 'middle',
      duration: Math.max(2.5, perMiddle),
    })
  }

  // CTA frame
  const ctaText = (reel.cta?.split(/[.،]/)[0] || 'احجز دلوقتي').slice(0, 60)
  plan.push({ text: ctaText, type: 'cta', duration: 4 })

  return plan
}

async function renderReel(reel: Reel, ffmpegPath: string): Promise<string> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'reel-'))
  try {
    const plan = buildPlan(reel)
    const total = reel.total_duration_sec || 22

    console.log(`[render-reel ${reel.id}] Plan: ${plan.length} frames (${total}s)`)

    // 1. Generate PNG for each frame in parallel (faster than serial)
    const framePngs: Array<Buffer | null> = await Promise.all(
      plan.map((p, i) => generateFrame(p.text, p.type, i))
    )

    // Write successful PNGs to disk; track which scenes have valid frames
    const validFrames: Array<{ path: string; duration: number }> = []
    framePngs.forEach((png, i) => {
      if (png) {
        const filePath = join(tmpDir, `frame_${i}.png`)
        writeFileSync(filePath, png)
        validFrames.push({ path: filePath, duration: plan[i].duration })
      } else {
        console.warn(`[render-reel ${reel.id}] frame ${i} failed, skipping`)
      }
    })

    if (validFrames.length === 0) {
      throw new Error('All frame generations failed')
    }

    console.log(`[render-reel ${reel.id}] ${validFrames.length}/${plan.length} frames generated, composing...`)

    // 2. FFmpeg compose: each PNG looped for its duration, concat, fade
    const ffmpegArgs: string[] = ['-y']
    validFrames.forEach((f) => {
      ffmpegArgs.push('-loop', '1', '-t', String(f.duration), '-i', f.path)
    })

    const inputs = validFrames.map((_, i) => `[${i}:v]scale=1080:1920,setsar=1[v${i}]`).join(';')
    const concatInputs = validFrames.map((_, i) => `[v${i}]`).join('')
    const totalActual = validFrames.reduce((s, f) => s + f.duration, 0)
    const filterComplex = `${inputs};${concatInputs}concat=n=${validFrames.length}:v=1:a=0,fade=t=in:d=0.5,fade=t=out:st=${(totalActual - 0.8).toFixed(2)}:d=0.8,format=yuv420p[out]`

    const outFile = join(tmpDir, 'output.mp4')
    ffmpegArgs.push(
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '26',
      '-r', '30',
      outFile,
    )

    await runFFmpeg(ffmpegPath, ffmpegArgs)
    console.log(`[render-reel ${reel.id}] FFmpeg done`)

    // 3. Upload to Supabase Storage
    const buf = readFileSync(outFile)
    const { error: upErr } = await supabaseAdmin.storage
      .from('reels')
      .upload(`${reel.id}.mp4`, buf, {
        contentType: 'video/mp4',
        upsert: true,
      })
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('reels')
      .getPublicUrl(`${reel.id}.mp4`)

    await supabaseAdmin
      .from('reel_scripts')
      .update({ video_url: publicUrl, status: 'rendered' } as never)
      .eq('id', reel.id)

    return publicUrl
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}

// ============================================================================
// Handler
// ============================================================================

async function handle(req: NextRequest) {
  const cronAuth = req.headers.get('authorization')
  const adminPw = req.headers.get('x-admin-pw')
  const vercelCron = req.headers.get('x-vercel-cron')
  const isCron = (cronAuth === `Bearer ${process.env.CRON_SECRET}`) || (vercelCron === '1')
  const isAdmin = adminPw && adminPw === process.env.MADMONA_ADMIN_PW

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let ffmpegPath: string
  try {
    ffmpegPath = await ensureFFmpeg()
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: `FFmpeg setup failed: ${e instanceof Error ? e.message : 'unknown'}`,
    }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '5', 10), 10)
  const specificReelId = searchParams.get('reel_id')

  let query = supabaseAdmin
    .from('reel_scripts')
    .select('id, title, hook, scenes, cta, total_duration_sec')

  if (specificReelId) {
    query = query.eq('id', specificReelId).limit(1)
  } else {
    query = query.in('status', ['drafted', 'rendered'])
      .order('created_at', { ascending: false })
      .limit(limit)
  }

  const { data: reels, error } = await query
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  type R = { id: string; title: string; status: 'OK' | 'FAIL'; url?: string; error?: string }
  const results: R[] = []

  for (const reel of (reels ?? []) as Reel[]) {
    try {
      const url = await renderReel(reel, ffmpegPath)
      results.push({ id: reel.id, title: reel.title, status: 'OK', url })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown'
      console.error(`[render-reel ${reel.id}] FAILED:`, msg)
      results.push({ id: reel.id, title: reel.title, status: 'FAIL', error: msg })
    }
  }

  const okCount = results.filter(r => r.status === 'OK').length
  return NextResponse.json({
    ok: true,
    rendered: okCount,
    failed: results.length - okCount,
    results,
  })
}

export async function GET(req: NextRequest) { return handle(req) }
export async function POST(req: NextRequest) { return handle(req) }
