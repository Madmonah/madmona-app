import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { PLATFORM_ADMIN_COOKIE } from '@/lib/platformAdminConst'

// Bare /admin/business-finance has no index (only /[supplierId]).
// 🔁 (١٤/٩/٢٠٢٦) كان بيحوّل الكل على /admin/business-partners (صفحة أدمن محروسة بكوكي اللوحة) — صاحب البيزنس
//    اللي بيوصل هنا من غير كوكي كان بيدخل حلقة /login?next=/admin/business-partners ومايخرجش منها.
//    الأدمن (بالكوكي) → قايمة الشركاء · غيره → «حسابي» اللي بيفتح لوحة بيزنسه من جلسته.
export const dynamic = 'force-dynamic'
export default function BusinessFinanceIndex() {
  const hasAdminCookie = !!cookies().get(PLATFORM_ADMIN_COOKIE)?.value
  redirect(hasAdminCookie ? '/admin/business-partners' : '/account')
}
