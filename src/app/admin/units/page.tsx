import { redirect } from 'next/navigation'

// iteration3 admin units → admin dashboard
// Spaces are now listings — managed via supplier dashboard
export default function AdminUnitsRedirect() {
  redirect('/admin/dashboard')
}
