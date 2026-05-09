import { redirect } from 'next/navigation'

// Old reserve flow → redirect to marketplace browse
export default function ReserveIndoorCoworkingRedirect() {
  redirect('/marketplace?category=workspaces-hot-desk')
}
