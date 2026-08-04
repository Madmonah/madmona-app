'use client'

// ============================================================================
// PwaInstallPrompt (4 Aug 2026)
//
// بروبت «ثبّت التطبيق» — بيستخدم مكتبة @khmyznikov/pwa-install (Web Component,
// 852⭐، MIT، بتدعم العربي أصلاً + iOS Safari اللي مالوش install prompt أصلي).
//
// الهدف: يوزر يثبّت PWA = مشترك بوش دائم + أيقونة على الهوم سكرين +
// تجربة app-like. عندنا 24 مشترك بوش من 306 يوزر — ركّبنا ده = القفزة تبدأ.
//
// شروط الظهور (كلها لازم تتحقق):
//   - المتصفح يدعم PWA install
//   - مش متثبّت (display-mode: standalone) بالفعل
//   - المستخدم مش على /admin/*
//   - عدّى 45 ثانية على أول زيارة (مش أول ما يفتح)
//   - مش اترفض في آخر 14 يوم
// ============================================================================

import { useEffect } from 'react'
import { safeStorage } from '@/lib/safe-storage'

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@khmyznikov/pwa-install@0.6.2/dist/pwa-install.bundle.js'
const STORAGE_KEY = 'madmona_pwa_install_dismissed_at'
const DISMISS_DAYS = 14
const SHOW_AFTER_MS = 45_000

interface PWAInstallElement extends HTMLElement {
  showDialog: (force?: boolean) => void
  hideDialog: () => void
  isDialogHidden: boolean
  isInstallAvailable: boolean
  isAppleMobilePlatform: boolean
  isAppleDesktopPlatform: boolean
  isUnderStandaloneMode: boolean
}

export default function PwaInstallPrompt() {
  useEffect(() => {
    // Skip on admin routes
    if (typeof window === 'undefined') return
    if (window.location.pathname.startsWith('/admin')) return

    // Skip if already installed (running in standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // Skip if dismissed recently
    const dismissedAt = safeStorage.get(STORAGE_KEY)
    if (dismissedAt) {
      const ageMs = Date.now() - Number(dismissedAt)
      if (ageMs < DISMISS_DAYS * 86_400_000) return
    }

    let cancelled = false
    let el: PWAInstallElement | null = null

    // Dynamically load the web component script only after we know we want to show it
    const timer = setTimeout(async () => {
      if (cancelled) return

      // Inject the script tag once
      if (!document.querySelector(`script[src="${CDN_URL}"]`)) {
        const s = document.createElement('script')
        s.src = CDN_URL
        s.type = 'module'
        s.async = true
        document.head.appendChild(s)
        // Wait for the custom element to be defined
        await customElements.whenDefined('pwa-install').catch(() => {})
      }

      if (cancelled) return

      // Create the element and mount to body
      el = document.createElement('pwa-install') as PWAInstallElement
      el.setAttribute('name', 'مضمونة')
      el.setAttribute('description', 'سوق مصر المضمون على شاشتك الرئيسية')
      el.setAttribute('manifest-url', '/manifest.json')
      el.setAttribute('icon', 'https://www.madmonacairo.com/icons/icon-192.png')
      el.setAttribute('install-description', 'ثبّت مضمونة على جهازك — إشعارات فورية، بدون داونلود، وأسرع فتحة')
      el.setAttribute('use-local-storage', 'true')
      el.setAttribute('disable-install-description', 'false')
      // Manual show — we control timing via SHOW_AFTER_MS
      el.setAttribute('manual-apple', 'true')
      el.setAttribute('manual-chrome', 'true')
      document.body.appendChild(el)

      // Trigger show after a tick to let the element bind
      setTimeout(() => {
        if (cancelled || !el) return
        if (el.isUnderStandaloneMode) return
        try {
          el.showDialog(true)
        } catch {
          // element not ready — skip silently
        }
      }, 400)

      // Listen for dismissal to persist to storage
      const onCancel = () => {
        safeStorage.set(STORAGE_KEY, String(Date.now()))
      }
      const onInstall = () => {
        safeStorage.set(STORAGE_KEY, String(Date.now() + 365 * 86_400_000))
      }
      el.addEventListener('pwa-user-choice-result-event', onCancel)
      el.addEventListener('pwa-install-success-event', onInstall)
      el.addEventListener('pwa-install-available-event', () => {
        // element ready — nothing to do (we manual-showed above)
      })
    }, SHOW_AFTER_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (el && el.parentNode) {
        el.parentNode.removeChild(el)
      }
    }
  }, [])

  return null
}
