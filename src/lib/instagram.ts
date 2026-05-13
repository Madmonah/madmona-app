// src/lib/instagram.ts
// Instagram Graph API publisher

import { supabase as supabaseAdmin } from './supabase'

const IG_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
const IG_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN
const IG_VERSION = process.env.INSTAGRAM_API_VERSION ?? 'v21.0'
const IG_BASE = `https://graph.facebook.com/${IG_VERSION}`

export function isInstagramConfigured(): boolean {
  return !!(IG_ACCOUNT_ID && IG_TOKEN)
}

export interface PublishResult {
  ok: boolean
  ig_post_id?: string
  permalink?: string
  error?: string
}

async function createMediaContainer(
  imageUrl: string,
  caption: string
): Promise<{ ok: boolean; container_id?: string; error?: string }> {
  try {
    const res = await fetch(`${IG_BASE}/${IG_ACCOUNT_ID}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: IG_TOKEN,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, container_id: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}

// REELS need media_type=REELS + video_url. Container takes longer to be ready (video processing).
async function createReelContainer(
  videoUrl: string,
  caption: string
): Promise<{ ok: boolean; container_id?: string; error?: string }> {
  try {
    const res = await fetch(`${IG_BASE}/${IG_ACCOUNT_ID}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: IG_TOKEN,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, container_id: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}

async function waitForContainer(containerId: string, maxMs: number = 30000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const res = await fetch(
      `${IG_BASE}/${containerId}?fields=status_code&access_token=${IG_TOKEN}`
    )
    const data = await res.json()
    if (data.status_code === 'FINISHED') return true
    if (data.status_code === 'ERROR') return false
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}

async function publishContainer(containerId: string): Promise<PublishResult> {
  try {
    const res = await fetch(`${IG_BASE}/${IG_ACCOUNT_ID}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: IG_TOKEN,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, ig_post_id: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}

export async function publishToInstagram(args: {
  imageUrl: string
  caption: string
  contentCalendarId?: string
}): Promise<PublishResult> {
  if (!isInstagramConfigured()) {
    return { ok: false, error: 'Instagram env vars missing' }
  }

  const c = await createMediaContainer(args.imageUrl, args.caption)
  if (!c.ok || !c.container_id) return { ok: false, error: c.error }

  const ready = await waitForContainer(c.container_id)
  if (!ready) return { ok: false, error: 'Container not ready in 30s' }

  const result = await publishContainer(c.container_id)

  if (result.ok && args.contentCalendarId) {
    await supabaseAdmin
      .from('content_calendar')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        external_post_id: result.ig_post_id,
      } as never)
      .eq('id', args.contentCalendarId)
  }

  return result
}

// Publish a Reel (video). Caller is responsible for updating the source table.
// Video processing on Instagram side can take up to ~60s for 20-30s reels.
export async function publishReelToInstagram(args: {
  videoUrl: string
  caption: string
}): Promise<PublishResult> {
  if (!isInstagramConfigured()) {
    return { ok: false, error: 'Instagram env vars missing' }
  }

  const c = await createReelContainer(args.videoUrl, args.caption)
  if (!c.ok || !c.container_id) return { ok: false, error: c.error }

  // Reels need more time than photos (video transcoding on IG side).
  const ready = await waitForContainer(c.container_id, 120000)
  if (!ready) return { ok: false, error: 'Reel container not ready in 120s (likely video processing failed)' }

  return publishContainer(c.container_id)
}
