import { redirect } from 'next/navigation'

export default function ReservePrivateOfficeRedirect() {
  redirect('/marketplace?category=workspaces-office')
}
