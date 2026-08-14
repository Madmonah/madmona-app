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

// =====================================================================
// 📦 (١٣ أغسطس ٢٠٢٦) قراءة نتايج الـRPCs اللي بترجّع jsonb
//
// كل دالة بترجّع `jsonb` بيتولّد نوعها `Json` — اتحاد واسع
// (`string | number | boolean | {…} | Json[]`). فأي `data.ok` أو
// `data.error` بيدّي TS2339 «الخاصية مش موجودة»، وده كان **31 خطأ في 8 ملفات**.
//
// الحل مش كاست في كل سطر. `jsonObj` بيضيّق القيمة لكائن **مرة واحدة**
// وبيتحقق إنها فعلًا كائن (مش array ولا نص) — يعني بيحمي وقت التشغيل كمان
// من `null` أو شكل غير متوقع، مش بس بيسكّت المترجم.
//
//     const r = jsonObj<{ ok: boolean; error?: string }>(data)
//     if (r.ok) … else flash('err', r.error || 'حصل خطأ')
// =====================================================================

/** بيضيّق نتيجة jsonb لكائن. لو مش كائن (null/array/نص) بيرجّع {} فاضي. */
export function jsonObj<T extends Record<string, any> = Record<string, any>>(
  data: unknown,
): Partial<T> {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Partial<T>
  }
  return {}
}
