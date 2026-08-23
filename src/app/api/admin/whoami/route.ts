// 🪪 /api/admin/whoami — «هل الطلب ده جاي من جلسة لوحة أدمن شغّالة؟»
//
// 🐛 (٢٣ أغسطس ٢٠٢٦) محمد: «تاب الإعلانات مش عايز يفتح عند أحمد».
//
//    السبب مكانش صلاحيات خالص — كان **بابين دخول مختلفين**:
//
//      • لوحة /admin كلها بتتقفل بكوكي جلسة موظف مضمونة
//        (platform_admin_sessions ← /admin-entry بإيميل وباسورد).
//      • بس ٩ صفحات جوّه اللوحة كانت بتسأل سؤال تاني مختلف تمامًا:
//        «فيه جلسة Supabase Auth؟» — ودي حاجة تانية خالص.
//
//    فأحمد بيدخل /admin-entry صح، والكوكي معاه صح، وبيفتح باقي اللوحة
//    عادي — وأول ما يدوس «الإعلانات» الصفحة تسأل عن جلسة Supabase
//    مالهاش لازمة هنا، مايلاقيهاش، فيتقفل في وشه.
//
//    الراوت ده بيدّي الصفحة طريقة تسأل عن **الباب الصح**: نفس الكوكي
//    اللي الـmiddleware مأمّن بيه اللوحة كلها أصلاً. يعني مافيش أي
//    صلاحية اتفتحت هنا — اللي كان بيقدر يفتح اللوحة هو هو اللي هيعدّي.
import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/adminGate'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const ok = await isAdminRequest(req)
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 })
}
