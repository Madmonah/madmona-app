// 🐛 /api/admin/company — بوابة الحفظ للوحة شركة مضمونة
// (13 Jul 2026) الباج: لوحة /admin مقفولة بكوكي (adminGate) مش بـ Supabase Auth.
// الصفحة كانت بتنادي الـRPC من المتصفح مباشرة، فـ auth.uid() = NULL،
// و is_admin() بترجّع false → كل حفظ (مصروف / منتج / مورّد / أمر شراء / مستند)
// بيرجع "forbidden" ويطلع رسالة «لازم تسجّل دخول كأدمن الأول».
// القراءة (madmona_company_dashboard) شغالة عشان مفيهاش is_admin() — عشان كده
// الصفحة بتفتح عادي والحفظ بس هو اللي بيقع.
//
// الحل: الحفظ بيعدّي من هنا — بنتأكد من كوكي الأدمن على السيرفر،
// وبننادي نفس الـRPC بمفتاح service_role.
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// الدوال المسموح استدعاؤها — قايمة بيضا مقفولة عمداً
const ALLOWED = new Set([
  'madmona_company_add_expense',
  'madmona_company_add_inventory_product',
  'madmona_company_add_vendor',
  'madmona_company_add_purchase_order',
  'madmona_company_add_document',
  'madmona_company_adjust_stock',
])

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get(ADMIN_COOKIE)?.value === ADMIN_SESSION_VALUE
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'لازم تدخل من بوابة الأدمن الأول' }, { status: 401 })
  }

  let body: { fn?: string; args?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }

  const fn = String(body.fn || '')
  if (!ALLOWED.has(fn)) {
    return NextResponse.json({ error: 'عملية غير مسموحة' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data, error } = await db.rpc(fn, (body.args || {}) as never)
  if (error) {
    console.error('[admin/company]', fn, error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, data })
}
