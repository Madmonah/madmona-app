// src/lib/agent-runners/buffer-publisher.ts
// 3-channel auto-publisher: IG + FB Page + FB Group (2026-05-08)
// Schedules drafted Instagram/Facebook posts to Buffer queue (GraphQL API v2)
// Buffer auto-publishes them at optimal times to:
//   - @madmona.cairo (Instagram Business)
//   - Madmona (Facebook Page)
//   - Madmona - مضمونة (Facebook Group)
//
// 2026-05-13 update (Mohamed: FB posts stuck since May 11):
// Now also picks `facebook_post` content_type, not just instagram_post.
// For facebook_post entries, only routes to FB channels (Page + Group), skips IG.
//
// 2026-05-19 update (Phase B.11 — Mohamed: publishing stuck since May 15):
// Now picks status='approved' as well as 'drafted'. Admin approval flow
// moves posts to 'approved' status; previously these stayed unpicked and
// 40 posts were stuck for 2-4 days. Also enforces visual_status='qc_passed'
// to prevent unreviewed posts from reaching social channels.

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { generateAndUploadImage } from '@/lib/image-generator'
import { createBufferPost, isBufferConfigured } from '@/lib/buffer'

const BUFFER_INSTAGRAM_CHANNEL_ID = process.env.BUFFER_INSTAGRAM_CHANNEL_ID
const BUFFER_FACEBOOK_PAGE_CHANNEL_ID = process.env.BUFFER_FACEBOOK_PAGE_CHANNEL_ID
const BUFFER_FACEBOOK_GROUP_CHANNEL_ID = process.env.BUFFER_FACEBOOK_GROUP_CHANNEL_ID

/**
 * Pick oldest drafted/approved instagram_post OR facebook_post and schedule to Buffer.
 *   - instagram_post  → all 3 channels (IG + FB Page + FB Group) [cross-post]
 *   - facebook_post   → FB channels only (Page + Group)
 * Buffer publishes at the optimal time per channel.
 *
 * Picks from both 'drafted' (auto-generated, not yet reviewed) and 'approved'
 * (admin manually approved). visual_status must be 'qc_passed' so we never
 * publish a post that failed quality checks.
 *
 * BATCH MODE (Phase B.11.1, May 19 2026): processes up to BATCH_SIZE posts
 * per run instead of 1. With a 30-min cron, this clears 40 approved posts
 * in ~4 hours instead of ~3 days.
 */
const BATCH_SIZE = 5

export async function runBufferPublisher(): Promise<Record<string, unknown>> {
  if (!isBufferConfigured()) {
    return {
      skipped: true,
      reason: 'Buffer not configured. Set BUFFER_ACCESS_TOKEN env var',
    }
  }

  if (!BUFFER_INSTAGRAM_CHANNEL_ID && !BUFFER_FACEBOOK_PAGE_CHANNEL_ID && !BUFFER_FACEBOOK_GROUP_CHANNEL_ID) {
    return {
      skipped: true,
      reason: 'No Buffer channel IDs configured. Set BUFFER_INSTAGRAM_CHANNEL_ID, BUFFER_FACEBOOK_PAGE_CHANNEL_ID, BUFFER_FACEBOOK_GROUP_CHANNEL_ID',
    }
  }

  // Pick oldest BATCH_SIZE drafted/approved posts of EITHER type that passed QC
  const { data: drafts } = await supabaseAdmin
    .from('content_calendar')
    .select('id, status, content_type, title, body, hashtags, cta, metadata, visual_status, image_url')
    .in('status', ['drafted', 'approved'])
    .in('content_type', ['instagram_post', 'facebook_post'])
    .eq('visual_status', 'qc_passed')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  type Draft = {
    id: string
    status: 'drafted' | 'approved'
    content_type: 'instagram_post' | 'facebook_post'
    title: string
    body: string
    hashtags: string[] | null
    cta: string | null
    metadata: Record<string, unknown> | null
    visual_status: string | null
    image_url: string | null
  }
  const draftList = (drafts ?? []) as Draft[]

  if (draftList.length === 0) {
    return { skipped: true, reason: 'no drafted/approved posts with qc_passed', processed: 0 }
  }

  const results: Array<Record<string, unknown>> = []

  for (const draft of draftList) {
    const result = await publishOne(draft)
    results.push(result)
  }

  return {
    batch: true,
    processed: results.length,
    succeeded: results.filter((r) => r.scheduled === true).length,
    failed: results.filter((r) => r.published === false).length,
    items: results,
  }
}

