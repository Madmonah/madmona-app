import { redirect } from 'next/navigation'

// Old route → redirect to new auth
export default function LoginRedirect() {
  redirect('/auth/login')
}
