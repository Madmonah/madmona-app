import { redirect } from 'next/navigation'

// صفحة الأونبوردنج القديمة اتدمجت في /admin/business-partners/new
// بنحوّل أوتوماتيك عشان مايبقاش فيه مكانين للإضافة.
export default function DeprecatedOnboardRedirect() {
  redirect('/admin/business-partners/new')
}
