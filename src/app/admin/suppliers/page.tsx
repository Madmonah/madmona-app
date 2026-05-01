import { redirect } from 'next/navigation'

// iteration3 admin suppliers → marketplace suppliers
export default function AdminSuppliersRedirect() {
  redirect('/admin/marketplace-suppliers')
}
