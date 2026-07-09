'use client'
// AutoResubscribe (6 Jul 2026) — إصلاح ذاتي صامت لاشتراكات البوش:
// لو الإذن granted والمستخدم مسجل دخول → يجدد الاشتراك تلقائيًا في الخلفية.
// مع فحص VAPID-rotation في subscribeToPush، ده بيصلح أي اشتراك قديم بمفتاح بايظ
// من غير أي تدخل من المستخدم. بيشتغل مرة كل 24 ساعة كحد أقصى.
import { useEffect } from 'react'
import { subscribeToPush } from '@/lib/push-subscription'
import { supabaseBrowser } from '@/lib/supabase-browser'

const STAMP = 'madmona_push_autofix_at'

export default function AutoResubscribe() {
  useEffect(() => {
    const run = async () => {
      try {
        if (typeof window === 'undefined') return
        if (!('Notification' in window) || !('serviceWorker' in navigator)) return
        if (Notification.permission !== 'granted') return

        // مرة كل 24 ساعة كفاية
        const last = Number(localStorage.getItem(STAMP) || 0)
        if (Date.now() - last < 24 * 3600 * 1000) return

        const { data } = await supabaseBrowser.auth.getSession()
        if (!data.session) return

        const res = await subscribeToPush()
        if (res.ok) localStorage.setItem(STAMP, String(Date.now()))
      } catch { /* silent */ }
    }
    // استنى شوية بعد التحميل عشان منزاحمش الصفحة
    const t = setTimeout(run, 4000)
    return () => clearTimeout(t)
  }, [])
  return null
}
