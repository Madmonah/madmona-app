// ============================================================
// Notification sound helper.
// Uses Web Audio API to generate a gentle "ping" without needing an audio file.
// ============================================================

let cachedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (cachedAudioContext) return cachedAudioContext
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext)
    if (!Ctx) return null
    cachedAudioContext = new Ctx()
    return cachedAudioContext
  } catch {
    return null
  }
}

/**
 * Play a gentle two-tone notification chime (perfect fifth: 880Hz → 660Hz).
 */
export function playNotificationSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  const now = ctx.currentTime
  playTone(880, now, 0.3, 0.2)        // A5
  playTone(660, now + 0.15, 0.4, 0.15) // E5
}

/**
 * Show a browser notification (requires permission).
 */
export async function showBrowserNotification(title: string, body: string, url?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'madmona-booking',
    })
    if (url) {
      notification.onclick = () => {
        window.focus()
        window.location.href = url
        notification.close()
      }
    }
  }
}

/**
 * Request notification permission (call this on user interaction).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}
