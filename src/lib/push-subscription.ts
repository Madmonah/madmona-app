import { supabaseBrowser } from './supabase-browser'

// ============================================================================
// Browser push subscription helpers
// ============================================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/**
 * Request permission and subscribe to push notifications.
 * Returns true if successfully subscribed (or already was).
 */
export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: 'الإشعارات مش مدعومة في المتصفح ده' }
  }

  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, error: 'الإشعارات مش مفعّلة دلوقتي' }
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { ok: false, error: 'مكنش في إذن للإشعارات' }
    }

    // Get or wait for service worker
    const registration = await navigator.serviceWorker.ready

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Create a new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    // Get auth token to authenticate the API call
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.access_token) {
      return { ok: false, error: 'لازم تسجّل دخول الأول' }
    }

    // Send subscription to server
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: data.error || 'فشل التسجيل' }
    }

    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return { ok: false, error: msg }
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return { ok: true }
    }

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    // Inform server
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })

    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return { ok: false, error: msg }
  }
}

/**
 * Check if user is currently subscribed (locally — not server).
 */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

// Helper: convert base64 URL-safe string to Uint8Array (required by pushManager.subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
