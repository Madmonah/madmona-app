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
    // 🐞 (٤ سبتمبر ٢٠٢٦) اتكشف في تيست الويزارد: نشرنا نسخة جديدة والمستخدم
    //    كان بيملا إعلان — الـSW عمل reload و**الشغل ضاع**.
    //    الحارس القديم كان بيفحص `document.activeElement` بس، يعني
    //    «المؤشر جوّه خانة **في اللحظة دي**». بس اليوزر اللي كتب نص الفورم
    //    وبعدين بيسكرول أو بيدوس زرار مش «مشغول» بالمقياس ده — فبيتعمله
    //    reload وهو فاقد شغله.
    //    ✅ دلوقتي أي فورم فيه بيانات مدخّلة = شغل مش محفوظ = ماتقاطعوش.
    const hasUnsavedInput = () => {
      try {
        const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          'input:not([type=hidden]):not([type=search]), textarea, select',
        )
        for (const f of fields) {
          if (f.disabled) continue
          if ('readOnly' in f && (f as HTMLInputElement).readOnly) continue
          if (f.type === 'checkbox' || f.type === 'radio') continue
          if (f.type === 'file') { if ((f as HTMLInputElement).files?.length) return true; continue }
          if (String(f.value || '').trim()) return true
        }
      } catch { /* لو أي حاجة وقعت، مانمنعش التحديث */ }
      return false
    }
    const isUserBusy = () => {
      const el = document.activeElement as HTMLElement | null
      if (el) {
        const tag = el.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
        if (el.isContentEditable) return true
      }
      return hasUnsavedInput()
    }
    // 🕐 التحديث المؤجّل بيتنفّذ أول ما اليوزر يسيب الصفحة (تاب تاني أو
    //    قفل) — فمحدش بيفضل على نسخة قديمة للأبد، ومحدش بيضيع شغله.
    let pendingReload: (() => void) | null = null
    const onHide = () => {
      if (document.visibilityState === 'hidden' && pendingReload) { const f = pendingReload; pendingReload = null; f() }
    }
    document.addEventListener('visibilitychange', onHide)

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'SW_UPDATED' || reloaded) return
      const doReload = () => {
        if (reloaded) return
        // ماتقاطعش المستخدم وهو بيكتب أو وعنده بيانات مش محفوظة
        if (isUserBusy()) { pendingReload = doReload; setTimeout(doReload, 5000); return }
        reloaded = true
        console.info('[sw] نسخة جديدة اشتغلت — إعادة تحميل الصفحة')
        window.location.reload()
      }
      doReload()
    }
    navigator.serviceWorker.addEventListener('message', onSwMessage)

    // Register after window load to not compete with critical rendering
    // 🚨 (١ سبتمبر ٢٠٢٦) حارس النسخة — محمد: «التحديثات الأخيرة مش مسمعة
    //    معايا خالص» (٣ مرات النهاردة). لو الجهاز عالق على SW قديم مهما كان
    //    السبب: نقارن نسخة السيرفر (/sw.js) بنسخة الـSW المتحكّم فعلًا.
    //    مختلفين ومفيش تحديث حصل خلال ٨ ثواني → نمسح التسجيل والكاش ونعيد
    //    التحميل — مرة واحدة بس في الجلسة (حارس ضد اللوب).
    const versionGuard = async (reg: ServiceWorkerRegistration) => {
      try {
        const res = await fetch('/sw.js?_=' + Date.now(), { cache: 'no-store' })
        const server = (await res.text()).match(/madmona-v(\d+)/)?.[1]
        const ctrl = navigator.serviceWorker.controller
        if (!server || !ctrl) return   // أول زيارة أو مفيش SW متحكّم — مفيش حاجة نصلّحها
        const current = await new Promise<string | null>((resolve) => {
          const t = setTimeout(() => resolve(null), 2000)   // SW قديم مابيردش → null
          const ch = new MessageChannel()
          ch.port1.onmessage = (e) => { clearTimeout(t); resolve(String(e.data?.version || '').match(/v(\d+)/)?.[1] || null) }
          ctrl.postMessage({ type: 'GET_VERSION' }, [ch.port2])
        })
        if (current === server) return   // ✅ مطابق
        console.warn('[sw] الجهاز على v' + (current || '?') + ' والسيرفر v' + server + ' — بنحدّث')
        await reg.update().catch(() => {})
        await new Promise((r) => setTimeout(r, 8000))
        if (reloaded) return   // SW_UPDATED خلّص الشغل
        const key = 'mdm_force_v' + server
        if (sessionStorage.getItem(key)) return   // عملناها في الجلسة دي — مانلفّش
        sessionStorage.setItem(key, '1')
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
        // ⚠️ (٤/٩/٢٠٢٦) المسار ده كان بيعمل reload **من غير أي فحص** —
        //    أقسى من SW_UPDATED (بيمسح التسجيل والكاش كمان). بقى يحترم
        //    نفس القاعدة: مايقاطعش شغل مش محفوظ.
        const hardReload = () => {
          if (isUserBusy()) { pendingReload = hardReload; setTimeout(hardReload, 5000); return }
          console.warn('[sw] عالق — مسحنا كل حاجة وبنعيد التحميل')
          window.location.reload()
        }
        hardReload()
      } catch { /* الحارس تحسين — مايكسرش حاجة */ }
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // دوّر على تحديث فورًا، وكل ساعة للتابات اللي بتفضل مفتوحة طويل
          reg.update().catch(() => {})
          setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
          versionGuard(reg)
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
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  return null
}
