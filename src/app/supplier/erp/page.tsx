'use client'
// ============================================================================
// 🧭 /supplier/erp → اللوحة الكاملة (٩/٩/٢٠٢٦)
// محمد: «فيه كام شاشة مختلفة عند السبلاير؟ خلي كل حاجة تودّي على اللوحة
// الكاملة». الشاشة المختصرة (٦ تابات) كانت مدخل تالت موازي للوحة الكاملة
// /admin/business-finance/<id> — فنفس المورد يشوف حاجة من القايمة وحاجة
// تانية من هنا. دلوقتي الصفحة دي **تحويل بس**:
//   • موظف مضمونة  → لوحة المنصة (أو ?business=<id> لو بيشوف بيزنس تاني)
//   • صاحب بيزنس   → لوحته
//   • مش مسجّل     → /login ويرجع هنا
// الكود القديم محفوظ في LegacyErpHub.tsx (مش مربوط بأي مسار).
// ============================================================================
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { readMadmonaToken } from '@/lib/madmona-token'

type Ctx = { ok?: boolean; is_staff?: boolean; supplier_id?: string | null; platform_supplier_id?: string | null }

function ErpRedirectInner() {
  const router = useRouter()
  const sp = useSearchParams()
  useEffect(() => {
    let alive = true
    ;(async () => {
      const business = sp?.get('business') || ''
      const wtok = readMadmonaToken()
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user && !wtok) { router.replace('/login?next=' + encodeURIComponent('/supplier/erp')); return }
      let ctx: Ctx | null = null
      try {
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: Ctx | null }>)('workspace_menu_context', { p_token: wtok || null })
        ctx = data
      } catch { /* نكمّل */ }
      if (!alive) return
      if (ctx?.is_staff) {
        const target = business || ctx.platform_supplier_id || ''
        router.replace(target ? `/admin/business-finance/${target}` : '/admin/listings'); return
      }
      if (ctx?.ok && ctx.supplier_id) { router.replace(`/admin/business-finance/${ctx.supplier_id}`); return }
      router.replace('/home')
    })()
    return () => { alive = false }
  }, [router, sp])
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>
}

// useSearchParams لازم يبقى جوّه Suspense وإلا next build بيرفض الـprerender
export default function ErpRedirect() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>}>
      <ErpRedirectInner />
    </Suspense>
  )
}
