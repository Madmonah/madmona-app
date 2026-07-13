// 🔊 rpc helpers — عشان مفيش حفظ يفشل في صمت تاني
// =====================================================================
// الباج المتكرر (13 يوليو 2026): صفحات كتير بتكتب:
//
//     await supabase.rpc('do_something', {...})   // ⛔ مفيش فحص للخطأ
//     onSaved()                                    // بيقفل الفورم كأنه نجح
//
// لو الحفظ فشل، المستخدم **مبيعرفش**. الفورم بيقفل والليستة بتعمل refresh
// وكأن كل حاجة تمام. ده اللي خلّى باج المصاريف مستخبّي لأسابيع.
//
// عندنا حلّين:
//
// 1) rpcSafe  — مبيغيّرش مسار الكود. بيرجع { data, error } زي ما هو،
//    بس كمان بيسجّل الخطأ في الكونسول **وبيطلّع تنبيه أحمر على الشاشة**.
//    ده اللي بنستخدمه في الكناسة العامة — آمن ١٠٠٪ ومبيكسرش حاجة شغّالة.
//
// 2) rpcOrThrow — بيرمي Error بالرسالة الحقيقية. استخدمه في الكود الجديد
//    لما تكون حاططه جوه try/catch وعايز الفورم يقف لو الحفظ فشل.
//
// ⚠️ للـRPCs المحميّة بصلاحية أدمن → استخدم adminRpc من '@/lib/adminRpc'
//    (لوحة /admin بكوكي مش Supabase Auth، فالنداء المباشر بيرجع forbidden).
// =====================================================================

export const RPC_ERROR_EVENT = 'madmona:rpc-error'

function surface(fn: string, message: string) {
  console.error(`[rpc] ${fn} فشلت:`, message)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(RPC_ERROR_EVENT, { detail: { fn, message } }),
    )
  }
}

/** بيرجع { data, error } زي الأصل — بس الخطأ مبيعدّيش في صمت. */
export async function rpcSafe<T = any>(
  client: any,
  fn: string,
  args: Record<string, unknown> = {},
): Promise<{ data: T | null; error: { message: string } | null }> {
  const { data, error } = await client.rpc(fn, args)
  if (error) surface(fn, error.message || 'خطأ غير معروف')
  return { data: (data ?? null) as T | null, error }
}

/** بيرمي Error لو فشل — للكود اللي جوه try/catch. */
export async function rpcOrThrow<T = any>(
  client: any,
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await client.rpc(fn, args)
  if (error) {
    surface(fn, error.message || 'خطأ غير معروف')
    throw new Error(error.message || 'الحفظ فشل — جرّب تاني')
  }
  return data as T
}
