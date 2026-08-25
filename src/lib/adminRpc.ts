// 🔐 adminRpc — الطريقة الوحيدة الصح لنداء RPC من صفحات /admin
// =====================================================================
// ⛔ متناديش supabase.rpc() مباشرة من صفحة أدمن لو الدالة محميّة بصلاحية.
//    لوحة /admin مقفولة بكوكي مش بـ Supabase Auth، فـ auth.uid() = NULL
//    و is_admin() بترجّع false → «forbidden».
//
// ✅ استخدم adminRpc() — بيعدّي على /api/admin/rpc اللي بيتأكد من الكوكي
//    على السيرفر وينادي بمفتاح service_role.
//
// بيرمي Error بالرسالة الحقيقية لو الحفظ فشل — عشان الفورم يعرضها
// ومنقعش تاني في «الحفظ بيفشل في صمت».
// =====================================================================

/* 🧑‍💼 (٢٥ أغسطس ٢٠٢٦) محمد: «اعلانات شهد لسة مش بتنزل مع انها ضايفاها من
   تاب شغلي». موظفين مضمونة بيفتحوا /admin/listings من الأبليكيشن بجلسة
   Supabase — مش بكوكي اللوحة — فالنداء كان بيرجع 401 وكل إضافة بتفشل.
   دلوقتي بنبعت توكن الجلسة (لو موجود) والسيرفر بيقبله لدوال الإعلانات
   لو صاحبه staff إعلانات فعلي (is_listings_staff_uid). */
export async function staffAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { supabaseBrowser } = await import('./supabase-browser')
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  } catch { return {} }
}

export async function adminRpc<T = unknown>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch('/api/admin/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await staffAuthHeaders()) },
    body: JSON.stringify({ fn, args }),
  })

  const json = await res.json().catch(() => ({} as Record<string, unknown>))

  if (!res.ok) {
    throw new Error(
      (json as { error?: string })?.error || `الحفظ فشل (${res.status})`,
    )
  }

  return (json as { data: T }).data
}
