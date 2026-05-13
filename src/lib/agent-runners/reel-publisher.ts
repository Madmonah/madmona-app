// src/lib/agent-runners/reel-publisher.ts
// Reel publisher: takes rendered reel_scripts and publishes them to Instagram as REELS.
// 2026-05-13 — Mohamed: "مفيش ريلز اتعملت" — 8 rendered videos sitting unpublished.
//
// FLOW:
//   1. Pick oldest reel_scripts with status='rendered' + valid video_url
//   2. Build full caption from caption + hashtags + cta
//   3. Call IG Graph API: media_type=REELS with video_url
//   4. Wait for IG to process the video (up to 2 min)
//   5. Publish
//   6. Update reel_scripts.status to 'published' on success
//
// CADENCE: Conservative — 1 reel per scheduled run, scheduler runs every 6h.
// This avoids spamming IG audience with too many reels at once.

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { publishReelToInstagram, isInstagramConfigured } from '@/lib/instagram'

export async function runReelPublisher(): Promise<Record<string, unknown>> {
  if (!isInstagramConfigured()) {
    return {
      skipped: true,
      reason: 'Instagram env vars missing (INSTAGRAM_BUSINESS_ACCOUNT_ID, INSTAGRAM_PAGE_ACCESS_TOKEN)',
    }
  }

  // Pick the oldest rendered reel that hasn't been published yet
  const { data: scripts } = await supabaseAdmin
    .from('reel_scripts')
    .select('id, title, caption, hashtags, cta, video_url, total_duration_sec, listing_id')
    .eq('status', 'rendered')
    .not('video_url', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)

  type Script = {
    id: string
    title: string
    caption: string
    hashtags: string[] | null
    cta: string | null
    video_url: string
    total_duration_sec: number | null
    listing_id: string | null
  }
  const script = ((scripts ?? []) as Script[])[0]

  if (!script) {
    return { skipped: true, reason: 'no rendered reels waiting to publish' }
  }

  // Sanity check video URL
  if (!script.video_url.startsWith('http')) {
    await supabaseAdmin
      .from('reel_scripts')
      .update({ status: 'publish_failed' } as never)
      .eq('id', script.id)
    return {
      published: false,
      reel_id: script.id,
      stage: 'video_url_check',
      error: `Invalid video_url: ${script.video_url}`,
    }
  }

  // Build the full IG caption (max 2200 chars; reels also support 2200)
  const hashtagsStr = (script.hashtags ?? []).join(' ')
  const fullCaption = [script.caption, script.cta ?? '', hashtagsStr]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 2200)

  // Publish to Instagram as a Reel
  const result = await publishReelToInstagram({
    videoUrl: script.video_url,
    caption: fullCaption,
  })

  if (!result.ok) {
    await supabaseAdmin
      .from('reel_scripts')
      .update({ status: 'publish_failed' } as never)
      .eq('id', script.id)
    return {
      published: false,
      reel_id: script.id,
      title: script.title,
      stage: 'instagram_publish',
      error: result.error,
    }
  }

  // Success — mark as published
  await supabaseAdmin
    .from('reel_scripts')
    .update({
      status: 'published',
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', script.id)

  return {
    published: true,
    reel_id: script.id,
    title: script.title,
    ig_post_id: result.ig_post_id,
    video_url: script.video_url,
    duration_sec: script.total_duration_sec,
  }
}
