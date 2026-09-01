'use client'

import { useEffect } from 'react'

// Registers the Madmona service worker on first page load. Runs only in
// the browser (the file is a client component) and only when serviceWorker
// is supported. Errors are logged but don't break the app — PWA install
// still works as long as the manifest + HTTPS + icons are present.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // التقاط beforeinstallprompt بدري (بيطير مرة واحدة وممكن يسبق زرار التحميل).
    // بنخزّنه في متغير عام عشان DownloadAppBig يقراه مهما اتحمّل متأخر.
    const early = (e: Event) => {
      e.preventDefault()
      // @ts-expect-error - global stash consumed by DownloadAppBig
      window.__mdmInstallEvent = e
    }
    window.addEventListener('beforeinstallprompt', early)
    const clearOnInstall = () => {
      // @ts-expect-error
      window.__mdmInstallEvent = null
    }
    window.addEventListener('appinstalled', clearOnInstall)

    if (!('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('beforeinstallprompt', early)
        window.removeEventListener('appinstalled', clearOnInstall)
      }
    }

    // ========================================================================
    // 🔄 (٢٠ أغسطس ٢٠٢٦) فرض النسخة الجديدة على أي تاب مفتوح.
    //
    // المشكلة اللي حصلت فعليًا: بعد ما ننشر إصلاح، الناس اللي تابهم مفتوح من
    // قبل النشر بيفضلوا شغالين بالكود القديم من غير ما يعرفوا — حتى لو الـSW
    // اتحدّث. حصل مع صفحة الدخول: محمد وأحمد فضلوا شايفين نسخة قديمة بترفض
    // الإيميل **قبل ما تبعت أي طلب للسيرفر**، وسجل المصادقة مكانش فيه ولا
    // محاولة واحدة منهم. محمد: «انا مش عايز حلول مؤقته».
    //
    // الحل: الـSW بيبعت SW_UPDATED أول ما نسخة جديدة تشتغل، والصفحة بتعمل
    // reload **لوحدها** — بس بأمان: مش وسط ما المستخدم بيكتب في فورم، ومش
    // أكتر من مرة.
    // ========================================================================
    let reloaded = false
    const isUserBusy = () => {
      const el = document.activeElement as HTMLElement | null
      if (!el) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (el.isContentEditable) return true
      return false
    }

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'SW_UPDATED' || reloaded) return
      const doReload = () => {
        if (reloaded) return
        // ماتقاطعش المستخدم وهو بيكتب — استنى لحد ما يخلّص
        if (isUserBusy()) { setTimeout(doReload, 3000); return }
        reloaded = true
        console.info('[sw] نسخة جديدة اشتغلت — إعادة تحميل الصفحة')
        window.location.reload()
      }
      doReload()
    }
    navigator.serviceWorker.addEventListener('message', onSwMessage)

    // Register after window load to not compete with critical rendering
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // دوّر على تحديث فورًا، وكل ساعة للتابات اللي بتفضل مفتوحة طويل
          reg.update().catch(() => {})
          setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
        // 📱 (١ سبتمبر ٢٠٢٦) محمد: «مش شايف أي إضافة على الموبايل».
        //    على الموبايل التطبيق بيفضل مفتوح في الخلفية أيام —
        //    setInterval بيتجمّد. الصح: فحص كل ما يرجع للواجهة.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {})
        })
        })
        .catch((err) => console.warn('[sw] registration failed', err))
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', early)
      window.removeEventListener('appinstalled', clearOnInstall)
      navigator.serviceWorker.removeEventListener('message', onSwMessage)
    }
  }, [])

  return null
}
