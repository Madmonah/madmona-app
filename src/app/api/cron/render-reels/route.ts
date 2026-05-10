// src/app/api/cron/render-reels/route.ts
// Renders drafted reel scripts to MP4 videos.
// Downloads FFmpeg binary once on cold-start (cached in /tmp).
// Outputs Madmona-branded MP4 (1080x1920 portrait, fade in/out, solid green).
// User adds Arabic text overlays + photos in Instagram.

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { spawn } from 'child_process'
import { mkdtempSync, readFileSync, rmSync, existsSync, chmodSync, createWriteStream, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

export const runtime = 'nodejs'
export const maxDuration = 300

interface Reel {
  id: string
  title: string
  hook: string
  total_duration_sec: number | null
}

// ============================================================================
// FFmpeg binary management — download once, cache in /tmp
// ============================================================================

const FFMPEG_PATH = '/tmp/ffmpeg'
const FFMPEG_URL = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/linux-x64'

let ffmpegReady = false

async function ensureFFmpeg(): Promise<string> {
  if (ffmpegReady && existsSync(FFMPEG_PATH)) return FFMPEG_PATH

  if (existsSync(FFMPEG_PATH)) {
    const sz = statSync(FFMPEG_PATH).size
    if (sz > 50_000_000) {  // sanity check — should be ~80MB
      try { chmodSync(FFMPEG_PATH, 0o755) } catch {}
      ffmpegReady = true
      return FFMPEG_PATH
    }
  }

  console.log('[ffmpeg] downloading binary...')
  const r = await fetch(FFMPEG_URL)
  if (!r.ok || !r.body) {
    throw new Error(`Failed to download FFmpeg: ${r.status}`)
  }

  const file = createWriteStream(FFMPEG_PATH)
  // Convert web ReadableStream to Node Readable, then pipe to file
  const nodeStream = Readable.fromWeb(r.body as never)
  await pipeline(nodeStream, file)

  chmodSync(FFMPEG_PATH, 0o755)
  console.log(`[ffmpeg] downloaded ${statSync(FFMPEG_PATH).size} bytes`)
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
// Render
// ============================================================================

async function renderReel(reel: Reel, ffmpegPath: string): Promise<string> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'reel-'))
  try {
    const totalDur = reel.total_duration_sec || 22
    const outFile = join(tmpDir, 'output.mp4')

    const ffmpegArgs = [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=0x1F5F3F:s=1080x1920:d=${totalDur}:r=30`,
      '-vf', `fade=t=in:d=0.6,fade=t=out:st=${(totalDur - 0.8).toFixed(2)}:d=0.8,format=yuv420p`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-t', String(totalDur),
      outFile,
    ]

    console.log(`[render-reel ${reel.id}] FFmpeg starting...`)
    await runFFmpeg(ffmpegPath, ffmpegArgs)
    console.log(`[render-reel ${reel.id}] FFmpeg done, uploading...`)

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
      .update({
        video_url: publicUrl,
        status: 'rendered',
      } as never)
      .eq('id', reel.id)

    console.log(`[render-reel ${reel.id}] Done: ${publicUrl}`)
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
  const vercelCronHeader = req.headers.get('x-vercel-cron')
  const isVercelCron = (cronAuth === `Bearer ${process.env.CRON_SECRET}`) || (vercelCronHeader === '1')
  const isAdmin = adminPw && adminPw === process.env.MADMONA_ADMIN_PW

  if (!isVercelCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '5', 10), 10)
  const specificReelId = searchParams.get('reel_id')

  // Ensure FFmpeg is downloaded BEFORE we touch the DB (clearer errors)
  let ffmpegPath: string
  try {
    ffmpegPath = await ensureFFmpeg()
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: `FFmpeg setup failed: ${e instanceof Error ? e.message : 'unknown'}`,
    }, { status: 500 })
  }

  let query = supabaseAdmin
    .from('reel_scripts')
    .select('id, title, hook, total_duration_sec')

  if (specificReelId) {
    query = query.eq('id', specificReelId).limit(1)
  } else {
    query = query.eq('status', 'drafted')
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

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
