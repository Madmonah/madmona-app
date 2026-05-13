// src/lib/agent-runners/auto-publisher.ts
// Auto-publisher: takes drafted Instagram posts, generates images, publishes to IG

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { generateAndUploadImage } from '@/lib/image-generator'
import { publishToInstagram, isInstagramConfigured } from '@/lib/instagram'

/**
 * Process oldest drafted instagram_post.
 * 1. Generate branded image from title + body
 * 2. Upload to Supabase Storage  
 * 3. Publish to Instagram
 * 4. Update content_calendar status
 */
export async function runAutoPublisher(): Promise<Record<string, unknown>> {
  if (!isInstagramConfigured()) {
    return {
      skipped: true,
      reason: 'Instagram env vars missing (INSTAGRAM_BUSINESS_ACCOUNT_ID, INSTAGRAM_PAGE_ACCESS_TOKEN)',
    }
  }

  // Pick oldest drafted post (only single posts, not carousels for now)
  const { data: drafts } = await supabaseAdmin
    .from('content_calendar')
    .select('id, content_type, title, body, hashtags, cta, metadata')
    .eq('status', 'drafted')
    .eq('content_type', 'instagram_post')
    .order('created_at', { ascending: true })
    .limit(1)

  type Draft = {
    id: string
    content_type: string
    title: string
    body: string
    hashtags: string[] | null
    cta: string | null
    metadata: Record<string, unknown> | null
  }
  const draft = ((drafts ?? []) as Draft[])[0]

  if (!draft) {
    return { skipped: true, reason: 'no drafted instagram_post entries' }
  }

  // Pull listingId from metadata so generator uses the REAL listing photo
  const listingId = (draft.metadata?.listing_id as string | undefined) ?? undefined

  // Step 1: Generate image
  const imageRes = await generateAndUploadImage({
    contentId: draft.id,
    title: draft.title,
    body: draft.body.slice(0, 400), // body for image overlay
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
      stage: 'image_generation',
      error: imageRes.error,
    }
  }

  // Step 2: Build full caption
  const hashtags = (draft.hashtags ?? []).join(' ')
  const fullCaption = [draft.body, draft.cta ?? '', hashtags]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 2200) // IG caption max

  // Step 3: Publish to Instagram
  const publishRes = await publishToInstagram({
    imageUrl: imageRes.url,
    caption: fullCaption,
    contentCalendarId: draft.id,
  })

  if (!publishRes.ok) {
    await supabaseAdmin
      .from('content_calendar')
      .update({ status: 'publish_failed' } as never)
      .eq('id', draft.id)
    return {
      published: false,
      content_id: draft.id,
      stage: 'instagram_publish',
      error: publishRes.error,
    }
  }

  return {
    published: true,
    content_id: draft.id,
    title: draft.title,
    ig_post_id: publishRes.ig_post_id,
    image_url: imageRes.url,
  }
}
