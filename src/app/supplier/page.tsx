import { redirect } from 'next/navigation'

// Redirect /supplier to the supplier dashboard.
// Authenticated suppliers will see their dashboard; non-authenticated users
// will be redirected to login by the dashboard's own auth guard.
export default function SupplierIndexPage() {
  redirect('/supplier/dashboard')
}
