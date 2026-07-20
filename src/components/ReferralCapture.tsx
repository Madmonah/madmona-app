import { safeStorage } from '@/lib/safe-storage'
'use client'
// ReferralCapture — «شير واكسب»: يلتقط ?ref= من أي صفحة ويخزنه، وأول ما المستخدم يسجل دخول
// بيربط الإحالة مرة واحدة عبر /api/referral/apply. (6 Jul 2026)
import { useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

const KEY = 'madmona_ref'
const DONE = 'madmona_ref_applied'

export default function ReferralCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const ref = (url.searchParams.get('ref') || '').trim().toUpperCase()
      if (ref && /^[A-Z0-9]{4,12}$/.test(ref) && !safeStorage.get(DONE)) {
        safeStorage.set(KEY, ref)
      }
    } catch { /* ignore */ }

    const stored = safeStorage.get(KEY)
    if (!stored || safeStorage.get(DONE)) return

    supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token
      if (!token) return
      try {
        const r = await fetch('/api/referral/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code: stored }),
        })
        const j = await r.json().catch(() => ({}))
        if (r.ok && (j.ok || j.already)) {
          safeStorage.set(DONE, '1')
          safeStorage.remove(KEY)
        }
      } catch { /* retry next visit */ }
    })
  }, [])
  return null
}
