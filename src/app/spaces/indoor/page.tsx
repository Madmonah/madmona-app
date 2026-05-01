import { redirect } from 'next/navigation'

export default function SpacesIndoorRedirect() {
  redirect('/marketplace?category=workspaces')
}
