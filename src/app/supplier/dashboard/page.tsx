'use client'
// 🧭 /supplier/dashboard → اللوحة الكاملة (٩/٩/٢٠٢٦)
// الشاشة القديمة (عيادات/صالونات/مطاعم — فروع · فريق · خدمات · صور · إعدادات)
// كانت مدخل رابع موازي. كل تاباتها موجودة في اللوحة الكاملة (branches · team ·
// services-catalog · media · settings). محمد: «خلي كل حاجة تودّي على اللوحة
// الكاملة». الكود القديم محفوظ في LegacyDashboard.tsx.
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { readMadmonaToken } from '@/lib/madmona-token'

type Ctx = { ok?: boolean; is_staff?: boolean; supplier_id?: string | null; platform_supplier_id?: string | null }

function DashboardRedirectInner() {
  const router = useRouter()
  const sp = useSearchParams()
  useEffect(() => {
    let alive = true
    ;(async () => {
      const supplierParam = sp?.get('supplier') || ''
      if (supplierParam) { router.replace(`/admin/business-finance/${supplierParam}`); return }
      const wtok = readMadmonaToken()
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user && !wtok) { router.replace('/login?next=' + encodeURIComponent('/supplier/dashboard')); return }
      let ctx: Ctx | null = null
      try {
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: Ctx | null }>)('workspace_menu_context', { p_token: wtok || null })
        ctx = data
      } catch { /* نكمّل */ }
      if (!alive) return
      if (ctx?.ok && ctx.supplier_id) { router.replace(`/admin/business-finance/${ctx.supplier_id}`); return }
      if (ctx?.is_staff && ctx.platform_supplier_id) { router.replace(`/admin/business-finance/${ctx.platform_supplier_id}`); return }
      router.replace('/home')
    })()
    return () => { alive = false }
  }, [router, sp])
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>
}

// useSearchParams لازم يبقى جوّه Suspense وإلا next build بيرفض الـprerender
export default function DashboardRedirect() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>}>
      <DashboardRedirectInner />
    </Suspense>
  )
}
