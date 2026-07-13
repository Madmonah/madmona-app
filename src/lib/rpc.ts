// 🔊 rpcOrThrow — الطريقة الصح لنداء أي RPC عادية (مش محميّة بأدمن)
// =====================================================================
// الباج المتكرر (13 يوليو 2026): صفحات كتير بتكتب:
//
//     await supabase.rpc('do_something', {...})   // ⛔ مفيش فحص للخطأ
//     onSaved()                                    // بيقفل الفورم كأنه نجح
//
// لو الحفظ فشل، المستخدم **مبيعرفش**. الفورم بيقفل والليستة بتعمل refresh
// وكأن كل حاجة تمام. ده اللي خلّى باج المصاريف مستخبّي لأسابيع.
//
// ✅ استخدم rpcOrThrow — بيرمي Error بالرسالة الحقيقية، فالفورم يعرضها
//    ومبيقفلش غير لما الحفظ ينجح فعلاً.
//
// ⚠️ للـRPCs المحميّة بصلاحية أدمن → استخدم adminRpc من '@/lib/adminRpc'
//    (لوحة /admin بكوكي مش Supabase Auth، فالنداء المباشر بيرجع forbidden).
// =====================================================================
import type { SupabaseClient } from '@supabase/supabase-js'

export async function rpcOrThrow<T = unknown>(
  client: SupabaseClient<any, any, any>,
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  // @ts-expect-error أنواع الـRPC مش متولّدة
  const { data, error } = await client.rpc(fn, args)
  if (error) {
    console.error(`[rpc] ${fn} فشلت:`, error.message)
    throw new Error(error.message || 'الحفظ فشل — جرّب تاني')
  }
  return data as T
}
