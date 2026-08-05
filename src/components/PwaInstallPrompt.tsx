'use client'

// ============================================================================
// PwaInstallPrompt (4 Aug 2026 — إصلاح 5 Aug 2026)
//
// بروبت «ثبّت التطبيق» — مكتبة @khmyznikov/pwa-install (Web Component).
//
// 🐞 اللي كان بيخلّيه «يخرف» قبل الإصلاح:
//   1. showDialog(true) بالعافية من غير فحص isInstallAvailable —
//      كان بيظهر حتى في متصفحات مش داعمة التثبيت وبيتجاوز ذاكرة الرفض.
//   2. الرفض ماكانش بيتسجل: كنا سامعين pwa-user-choice-result-event بس
//      (ده لبرومبت كروم الأصلي) — قفل الشيت نفسه مالوش إيفنت، فكان بيرجع
//      يظهر بعد 45 ثانية في كل زيارة. دلوقتي بنراقب isDialogHidden ونسجل.
//   3. الأيقونة كانت /icons/icon-192.png (404!) والصح /icon-192.png زي المانيفست.
//
// شروط الظهور: يدعم التثبيت فعلاً · مش متثبّت · مش /admin ·
// عدّى 45ث · مش اترفض آخر 14 يوم · مرة واحدة بحد أقصى في الجلسة.
// ============================================================================

import { useEffect } from 'react'
import { safeStorage } from '@/lib/safe-storage'

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@khmyznikov/pwa-install@0.6.2/dist/pwa-install.bundle.js'
const STORAGE_KEY = 'madmona_pwa_install_dismissed_at'
const SESSION_KEY = 'madmona_pwa_prompt_shown'
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
    if (typeof window === 'undefined') return
    if (window.location.pathname.startsWith('/admin')) return

    // متثبّت بالفعل؟
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // اترفض قريب؟
    const dismissedAt = safeStorage.get(STORAGE_KEY)
    if (dismissedAt) {
      const ageMs = Date.now() - Number(dismissedAt)
      if (ageMs < DISMISS_DAYS * 86_400_000) return
    }

    // اتعرض في الجلسة دي خلاص؟ (يمنع التكرار مع كل ريفرش/تنقل)
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return
    } catch { /* private mode */ }

    let cancelled = false
    let el: PWAInstallElement | null = null
    let watcher: ReturnType<typeof setInterval> | null = null

    const timer = setTimeout(async () => {
      if (cancelled) return

      if (!document.querySelector(`script[src="${CDN_URL}"]`)) {
        const s = document.createElement('script')
        s.src = CDN_URL
        s.type = 'module'
        s.async = true
        document.head.appendChild(s)
        await customElements.whenDefined('pwa-install').catch(() => {})
      }
      if (cancelled) return

      el = document.createElement('pwa-install') as PWAInstallElement
      el.setAttribute('name', 'مضمونة')
      el.setAttribute('description', 'سوق مصر المضمون على شاشتك الرئيسية')
      el.setAttribute('manifest-url', '/manifest.json')
      el.setAttribute('icon', '/icon-192.png')
      el.setAttribute('install-description', 'ثبّت مضمونة على جهازك — إشعارات فورية، بدون داونلود، وأسرع فتحة')
      el.setAttribute('use-local-storage', 'true')
      el.setAttribute('manual-apple', 'true')
      el.setAttribute('manual-chrome', 'true')
      document.body.appendChild(el)

      // مهلة صغيرة عشان العنصر يجهّز، وبعدها نظهر «بس» لو التثبيت متاح فعلاً
      setTimeout(() => {
        if (cancelled || !el) return
        if (el.isUnderStandaloneMode) return
        const canInstall =
          el.isInstallAvailable === true ||
          el.isAppleMobilePlatform === true ||
          el.isAppleDesktopPlatform === true
        if (!canInstall) return // متصفح مش داعم — ولا نعرض حاجة خالص

        try { el.showDialog() } catch { return }
        try { window.sessionStorage.setItem(SESSION_KEY, '1') } catch { /* ignore */ }

        // مراقبة القفل: أول ما الدايالوج يختفي (من غير تثبيت) نسجل الرفض 14 يوم
        let sawOpen = false
        watcher = setInterval(() => {
          if (!el) return
          if (!el.isDialogHidden) { sawOpen = true; return }
          if (sawOpen && el.isDialogHidden) {
            safeStorage.set(STORAGE_KEY, String(Date.now()))
            if (watcher) clearInterval(watcher)
          }
        }, 1500)
        // بطّل مراقبة بعد 5 دقايق مهما حصل
        setTimeout(() => { if (watcher) clearInterval(watcher) }, 300_000)
      }, 700)

      const onInstall = () => {
        // اتثبّت — ماتظهرش تاني لمدة سنة تقريبًا
        safeStorage.set(STORAGE_KEY, String(Date.now() + 351 * 86_400_000))
        if (watcher) clearInterval(watcher)
      }
      el.addEventListener('pwa-install-success-event', onInstall)
      // برومبت كروم الأصلي: لو اختار المستخدم (قبول/رفض) سجّل برضه
      el.addEventListener('pwa-user-choice-result-event', () => {
        safeStorage.set(STORAGE_KEY, String(Date.now()))
      })
    }, SHOW_AFTER_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (watcher) clearInterval(watcher)
      if (el && el.parentNode) el.parentNode.removeChild(el)
    }
  }, [])

  return null
}
