import { redirect } from 'next/navigation'

// /admin — البيت الواحد للوحة التحكم.
// بيحوّل على الداش بورد الكاملة /admin/dashboard.
export default function AdminIndexRedirect() {
  redirect('/admin/dashboard')
}
