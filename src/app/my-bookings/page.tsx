import { redirect } from 'next/navigation'

// Old route → redirect to new account bookings
export default function MyBookingsRedirect() {
  redirect('/account/bookings')
}
