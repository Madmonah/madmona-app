'use client'
// =====================================================================
// /me → «شغلي» (/account/work) — تحويل بس (٩/٩/٢٠٢٦ — آخر الليل)
//
// محمد: «ليه بتلففني حوالين نفسي!؟» — بعد يوم كامل من إصلاحات بتطلّع
// عيب في الشاشة التانية. الجذر: شاشتين للموظف — /me (بالتوكن، فيها عمولة
// الشهر والمستحق وإدارة الفريق) و«شغلي» (بالجلسة). كل واحدة بتفهم باب واحد.
// القرار: **شاشة موظف واحدة = «شغلي»**. اللي بيدير بيوصل للوحة الكاملة من
// الدرج. الكود القديم محفوظ في LegacyMe.tsx (مش مربوط بأي مسار).
// =====================================================================
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function MeRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/account/work') }, [router])
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></div>
}
