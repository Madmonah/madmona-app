import { redirect } from 'next/navigation'

// iteration3 admin bookings → marketplace bookings (everything is now marketplace)
export default function AdminBookingsRedirect() {
  redirect('/admin/marketplace-bookings')
}
