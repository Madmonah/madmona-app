// src/app/api/cron/render-reels/route.ts
// Renders drafted reel scripts to MP4 videos using:
// - @vercel/og for Arabic text rendering (per-scene PNG)
// - ffmpeg-static for video composition (concat scenes, fade transitions)
// - Supabase Storage for hosting the final MP4
//
// Triggered by:
// - Vercel cron (daily at 5:30 AM UTC = 7:30 AM Cairo)
// - Manual: POST with x-admin-pw header

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { spawn } from 'child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export const runtime = 'nodejs'
export const maxDuration = 300

// Lazy import to avoid bundle issues at edge
function getFfmpegPath(): string {
  return require('ffmpeg-static') as string
}

interface Scene {
  order?: number
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
  caption: string | null
  cta: string | null
  total_duration_sec: number | null
}

const ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://www.madmonacairo.com'

// ============================================================================
// Frame generation via @vercel/og
// ============================================================================

async function generateFrame(
  text: string,
  type: 'hook' | 'middle' | 'cta',
  index: number
): Promise<Buffer> {
  const url = `${ORIGIN}/api/og/reel-scene?text=${encodeURIComponent(text)}&type=${type}&index=${index}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`OG render failed: ${r.status}`)
  const buf = await r.arrayBuffer()
  return Buffer.from(buf)
}

// ============================================================================
// FFmpeg composition
// ============================================================================

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getFfmpegPath(), args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg exit ${code}: ${stderr.slice(-400)}`))
    })
  })
}

async function renderReel(reel: Reel): Promise<string> {
  const tmpDir = mkdtempSync(join(tmpdir(), 'reel-'))
  try {
    const totalDur = reel.total_duration_sec || 22
    const scenes = (reel.scenes ?? []) as Scene[]

    // Build the frame plan: hook + middle scenes + CTA
    type FramePlan = { text: string; type: 'hook' | 'middle' | 'cta'; duration: number }
    const plan: FramePlan[] = []

    // Frame 0: hook (first 3-4 seconds)
    plan.push({ text: reel.hook, type: 'hook', duration: 4 })

    // Middle frames: text_overlay from each scene (skip first scene since it's the hook)
    const middleScenes = scenes.slice(1, -1)
    const remainingDur = Math.max(totalDur - 8, 6)  // reserve 4s hook + 4s CTA
    const middleDur = middleScenes.length > 0 ? remainingDur / middleScenes.length : 0

    middleScenes.forEach((scene, i) => {
      plan.push({
        text: scene.text_overlay || scene.action || '',
        type: 'middle',
        duration: Math.max(middleDur, 2),
      })
    })

    // Last frame: CTA
    const ctaText = reel.cta?.split('.')[0] || 'احجز دلوقتي'
    plan.push({ text: ctaText.slice(0, 60), type: 'cta', duration: 4 })

    // 1. Generate PNG for each frame
    console.log(`[render-reel ${reel.id}] Generating ${plan.length} frames...`)
    for (let i = 0; i < plan.length; i++) {
      const png = await generateFrame(plan[i].text, plan[i].type, i)
      writeFileSync(join(tmpDir, `frame_${i}.png`), png)
    }

    // 2. Build FFmpeg command to make video from frames
    // Each PNG looped for its duration, concat all, add fade in/out
    const ffmpegArgs: string[] = ['-y']
    plan.forEach((p, i) => {
      ffmpegArgs.push(
        '-loop', '1',
        '-t', String(p.duration),
        '-i', join(tmpDir, `frame_${i}.png`)
      )
    })

    // Filter complex: scale all + concat + fade
    const inputs = plan.map((_, i) => `[${i}:v]scale=1080:1920,setsar=1[v${i}]`).join(';')
    const concatInputs = plan.map((_, i) => `[v${i}]`).join('')
    const filterComplex = `${inputs};${concatInputs}concat=n=${plan.length}:v=1:a=0,fade=t=in:d=0.5,fade=t=out:st=${totalDur - 0.8}:d=0.8,format=yuv420p[out]`

    const outFile = join(tmpDir, 'output.mp4')
    ffmpegArgs.push(
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-r', '30',
      outFile
    )

    console.log(`[render-reel ${reel.id}] Running FFmpeg...`)
    await runFFmpeg(ffmpegArgs)

    // 3. Upload to Supabase Storage
    console.log(`[render-reel ${reel.id}] Uploading...`)
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

    // 4. Update reel_scripts
    await supabaseAdmin
      .from('reel_scripts')
      .update({
        video_url: publicUrl,
        status: 'rendered',
      } as never)
      .eq('id', reel.id)

    return publicUrl
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}

// ============================================================================
// Route handler
// ============================================================================

async function handle(req: NextRequest) {
  // Auth: Vercel cron OR admin pw
  const cronAuth = req.headers.get('authorization')
  const adminPw = req.headers.get('x-admin-pw')
  const vercelCronHeader = req.headers.get('x-vercel-cron')
  const isVercelCron = (cronAuth === `Bearer ${process.env.CRON_SECRET}`) || (vercelCronHeader === '1')
  const isAdmin = adminPw && adminPw === process.env.MADMONA_ADMIN_PW

  if (!isVercelCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional: limit how many to render in one call
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '5', 10), 10)

  const { data: reels, error } = await supabaseAdmin
    .from('reel_scripts')
    .select('id, title, hook, scenes, caption, cta, total_duration_sec')
    .eq('status', 'drafted')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  type R = { id: string; title: string; status: 'OK' | 'FAIL'; url?: string; error?: string }
  const results: R[] = []

  for (const reel of (reels ?? []) as Reel[]) {
    try {
      const url = await renderReel(reel)
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
