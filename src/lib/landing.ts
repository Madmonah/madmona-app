'use client'
// ============================================================================
// 🧭 landingAfterLogin — «بعد الدخول أروح فين؟» — مصدر واحد
//
// (٩/٩/٢٠٢٦) محمد: «خلي كل حاجة تودّي على اللوحة الكاملة» + «حاول الموضوع
//   مايلخبطش الناس». كان فيه ٣ إجابات مختلفة لنفس السؤال:
//     /login (باسورد)      → /me
//     /login (واتساب)      → /home
//     دخول جوجل            → /account
//   ومحدش فيهم بيودّي صاحب البيزنس للوحته.
//
// القاعدة دلوقتي:
//   • موظف مضمونة       → /admin/listings   (شاشة الإعلانات — مكان شغل الفريق)
//   • صاحب/مدير بيزنس   → /admin/business-finance/<بيزنسه>   (اللوحة الكاملة)
//   • غير كده           → /home
//
// ⚠️ بيقبل البابين: جلسة Supabase أو توكن الواتساب (madmona_token) — نفس درس
//   ٢٥/٨ «الحارس بباب واحد بيقفل في وش محمد وأصحاب البيزنس».
// ============================================================================
import { supabaseBrowser } from '@/lib/supabase-browser'
import { readMadmonaToken } from '@/lib/madmona-token'

/** قيمة مميّزة في ?next= / ?redirect= معناها «قرّر إنت» */
export const LANDING_AUTO = '__auto'

type Ctx = { ok?: boolean; is_staff?: boolean; supplier_id?: string | null }

export async function landingAfterLogin(fallback = '/home'): Promise<string> {
  try {
    const wtok = readMadmonaToken()
    const { data } = await (supabaseBrowser.rpc as unknown as (
      f: string, a: Record<string, unknown>,
    ) => Promise<{ data: Ctx | null }>)('workspace_menu_context', { p_token: wtok || null })
    if (data?.is_staff === true) return '/admin/listings'
    if (data?.ok && data.supplier_id) return `/admin/business-finance/${data.supplier_id}`
  } catch { /* نرجع للافتراضي */ }
  return fallback
}

/** لو الوجهة المطلوبة «تلقائي» أو فاضية → نقرّر، غير كده نحترمها */
export async function resolveLanding(requested: string | null | undefined, fallback = '/home'): Promise<string> {
  const r = (requested || '').trim()
  if (!r || r === LANDING_AUTO || !r.startsWith('/') || r.startsWith('//')) return landingAfterLogin(fallback)
  return r
}
