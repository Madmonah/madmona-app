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
import { readMadmonaToken } from '@/lib/madmona-token'
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react'

type State = 'checking' | 'staff' | 'owner' | 'supplier' | 'guest'

// 🏢 (٣ سبتمبر ٢٠٢٦) محمد: «بيفتح صفحة اسمها إدارة بيزنسك مفيهاش أي
//    صلاحيات ولا إضافة».
//    🐞 حارس ٢٨/٨ كان بيسأل سؤال واحد: «موظف مضمونة؟» — وأي حد غيره
//    يتقذف. بس **لوحة البيزنس نفسها عايشة تحت /admin**
//    (/admin/business-finance/<بيزنسه>)، وحارس الصفحة الداخلي
//    (admin_check_finance_access) بيدعم `business_admin` صراحةً.
//    فصاحب البيزنس كان بيتقفل في وشه **بيزنسه هو** قبل ما الحارس
//    الصح يشتغل أصلاً. (اتقاس: محمود سالم → business_admin allowed=true،
//    ومع ذلك الشاشة بترميه.)
//    ✅ دلوقتي: مسار بيزنسه بيعدّي لو هو مالكه/مديره؛ أي شاشة تانية
//    تحت /admin تفضل لفريق مضمونة بس.
function businessIdFromPath(path: string | null): string | null {
  const m = (path || '').match(/^\/admin\/business-finance\/([0-9a-f-]{36})(?:\/|$)/i)
  return m ? m[1] : null
}

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>('checking')
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const bizId = businessIdFromPath(pathname)
      const { data: { session } } = await supabaseBrowser.auth.getSession()

      // 🚪🚪 (٣ سبتمبر ٢٠٢٦) محمد: «مش بيفتح إضافة الموظفين» من الموبايل.
      //    الحارس ده كان بيسأل عن **جلسة Supabase بس**، ومحمد وأصحاب
      //    البيزنس بيدخلوا بتوكن الواتساب (madmona_token) من غير أي جلسة
      //    Supabase — فالشاشة بتقول «سجّل دخولك الأول» وهو داخل فعلًا.
      //    ⚠️ ده نفس «الدرس الأكبر» (٢٥/٨): لوحة business-finance ليها
      //    **بابين**، وأي حارس جديد لازم يقبل الاتنين. الميدلوير وحارس
      //    الصفحة بيقبلوا التوكن من زمان — الحارس ده لوحده كان بباب واحد.
      if (!session?.user) {
        const wtok = readMadmonaToken()
        if (wtok) {
          try {
            if (bizId) {
              const { data: fin } = await (supabaseBrowser.rpc as unknown as (
                f: string, a: Record<string, unknown>,
              ) => Promise<{ data: { allowed?: boolean } | null }>)(
                'admin_check_finance_access', { p_token: wtok, p_supplier_id: bizId },
              )
              if (!alive) return
              if (fin?.allowed === true) { setState('owner'); return }
            }
            const { data: ctx } = await (supabaseBrowser.rpc as unknown as (
              f: string, a: Record<string, unknown>,
            ) => Promise<{ data: { is_staff?: boolean } | null }>)(
              'workspace_menu_context', { p_token: wtok },
            )
            if (!alive) return
            if (ctx?.is_staff === true) { setState('staff'); return }
          } catch { /* التوكن مش صالح — بنكمّل على guest */ }
        }
        if (alive) setState('guest')
        return
      }
      try {
        // 🔐 السؤال الوحيد: هو موظف مضمونة؟ الدالة بتشوف is_platform_owner
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a?: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('is_madmona_staff')
        if (!alive) return
        if (data === true) { setState('staff'); return }

        // مش موظف مضمونة — بس ممكن يكون داخل على لوحة بيزنسه هو
        if (bizId) {
          const { data: acc } = await (supabaseBrowser.rpc as unknown as (
            f: string, a: Record<string, unknown>,
          ) => Promise<{ data: { full?: boolean; is_owner?: boolean; is_staff?: boolean } | null }>)(
            'my_supplier_access', { p_supplier_id: bizId },
          )
          if (!alive) return
          if (acc?.full === true || acc?.is_owner === true || acc?.is_staff === true) {
            setState('owner'); return
          }
        }
        setState('supplier')
      } catch {
        if (alive) setState('supplier')
      }
    })()
    return () => { alive = false }
  }, [pathname])

  if (state === 'checking') {
    return <div className="py-32 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>
  }

  if (state === 'staff' || state === 'owner') return <>{children}</>

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
