import { redirect } from 'next/navigation'

// Old route → redirect to marketplace
export default function BookRedirect() {
  redirect('/marketplace')
}
