'use client'

import { safeStorage } from '@/lib/safe-storage'
// AutoResubscribe (6 Jul 2026, updated 26 Jul) — إصلاح ذاتي صامت لاشتراكات البوش:
// لو الإذن granted والمستخدم مسجل دخول → يجدد الاشتراك تلقائيًا في الخلفية.
// مع فحص VAPID-rotation في subscribeToPush، ده بيصلح أي اشتراك قديم بمفتاح بايظ
// من غير أي تدخل من المستخدم.
// تحديث 26/07: لو المفتاح المخزّن في الاشتراك مختلف عن المفتاح الحالي، بيصلّح
// فورًا (يتخطى مهلة الـ24 ساعة) — عشان تغيير المفتاح يتصحّح لحظيًا مش بعد يوم.
import { useEffect } from 'react'
import { subscribeToPush } from '@/lib/push-subscription'
import { supabaseBrowser } from '@/lib/supabase-browser'

const STAMP = 'madmona_push_autofix_at'
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function b64ToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export default function AutoResubscribe() {
  useEffect(() => {
    const run = async () => {
      try {
        if (typeof window === 'undefined') return
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return
        if (Notification.permission !== 'granted') return

        const { data } = await supabaseBrowser.auth.getSession()
        if (!data.session) return

        // فحص تطابق المفتاح: لو الاشتراك الحالي بمفتاح مختلف عن الحالي → صلّح فورًا
        let keyMismatch = false
        try {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          if (sub && VAPID_PUBLIC) {
            const cur = b64ToBytes(VAPID_PUBLIC)
            const existing = sub.options?.applicationServerKey
              ? new Uint8Array(sub.options.applicationServerKey as ArrayBuffer)
              : null
            keyMismatch = !existing || existing.length !== cur.length
              || !existing.every((b, i) => b === cur[i])
          } else if (!sub) {
            // مفيش اشتراك أصلاً (مثلاً اتمسح) → اعمل واحد جديد
            keyMismatch = true
          }
        } catch { keyMismatch = true }

        // مرة كل 24 ساعة كفاية — إلا لو المفتاح مختلف (ساعتها صلّح فورًا)
        if (!keyMismatch) {
          const last = Number(safeStorage.get(STAMP) || 0)
          if (Date.now() - last < 24 * 3600 * 1000) return
        }

        const res = await subscribeToPush()
        if (res.ok) safeStorage.set(STAMP, String(Date.now()))
      } catch { /* silent */ }
    }
    // استنى شوية بعد التحميل عشان منزاحمش الصفحة
    const t = setTimeout(run, 4000)
    return () => clearTimeout(t)
  }, [])
  return null
}
