import { redirect } from 'next/navigation'

// Old route → redirect to new account orders
export default function MyOrdersRedirect() {
  redirect('/account/orders')
}
