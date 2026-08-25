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
import { isAdminRequest, isListingsStaffRequest } from '@/lib/adminGate'

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
  // 📋 (٢١ أغسطس ٢٠٢٦) شاشة الإعلانات الواقفة — /admin/drafts.
  //    الصفحة بتنادي بجلسة الأبليكيشن الأول (عشان موظفين مضمونة يشتغلوا)،
  //    وبترجع للبوابة دي لو اللوحة مفتوحة بكوكي الأدمن من غير جلسة Supabase.
  'admin_draft_listings',
  // ⏸️ (٢١ أغسطس ٢٠٢٦) نفس الشاشة بقت تغطي الموقوف والمرفوض كمان.
  //    محمد: «الموقوفة برضو عايز أعرف اتوقفت ليه».
  'admin_stalled_listings',
  'admin_publish_listing',
  // المخزون
  'admin_import_inventory',
  // 👤 (٢٣ أغسطس ٢٠٢٦) اسم صاحب الإعلان ورقمه — للإعلانات اللي اتضافت
  //    من اللوحة أو من رقم مندوب مش رقم صاحبها.
  'admin_set_listing_owner',
  // ➕ (٢٤ أغسطس ٢٠٢٦) إضافة إعلان جديد من اللوحة بخانة صاحب الإعلان.
  //    والنشر بعد رفع الصور (التريجر بيرفض النشر من غير صور).
  'admin_add_listing',
  'admin_publish_listing_now',
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
  // 📇 (٢١ أغسطس ٢٠٢٦) CRM مضمونة — /admin/crm.
  //    توزيع الليدات بالتخصص · تفريغ المكالمات · التاسكات اللي بتتحوّل لوحدها.
  'crm_overview',
  'crm_contacts_list',
  'crm_contact_detail',
  'crm_tasks_list',
  'crm_task_update',
  'crm_set_contact',
  'crm_set_staff_specialties',
  'crm_save_specialty',
  'crm_assign_round_robin',
  'crm_classify_contacts',
  'crm_ingest_contacts',
  'crm_log_call',
  // 🧩 (٢١ أغسطس ٢٠٢٦) الموديل نفسه بقى بيتظبط من الشاشة — أقسام وقواعد
  //    واستيراد من الدرايف. محمد: «خلي الموديل نفسه نقدر نتحكم فيه ديناميك».
  'crm_delete_specialty',
  'crm_test_rules',
  'crm_import_contacts',
  // 👥 (٢٢ أغسطس ٢٠٢٦) فريق مضمونة كله + ناقص كل واحد — شاشة إدارة الموظفين
  //    كانت بتعرض حسابات الأدمن بس (٣ من ٨).
  'madmona_team_accounts',
  // 🧑‍💼 (٢٣ أغسطس ٢٠٢٦) محمد: «لوحة الاستف خليها تاخد البيانات من الموظفين
  //    وتعمل الحسابات». الشاشة بقت تعمل مش تتفرّج بس.
  'madmona_sync_staff_accounts',
  'madmona_staff_set_contact',
  'madmona_staff_set_password',
  // 🎚️ (٢٢ أغسطس ٢٠٢٦) أدوار الفريق في الـCRM + التوزيع اليدوي.
  //    محمد: «أحمد سامي هو اللي هيوزّع».
  'crm_set_staff_role',
  'crm_assign_contacts',
  // 🩺 (٢٢ أغسطس ٢٠٢٦) فحص صحة النظام — بيقارن اللي الكود محتاجه باللي موجود
  //    في الداتابيز. محمد: «بلاقي حاجات بتقع بعد ما بنقفل الجلسة».
  'crm_health',
])

// 🧑‍💼 (٢٥ أغسطس ٢٠٢٦) محمد: «اعلانات شهد لسة مش بتنزل مع انها ضايفاها
// من تاب شغلي». موظفين مضمونة بيدخلوا /admin/listings من الأبليكيشن
// بجلسة Supabase — مش بكوكي اللوحة — فكل adminRpc كان بيرجع 401.
// الحل: دوال الإعلانات دي بس مسموحة كمان لموظف إعلانات متأكد منه
// (is_listings_staff_uid). باقي الدوال (فلوس · صلاحيات · CRM) فاضلة
// لكوكي اللوحة زي ما هي.
const LISTINGS_STAFF_ALLOWED = new Set([
  'admin_listings_search',
  'admin_listings_facets',
  'admin_bulk_set_status',
  'admin_draft_listings',
  'admin_stalled_listings',
  'admin_publish_listing',
  'admin_set_listing_owner',
  'admin_add_listing',
  'admin_publish_listing_now',
])

export async function POST(req: NextRequest) {
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

  const isAdmin = await isAdminRequest(req)
  const isStaff = !isAdmin && LISTINGS_STAFF_ALLOWED.has(fn) && (await isListingsStaffRequest(req))
  if (!isAdmin && !isStaff) {
    return NextResponse.json({ error: 'لازم تدخل من بوابة الأدمن الأول' }, { status: 401 })
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
