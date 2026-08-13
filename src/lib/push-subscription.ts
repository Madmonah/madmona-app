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

    // VAPID rotation fix (6 Jul 2026): لو الاشتراك القديم متسجل بمفتاح مختلف
    // عن المفتاح الحالي، لازم نفكّه ونشترك من جديد — وإلا كل الإشعارات بترجع 403.
    if (subscription) {
      // 🐛 (١٣ أغسطس ٢٠٢٦) نمسك مرجع ثابت مش-null. جوه الـtry ممكن نعمل
      // `subscription = null`، وساعتها لو رمى أي سطر بعدها كان الـcatch
      // بينده `subscription.unsubscribe()` على null ويرمي TypeError
      // **جوه معالج الأخطاء نفسه** — فيتحول فشل بسيط لكراش.
      const existing = subscription
      try {
        const currentKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        const existingKey = existing.options?.applicationServerKey
          ? new Uint8Array(existing.options.applicationServerKey as ArrayBuffer)
          : null
        const sameKey = !!existingKey
          && existingKey.length === currentKey.length
          && existingKey.every((b, i) => b === currentKey[i])
        if (!sameKey) {
          await existing.unsubscribe()
          subscription = null
        }
      } catch {
        // لو معرفناش نقارن — الأمان إننا نجدد الاشتراك
        try { await existing.unsubscribe() } catch { /* ignore */ }
        subscription = null
      }
    }

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

    // Inform server — 🔒 (١٢ أغسطس ٢٠٢٦) المسار بقى محتاج Bearer
    // وبيمسح صفوف صاحب التوكن بس. لو مفيش سيشن بنكتفي بالإلغاء المحلي —
    // الصف اليتيم بيتنضف تلقائيًا أول ما إرسال ليه يفشل بـ410.
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (session?.access_token) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ endpoint }),
      })
    }

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
// النوع مربوط بـ`ArrayBuffer` صراحةً: TS الحديث بيعمم `Uint8Array` على نوع
// الـbuffer (`Uint8Array<ArrayBufferLike>`)، و`BufferSource` اللي
// `pushManager.subscribe` بيطلبه مابيقبلش الشكل المعمّم ده.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
