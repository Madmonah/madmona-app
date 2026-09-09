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
//   • موظف مضمونة       → /me   («شغلي» — بتشتغل بالتوكن؛ /admin/* محتاجة كوكي اللوحة)
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
    // 🐞 (٩/٩/٢٠٢٦ — بعد ساعة من الإطلاق) محمد: «مش عارف أدخل بحساب محمد
    //    عبدالجابر أصلًا». الموظف اللي بيدخل بالـPIN معاه توكن واتساب بس —
    //    مفيش كوكي لوحة ولا جلسة Supabase — والميدلوير بيحرس /admin/* بكوكي
    //    اللوحة، فكان بيتحوّل لـ/admin-entry (باسورد مايملكوش) = «مش عارف
    //    أدخل». شاشة الموظف اللي بتشتغل بالتوكن هي «شغلي» /me (زي ما كانت
    //    قبل التوحيد). أدمن اللوحة بباسورد بيروح /admin/listings من /login
    //    مباشرة (source==='admin') مش من هنا.
    // 🔢 (٩/٩/٢٠٢٦ — بليل) محمد: «الأرقام اللي ظاهرة عند محمد مش المفروض تظهر».
    //    /me بتعرض «عمولة الشهر» و«مستحق لسه» وإدارة الفريق — دي للي بيدير بس.
    //    موظف مضمونة اللي مش بيدير (أوفيس بوي…) → «شغلي» /account/work مباشرة.
    //    (آخر الليل) شاشة موظف واحدة: /me اتقفلت. اللي بيدير → اللوحة الكاملة، غيره → «شغلي».
    if (data?.is_staff === true) {
      const d = data as { staff_can_manage?: boolean; platform_supplier_id?: string | null }
      return d.staff_can_manage === true && d.platform_supplier_id ? `/admin/business-finance/${d.platform_supplier_id}` : '/account/work'
    }
    // 🚫 (٩/٩/٢٠٢٦) موظف في بيزنس (مش مالك/مدير) → «شغلي» مش لوحة الإدارة
    if (data?.ok && data.supplier_id && (data as { can_manage?: boolean }).can_manage !== true) return '/account/work'
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