async function publishOne(draft: {
  id: string
  status: 'drafted' | 'approved'
  content_type: 'instagram_post' | 'facebook_post'
  title: string
  body: string
  hashtags: string[] | null
  cta: string | null
  metadata: Record<string, unknown> | null
  visual_status: string | null
  image_url: string | null
}): Promise<Record<string, unknown>> {

  // Route to channels based on content_type
  const channelIds: string[] = []
  if (draft.content_type === 'instagram_post') {
    // Cross-post to all 3 channels
    if (BUFFER_INSTAGRAM_CHANNEL_ID) channelIds.push(BUFFER_INSTAGRAM_CHANNEL_ID)
    if (BUFFER_FACEBOOK_PAGE_CHANNEL_ID) channelIds.push(BUFFER_FACEBOOK_PAGE_CHANNEL_ID)
    if (BUFFER_FACEBOOK_GROUP_CHANNEL_ID) channelIds.push(BUFFER_FACEBOOK_GROUP_CHANNEL_ID)
  } else {
    // facebook_post → FB channels only
    if (BUFFER_FACEBOOK_PAGE_CHANNEL_ID) channelIds.push(BUFFER_FACEBOOK_PAGE_CHANNEL_ID)
    if (BUFFER_FACEBOOK_GROUP_CHANNEL_ID) channelIds.push(BUFFER_FACEBOOK_GROUP_CHANNEL_ID)
  }

  if (channelIds.length === 0) {
    return {
      skipped: true,
      reason: `no Buffer channels available for ${draft.content_type}`,
      content_id: draft.id,
    }
  }

  // Pull listingId from metadata so generator uses the REAL listing photo
  const listingId = (draft.metadata?.listing_id as string | undefined) ?? undefined

  // Use existing image_url if present (admin-approved or previously generated).
  // Only regenerate if image is missing — saves API calls and respects manual
  // image curation done by Mohamed in /admin/ad-review.
  let finalImageUrl: string
  let imageSource: string

  if (draft.image_url && draft.image_url.startsWith('http')) {
    finalImageUrl = draft.image_url
    imageSource = 'existing'
  } else {
    const imageRes = await generateAndUploadImage({
      contentId: draft.id,
      title: draft.title,
      body: draft.body.slice(0, 400),
      contentType: 'instagram_post',
      hashtags: draft.hashtags ?? [],
      listingId,
    })

    if (!imageRes.ok || !imageRes.url) {
      await supabaseAdmin
        .from('content_calendar')
        .update({ status: 'image_failed' } as never)
        .eq('id', draft.id)
      return {
        published: false,
        content_id: draft.id,
        content_type: draft.content_type,
        stage: 'image_generation',
        error: imageRes.error,
      }
    }

    finalImageUrl = imageRes.url
    imageSource = imageRes.source
  }

  // Build full caption
  const hashtags = (draft.hashtags ?? []).join(' ')
  const fullCaption = [draft.body, draft.cta ?? '', hashtags]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 2200)

  // Send to Buffer (queues; Buffer auto-publishes at optimal time per channel)
  const result = await createBufferPost({
    channelIds,
    text: fullCaption,
    imageUrl: finalImageUrl,
    status: 'queued',
  })

  if (!result.ok) {
    await supabaseAdmin
      .from('content_calendar')
      .update({ status: 'publish_failed' } as never)
      .eq('id', draft.id)
    return {
      published: false,
      content_id: draft.id,
      content_type: draft.content_type,
      stage: 'buffer_post',
      error: result.error,
      channels_attempted: channelIds.length,
    }
  }

  // Mark as scheduled (Buffer will auto-publish later)
  await supabaseAdmin
    .from('content_calendar')
    .update({
      status: 'scheduled',
      external_post_id: result.post_id,
    } as never)
    .eq('id', draft.id)

  return {
    scheduled: true,
    previous_status: draft.status,
    content_id: draft.id,
    content_type: draft.content_type,
    title: draft.title,
    buffer_post_id: result.post_id,
    channels_count: channelIds.length,
    channels: channelIds,
    image_url: finalImageUrl,
    image_source: imageSource,
  }
}
