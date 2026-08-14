'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

// ============================================================
// InstallPWA — banner + button that uses the browser's
// `beforeinstallprompt` event to let users install Madmona to
// their home screen.
//
// Behavior:
//   - On Android Chrome / Edge / Samsung Internet: shows a
//     dismissible banner that triggers the native install dialog
//     when tapped.
//   - On iOS Safari: shows a manual instruction tooltip (iOS
//     doesn't expose `beforeinstallprompt` so users have to use
//     the Share → Add to Home Screen menu).
//   - Hides itself if already installed (display-mode: standalone)
//     or after the user dismisses (remembers via sessionStorage
//     so it returns next visit but not annoyingly within a session).
// ============================================================

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWA() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showIOSTip, setShowIOSTip] = useState(false)

  useEffect(() => {
    // Detect iOS Safari (which doesn't fire beforeinstallprompt)
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua) && !/crios|fxios|edgios/.test(ua)
    setIsIOS(ios)

    // Detect if already installed
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - safari only
      window.navigator.standalone === true
    setIsStandalone(standalone)

    // Check session-level dismissal
    if (typeof window !== 'undefined') {
      const wasDismissed = sessionStorage.getItem('madmona-install-dismissed') === '1'
      setDismissed(wasDismissed)
    }

    // Capture the install event for Android/Chrome (+ read early-captured one)
    // @ts-expect-error - global stash set by ServiceWorkerRegister early capture
    if (window.__mdmInstallEvent) {
      // @ts-expect-error
      setInstallEvent(window.__mdmInstallEvent as InstallPromptEvent)
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as InstallPromptEvent)
      // @ts-expect-error
      window.__mdmInstallEvent = e
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Hide after successful install
    const installedHandler = () => {
      setInstallEvent(null)
      setIsStandalone(true)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (installEvent) {
      try {
        await installEvent.prompt()
        const result = await installEvent.userChoice
        if (result.outcome === 'accepted') {
          setInstallEvent(null)
        }
      } catch (err) {
        console.error('Install prompt error:', err)
      }
    } else if (isIOS) {
      setShowIOSTip(true)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('madmona-install-dismissed', '1')
    }
  }

  // Don't show if already installed or dismissed this session
  if (isStandalone || dismissed) return null

  // Don't show if no install event AND not iOS (e.g. desktop where PWA isn't typical)
  if (!installEvent && !isIOS) return null

  return (
    <>
      {/* Compact banner — sits above content on home page */}
      <div className="bg-gradient-to-r from-[#34D399] to-[#2a7a52] rounded-2xl p-4 mb-6 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm leading-tight">حمّل تطبيق مضمونة · Install Madmona</p>
          <p className="text-white/80 text-xs mt-0.5">احجز أسرع · يشتغل أوفلاين · Faster booking, works offline</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-white text-[#059669] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-white/90 flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          تثبيت · Install
        </button>
        <button
          onClick={handleDismiss}
          className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center flex-shrink-0 text-white/70"
          aria-label="إخفاء"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* iOS instructions tooltip */}
      {showIOSTip && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIOSTip(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#34D399]/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#059669]" />
              </div>
              <div>
                <p className="font-bold text-gray-900">تثبيت على الآيفون · Install on iPhone</p>
                <p className="text-xs text-gray-500">٣ خطوات · 3 easy steps</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-gray-700 mb-5">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#34D399]/10 text-[#059669] flex items-center justify-center text-xs font-bold flex-shrink-0">١</span>
                <span>اضغط زرار المشاركة <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-xs">⬆︎</span> · Tap the Share button</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#34D399]/10 text-[#059669] flex items-center justify-center text-xs font-bold flex-shrink-0">٢</span>
                <span>اختر &quot;إضافة إلى الشاشة الرئيسية&quot; · Add to Home Screen</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#34D399]/10 text-[#059669] flex items-center justify-center text-xs font-bold flex-shrink-0">٣</span>
                <span>اضغط &quot;إضافة&quot; · Tap Add — done!</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSTip(false)}
              className="w-full bg-[#34D399] text-[#04352A] py-3 rounded-xl font-bold"
            >
              تمام · Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
