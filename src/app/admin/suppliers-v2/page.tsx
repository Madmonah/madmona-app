import { redirect } from 'next/navigation'

// Legacy route — superseded by /admin/sup. Redirect so the link never 404s.
export default function SuppliersV2Redirect() {
  redirect('/admin/sup')
}
