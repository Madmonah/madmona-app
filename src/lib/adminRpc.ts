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

export async function adminRpc<T = unknown>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch('/api/admin/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
