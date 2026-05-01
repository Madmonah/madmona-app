import { redirect } from 'next/navigation'

// Old unit detail → redirect to marketplace
export default function OldUnitRedirect() {
  redirect('/marketplace')
}
