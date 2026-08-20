// 🔐 /api/admin/rpc — بوابة واحدة لكل RPC محميّة بصلاحية أدمن
// =====================================================================
// الباج (13 يوليو 2026): لوحة /admin مقفولة بكوكي (adminGate) — مش بـ Supabase Auth.
// فلما الصفحة كانت بتنادي RPC من المتصفح على طول، auth.uid() = NULL،
// و is_admin() بترجّع false → «forbidden». ده كان بيكسر:
//   الصلاحيات · بحث الليستنجات · تغيير الحالة بالجملة · استيراد المخزون · طلبات التسعير
//
// الحل: النداء يعدّي من هنا — بنتأكد من كوكي الأدمن على السيرفر،
// وبننادي نفس الـRPC بمفتاح service_role.
//
// ⚠️ أي RPC جديدة محميّة بـ is_admin_or_service() لازم تتضاف للقايمة تحت،
//    وإلا هترجع «عملية غير مسموحة».
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = new Set([
  // شركة مضمونة
  'madmona_company_add_expense',
  'madmona_company_add_inventory_product',
  'madmona_company_add_vendor',
  'madmona_company_add_purchase_order',
  'madmona_company_add_document',
  'madmona_company_adjust_stock',
  // الليستنجات
  'admin_listings_search',
  'admin_listings_facets',
  'admin_bulk_set_status',
  // المخزون
  'admin_import_inventory',
  // الصلاحيات
  'get_employee_permissions_overview',
  // 🔐 (٢٠ أغسطس ٢٠٢٦) صلاحيات بيزنس **واحد** — بتتنادى من تاب الصلاحيات
  //    اللي جوّه لوحة البيزنس نفسه (business-finance/[supplierId]/permissions).
  'get_business_permissions',
  'set_employee_permission',
  'set_employee_permissions_bulk',
  'add_permission_to_catalog',
  // طلبات التسعير
  'madmona_list_quote_orders',
  'madmona_quote_order',
  // لوحة "كل الأدوات" (overview/dashboard) — كانت بتتنادى من المتصفح على طول
  // ومحمية بـassert_platform_admin() اللي بتطلب auth.uid() (جلسة Supabase Auth
  // منفصلة تمامًا عن نظام الدخول الجديد) — (١٩ أغسطس ٢٠٢٦)
  'get_admin_dashboard_v2',
  'get_admin_messages_summary',
  'get_system_pulse_status',
  'get_admin_dashboard_charts',
  'get_owner_overview_charts',
  'get_b2b_partner_links',
  // 🏢 (٢٠ أغسطس ٢٠٢٦) كل البيزنس على المنصة في نداء واحد — تاب الشركاء
  //    كان بيعرض multi_branch بس (٤ من ١٦٢). محمد: «وسّع التاب خليه يعرض الكل».
  'admin_list_all_businesses',
])

async function isAdmin(req: NextRequest): Promise<boolean> {
  return await isAdminRequest(req)
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
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
    return NextResponse.json({ error: `عملية غير مسموحة: ${fn}` }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data, error } = await db.rpc(fn, (body.args || {}) as never)
  if (error) {
    console.error('[admin/rpc]', fn, error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true, data })
}
