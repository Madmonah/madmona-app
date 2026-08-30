'use client'
// ============================================================================
// 🔐 AdminGuard — حارس واجهة الأدمن
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «الموردين أو المطورين اللي مش في مضمونة لما
//   بيفتح لوحة الإدارة بتجيله أدوات الأدمن بانيل بتاعة مضمونة… مش
//   بيعرف يدخل على أغلب الأدوات بس برضه فيه أدوات بتفتح معاه».
//
// 🐞 المشكلة: `/admin` **مالهاش أي حماية على الواجهة**. الـRLS بتحمي
//    البيانات، بس القايمة نفسها بتظهر لأي حد — والشاشات اللي بتقرا من
//    ويوهات عامة كانت بتفتح فعلًا.
//
// ✅ الحل: طبقة تحقق قبل أي شاشة أدمن. اللي مش موظف مضمونة بيتحوّل
//    لنظام إدارة بيزنسه — مش رسالة رفض، **توجيه لمكانه الصح**.
// ============================================================================
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react'

type State = 'checking' | 'staff' | 'supplier' | 'guest'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>('checking')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        if (alive) setState('guest')
        return
      }
      try {
        // 🔐 السؤال الوحيد: هو موظف مضمونة؟ الدالة بتشوف is_platform_owner
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a?: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('is_madmona_staff')
        if (!alive) return
        setState(data === true ? 'staff' : 'supplier')
      } catch {
        if (alive) setState('supplier')
      }
    })()
    return () => { alive = false }
  }, [pathname])

  if (state === 'checking') {
    return <div className="py-32 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>
  }

  if (state === 'staff') return <>{children}</>

  // 🏪 مورد دخل على /admin بالغلط — نوديه لنظامه هو
  return (
    <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
      <div className="w-14 h-14 rounded-2xl bg-[#F1EEE6] flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="w-6 h-6 text-[#B78A12]" />
      </div>
      <h1 className="font-black text-lg mb-2 text-gray-900">
        {state === 'guest' ? 'سجّل دخولك الأول' : 'دي لوحة فريق مضمونة'}
      </h1>
      <p className="text-sm text-gray-600 mb-5 leading-relaxed">
        {state === 'guest'
          ? 'محتاج تسجّل دخول عشان تكمّل.'
          : 'نظام إدارة بيزنسك في مكان تاني — فيه إعلاناتك وطلباتك وعملاؤك وفريقك.'}
      </p>
      <button
        onClick={() => router.push(state === 'guest'
          ? `/auth/login?redirect=${encodeURIComponent(pathname || '/supplier/erp')}`
          : '/supplier/erp')}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#34D399] text-[#04352A] font-black text-sm">
        {state === 'guest' ? 'تسجيل الدخول' : 'افتح نظام إدارة بيزنسك'}
        <ArrowLeft className="w-4 h-4" />
      </button>
    </div>
  )
}
