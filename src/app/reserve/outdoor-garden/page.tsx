import { redirect } from 'next/navigation'

export default function ReserveOutdoorGardenRedirect() {
  redirect('/marketplace?category=workspaces-outdoor')
}
