'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Loader2, Sparkles, CheckCircle } from 'lucide-react'
import {
  isPushSupported,
  getNotificationPermission,
  isSubscribed,
  subscribeToPush,
} from '@/lib/push-subscription'
import { supabaseBrowser } from '@/lib/supabase-browser'

// ============================================================================
// NotificationPrompt
//
// Smart bottom sheet that asks users to enable push notifications at the
// right moment — without being annoying.
//
// Show conditions (ALL must be true):
//   - Push API is supported
//   - User is authenticated (we don't ask anonymous users)
//   - User has NOT subscribed yet
//   - Permission state is 'default' (not 'denied')
//   - User has NOT dismissed in the last 7 days
//   - User has been on the site for at least 25 seconds
//
// Hidden conditions:
//   - Already subscribed
//   - Permission denied (browser blocked it)
//   - Recently dismissed (< 7 days ago)
//   - On /admin/* pages (not the audience for this)
// ============================================================================

const STORAGE_KEY = 'madmona_notif_prompt_dismissed_at'
const DISMISS_DAYS = 7
const SHOW_AFTER_MS = 25_000  // 25 seconds

type Stage = 'hidden' | 'visible' | 'success' | 'busy'

export default function NotificationPrompt() {
  const [stage, setStage] = useState<Stage>('hidden')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const init = async () => {
      // 1. Check support
      if (!isPushSupported()) return

      // 2. Skip on admin pages
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return

      // 3. Check permission state
      const perm = getNotificationPermission()
      if (perm === 'denied' || perm === 'granted') return

      // 4. Check authentication — only ask logged-in users
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) return

      // 5. Check if already subscribed
      const subscribed = await isSubscribed()
      if (subscribed) return

      // 6. Check dismissal cooldown
      try {
        const dismissedAt = localStorage.getItem(STORAGE_KEY)
        if (dismissedAt) {
          const ts = parseInt(dismissedAt, 10)
          if (!isNaN(ts)) {
            const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24)
            if (ageDays < DISMISS_DAYS) return
          }
        }
      } catch (e) {
        // localStorage unavailable — proceed to show
      }

      // 7. Wait before showing (give them time to look around)
      timer = setTimeout(() => {
        if (!cancelled) setStage('visible')
      }, SHOW_AFTER_MS)
    }

    init()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  const handleEnable = async () => {
    setStage('busy')
    setErrorMsg(null)
    const result = await subscribeToPush()
    if (result.ok) {
      setStage('success')
      // Auto-hide after 2.5s
      setTimeout(() => setStage('hidden'), 2500)
    } else {
      setErrorMsg(result.error || 'حصل خطأ')
      // If permission was denied during the prompt, hide immediately
      if (getNotificationPermission() === 'denied') {
        setStage('hidden')
      } else {
        setStage('visible')
      }
    }
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    } catch (e) {
      // Ignore
    }
    setStage('hidden')
  }

  if (stage === 'hidden') return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={handleDismiss}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-3xl shadow-2xl animate-slide-up"
        dir="rtl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-md mx-auto p-6">
          {/* Drag handle */}
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />

          {stage === 'success' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-[#1F5F3F]/10 rounded-3xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-[#1F5F3F]" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">
                تم التفعيل بنجاح! 🎉
              </h2>
              <p className="text-sm text-gray-600">
                هتوصلك أحدث العروض والحجوزات
              </p>
            </div>
          ) : (
            <>
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>

              {/* Icon + sparkles */}
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1F5F3F] to-[#2d7a52] rounded-3xl flex items-center justify-center shadow-lg">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-[#B8860B] animate-pulse" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-black text-gray-900 mb-2 leading-tight">
                متفوّتش العروض الحلوة! 🔔
              </h2>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                فعّل الإشعارات وأنت أول واحد يعرف عن:
              </p>

              {/* Benefits list */}
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2.5 text-sm text-gray-700">
                  <div className="w-5 h-5 bg-[#1F5F3F]/10 text-[#1F5F3F] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>تأكيد الحجوزات وتحديثاتها فوراً</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-gray-700">
                  <div className="w-5 h-5 bg-[#B8860B]/10 text-[#B8860B] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>عروض حصرية لفترة محدودة</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-gray-700">
                  <div className="w-5 h-5 bg-[#C2410C]/10 text-[#C2410C] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">✓</span>
                  </div>
                  <span>منتجات وخدمات جديدة على المنصة</span>
                </li>
              </ul>

              {/* Error message */}
              {errorMsg && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleEnable}
                  disabled={stage === 'busy'}
                  className="w-full bg-gradient-to-l from-[#1F5F3F] to-[#2d7a52] text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {stage === 'busy' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري التفعيل...
                    </>
                  ) : (
                    <>
                      <Bell className="w-5 h-5" />
                      فعّل الإشعارات
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismiss}
                  disabled={stage === 'busy'}
                  className="w-full text-sm text-gray-500 font-bold py-2 hover:text-gray-700 disabled:opacity-50 transition-colors"
                >
                  مش دلوقتي
                </button>
              </div>

              {/* Privacy note */}
              <p className="text-[10px] text-center text-gray-400 mt-4 leading-relaxed">
                🔒 خصوصيتك مهمة عندنا — تقدر توقف الإشعارات في أي وقت من حسابك
              </p>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        :global(.animate-fade-in) {
          animation: fade-in 0.2s ease-out;
        }
        :global(.animate-slide-up) {
          animation: slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </>
  )
}
