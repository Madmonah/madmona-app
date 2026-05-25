import { redirect } from 'next/navigation'

// /admin/cockpit — تم توحيد لوحة التحكم في مكان واحد.
// الداش بورد الكاملة الوحيدة دلوقتي = /admin/dashboard.
// أي فتح قديم لـ /admin/cockpit بيتحوّل عليها تلقائياً.
export default function CockpitRedirect() {
  redirect('/admin/dashboard')
}
