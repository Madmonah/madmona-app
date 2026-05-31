import { redirect } from 'next/navigation'

// /admin — البيت الواحد للوحة التحكم.
// بيحوّل على لوحة المالك الـ premium /admin/dashboard. كل الأدوات على /admin/overview.
export default function AdminIndexRedirect() {
  redirect('/admin/dashboard')
}
