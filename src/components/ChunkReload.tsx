'use client'
// ============================================================================
// 🩹 ChunkReload — شبكة أمان ضد «الأبليكيشن المفتوح على نسخة قديمة»
//
// (٩/٩/٢٠٢٦) محمد: «لما بدوس على الـ٣ شرط من تليفون محمد مش بيفتح، ولما
//   بدوس على تاب حسابي بيلود على الفاضي». على أي جهاز تاني الاتنين شغالين.
//   الجذر: التطبيق المثبّت (PWA) بيفضل مفتوح في الذاكرة أيام، وإحنا بننشر
//   كذا مرة في اليوم — فالكلاينت القديم بيطلب chunks/RSC من نسخة اتشالت من
//   السيرفر → ChunkLoadError → الـhydration بتفشل → الأزرار ميتة والشاشات
//   اللي بتتحمّل client-side بتلف للأبد. الـSW مش السبب (network-first من v4).
//
//   العلاج الجذري = Skew Protection على فيرسل (useDeploymentId في next.config)
//   عشان الكلاينت القديم يفضل ياخد أصوله القديمة لحد ما يعمل reload.
//   ده هنا **شبكة أمان تانية**: أول ما يظهر خطأ تحميل chunk → reload مرة
//   واحدة (بحارس sessionStorage عشان مانلفّش في حلقة).
// ============================================================================
import { useEffect } from 'react'

const KEY = 'madmona_chunk_reload_at'
const isChunkError = (msg: string) =>
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|Unexpected token '<'/i.test(msg)

export default function ChunkReload() {
  useEffect(() => {
    const reloadOnce = () => {
      try {
        const last = Number(sessionStorage.getItem(KEY) || 0)
        if (Date.now() - last < 60_000) return       // اتعمل reload من دقيقة — مانلفّش
        sessionStorage.setItem(KEY, String(Date.now()))
      } catch { /* التخزين مقفول — نعمل reload برضه مرة */ }
      window.location.reload()
    }
    const onError = (e: ErrorEvent) => {
      const msg = String(e?.message || (e?.error && (e.error as Error).message) || '')
      if (isChunkError(msg)) reloadOnce()
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e?.reason as { message?: string; name?: string } | string | undefined
      const msg = typeof r === 'string' ? r : String((r && (r.message || r.name)) || '')
      if (isChunkError(msg)) reloadOnce()
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
