import webpush from 'web-push'

// ============================================================================
// Server-side web push helper
//
// Setup (one-time):
//   1. Run: npm run generate-vapid
//   2. Add to .env.local:
//        NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
//        VAPID_PRIVATE_KEY=...
//        VAPID_EMAIL=mailto:hello@madmonacairo.com
// ============================================================================

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:hello@madmonacairo.com'

let configured = false

function ensureConfigured() {
  if (configured) return true
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
  configured = true
  return true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  image?: string
  tag?: string
  data?: Record<string, unknown>
  requireInteraction?: boolean
}

export interface PushSubscriptionData {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Send a push notification to a single subscription.
 * Returns { ok: boolean, statusCode?, expired? }
 * `expired: true` means the subscription should be deleted.
 */
export async function sendPush(
  sub: PushSubscriptionData,
  payload: PushPayload
): Promise<{ ok: boolean; statusCode?: number; expired?: boolean; error?: string }> {
  if (!ensureConfigured()) {
    return { ok: false, error: 'VAPID keys not configured' }
  }

  try {
    const result = await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      {
        TTL: 24 * 60 * 60, // 24 hours
        urgency: 'normal',
      }
    )
    return { ok: true, statusCode: result.statusCode }
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string }
    const expired = e.statusCode === 404 || e.statusCode === 410
    return {
      ok: false,
      statusCode: e.statusCode,
      expired,
      error: e.message,
    }
  }
}

/**
 * Send a push to multiple subscriptions in parallel.
 * Returns the list of expired endpoints (which should be deleted from DB).
 */
export async function sendPushToMany(
  subs: PushSubscriptionData[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; expiredEndpoints: string[]; sentEndpoints: string[] }> {
  if (subs.length === 0) {
    return { sent: 0, failed: 0, expiredEndpoints: [], sentEndpoints: [] }
  }

  const results = await Promise.allSettled(subs.map((s) => sendPush(s, payload)))

  let sent = 0
  let failed = 0
  const expiredEndpoints: string[] = []
  const sentEndpoints: string[] = []

  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value.ok) {
        sent++
        sentEndpoints.push(subs[i].endpoint)
      } else {
        failed++
        if (r.value.expired) {
          expiredEndpoints.push(subs[i].endpoint)
        }
      }
    } else {
      failed++
    }
  })

  return { sent, failed, expiredEndpoints, sentEndpoints }
}

export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC && VAPID_PRIVATE)
}
