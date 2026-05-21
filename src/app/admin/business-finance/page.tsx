import { redirect } from 'next/navigation'

// Bare /admin/business-finance has no index (only /[supplierId]).
// Send to the partner list, where each partner opens its own finance hub.
export default function BusinessFinanceIndex() {
  redirect('/admin/business-partners')
}
