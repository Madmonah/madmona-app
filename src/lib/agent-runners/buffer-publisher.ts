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

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { generateAndUploadImage } from '@/lib/image-generator'
import { createBufferPost, isBufferConfigured } from '@/lib/buffer'

const BUFFER_INSTAGRAM_CHANNEL_ID = process.env.BUFFER_INSTAGRAM_CHANNEL_ID
const BUFFER_FACEBOOK_PAGE_CHANNEL_ID = process.env.BUFFER_FACEBOOK_PAGE_CHANNEL_ID
const BUFFER_FACEBOOK_GROUP_CHANNEL_ID = process.env.BUFFER_FACEBOOK_GROUP_CHANNEL_ID

/**
 * Pick oldest drafted instagram_post OR facebook_post and schedule to Buffer.
 *   - instagram_post  → all 3 channels (IG + FB Page + FB Group) [cross-post]
 *   - facebook_post   → FB channels only (Page + Group)
 * Buffer publishes at the optimal time per channel.
 */
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

  // Pick oldest drafted post of EITHER type
  const { data: drafts } = await supabaseAdmin
    .from('content_calendar')
    .select('id, content_type, title, body, hashtags, cta, metadata')
    .eq('status', 'drafted')
    .in('content_type', ['instagram_post', 'facebook_post'])
    .order('created_at', { ascending: true })
    .limit(1)

  type Draft = {
    id: string
    content_type: 'instagram_post' | 'facebook_post'
    title: string
    body: string
    hashtags: string[] | null
    cta: string | null
    metadata: Record<string, unknown> | null
  }
  const draft = ((drafts ?? []) as Draft[])[0]

  if (!draft) {
    return { skipped: true, reason: 'no drafted instagram_post or facebook_post entries' }
  }

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

  // Generate branded image
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
    imageUrl: imageRes.url,
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
    content_id: draft.id,
    content_type: draft.content_type,
    title: draft.title,
    buffer_post_id: result.post_id,
    channels_count: channelIds.length,
    channels: channelIds,
    image_url: imageRes.url,
    image_source: imageRes.source,
  }
}
