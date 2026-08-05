// app/api/hooks/reel-generated/route.ts
// Webhook — the daily reel generator POSTs here after uploading a new MP4.
// We push the reel to Buffer's queue so it auto-publishes to Instagram + Facebook
// Group (and any other Buffer-connected channel) at the optimal time Buffer picks.
//
// Idempotent: if the reel is already queued in Buffer, we skip.
//
// Auth: shared secret in header `x-madmona-secret` (CRON_SECRET) — same as other crons.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createBufferPost, isBufferConfigured } from '@/lib/buffer'

export const runtime = 'nodejs'
export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

function buildCaption(titles: string[]): string {
  const bullets = titles.slice(0, 5).map((t) => `• ${t.slice(0, 60)}`).join('\n')
  return [
    '🚀 مضمونة — أحسن العروض اليوم:',
    '',
    bullets,
    '',
    '👇 كل التفاصيل والحجز في الأب',
    'madmonacairo.com',
    '',
    'أو كلّم المارد على واتساب: 0100 222 9982',
    '',
    '#مضمونة #القاهرة_الجديدة #عقارات #مطاعم #madmona',
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-madmona-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: { reel_id?: string; video_url?: string; listing_titles?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }

  const reelId = body.reel_id
  const videoUrl = body.video_url
  if (!reelId || !videoUrl) {
    return NextResponse.json({ ok: false, error: 'reel_id + video_url required' }, { status: 400 })
  }

  // Load reel row (source of truth) if reel_id given
  // @ts-expect-error — untyped schema
  const { data: reel } = await supabase.from('generated_reels').select('*').eq('id', reelId).maybeSingle()
  if (!reel) return NextResponse.json({ ok: false, error: 'reel not found' }, { status: 404 })

  const published: Record<string, unknown> = (reel as any).published_to || {}
  if (published.buffer_post_id) {
    return NextResponse.json({ ok: true, skipped: 'already queued in Buffer', buffer_post_id: published.buffer_post_id })
  }

  if (!isBufferConfigured()) {
    return NextResponse.json({ ok: false, error: 'Buffer not configured (missing BUFFER_ACCESS_TOKEN)' }, { status: 500 })
  }

  // Pick channels to publish to — IG + FB Group are known-good, FB Page may fail on expired token
  const channels = [
    process.env.BUFFER_INSTAGRAM_CHANNEL_ID,
    process.env.BUFFER_FACEBOOK_GROUP_CHANNEL_ID,
    // Facebook Page intentionally excluded — its token is currently expired.
    // Re-add process.env.BUFFER_FACEBOOK_PAGE_CHANNEL_ID once /admin/refresh-fb-token is used.
  ].filter(Boolean) as string[]

  if (channels.length === 0) {
    return NextResponse.json({ ok: false, error: 'no Buffer channels configured' }, { status: 500 })
  }

  const caption = buildCaption(body.listing_titles || (reel as any).listing_titles || [])
  const result = await createBufferPost({
    channelIds: channels,
    text: caption,
    videoUrl,
    status: 'queued', // Buffer's algo picks the optimal publish time for each channel
  })

  if (!result.ok) {
    // @ts-expect-error
    await supabase.from('generated_reels').update({
      status: 'failed',
      error_message: `buffer: ${result.error}`,
    }).eq('id', reelId)
    return NextResponse.json({ ok: false, error: result.error, channels_attempted: channels.length }, { status: 500 })
  }

  // Success — record buffer_post_id
  // @ts-expect-error
  await supabase.from('generated_reels').update({
    status: 'published',
    published_to: { ...published, buffer_post_id: result.post_id, buffer_channels: channels },
  }).eq('id', reelId)

  return NextResponse.json({
    ok: true,
    buffer_post_id: result.post_id,
    channels: channels.length,
    caption_preview: caption.slice(0, 100),
  })
}
