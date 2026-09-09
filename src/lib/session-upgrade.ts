'use client'
// ============================================================================
// 🚪🚪 ensureSupabaseSession — «معاك توكن بس؟ نفتحلك الباب التاني لوحدنا»
//
// (٩/٩/٢٠٢٦) محمد: «حساب محمد… مش ظاهر بالشكل الصح ولا تاب شغلي ظاهر عنده
//   صح… مش عارف بيسجل دخول إزاي». الجهاز اللي داخل بـmadmona_token بس (باب
//   واحد) كان بيشوف «سجّل دخولك» في شغلي وحسابي رغم إنه داخل. بدل ما نقوله
//   «اعمل خروج وادخل»: لو مفيش جلسة Supabase وفيه توكن صالح → /api/auth/upgrade
//   → verifyOtp → الجلسة اتفتحت في نفس الشاشة. بتتجرّب مرة واحدة كل دقيقة
//   عشان ماتلفّش لو الرقم مالوش مستخدم Supabase أصلًا.
//
//   أي شاشة بتحتاج auth.uid() (شغلي · حسابي · RLS) تنادي دي بدل getSession.
// ============================================================================
import type { Session } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { safeStorage } from '@/lib/safe-storage'
import { getSessionSafe } from '@/lib/session-safe'

let lastAttemptAt = 0
let inflight: Promise<Session | null> | null = null

export async function ensureSupabaseSession(ms = 4000): Promise<Session | null> {
  const s = await getSessionSafe(ms)
  if (s?.user) return s
  const token = typeof window !== 'undefined' ? safeStorage.get('madmona_token') : null
  if (!token) return null
  if (inflight) return inflight
  if (Date.now() - lastAttemptAt < 60_000) return null
  lastAttemptAt = Date.now()
  inflight = (async () => {
    try {
      const r = await fetch('/api/auth/upgrade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const j = await r.json().catch(() => null)
      if (r.status === 401 && j?.error === 'invalid_token') {
        // التوكن نفسه باطل — نشيله عشان الشاشات ماتفضلش فاكراه داخل
        safeStorage.remove('madmona_token')
        return null
      }
      if (!r.ok || !j?.token_hash) return null
      const { error } = await supabaseBrowser.auth.verifyOtp({ type: 'email', token_hash: j.token_hash })
      if (error) { console.error('[session-upgrade] verifyOtp failed:', error.status, error.message); return null }
      return await getSessionSafe(ms)
    } catch (e) {
      console.error('[session-upgrade] failed:', e)
      return null
    } finally { inflight = null }
  })()
  return inflight
}
