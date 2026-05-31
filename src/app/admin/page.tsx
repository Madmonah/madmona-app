import { redirect } from 'next/navigation'

// /admin — البيت الواحد للوحة التحكم.
// بيحوّل على لوحة المالك الـ premium (نظرة عامة). كل الأدوات لسه على /admin/dashboard.
export default function AdminIndexRedirect() {
  redirect('/admin/overview')
}
