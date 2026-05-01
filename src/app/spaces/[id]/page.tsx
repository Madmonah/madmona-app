import { redirect } from 'next/navigation'

// Old space detail → redirect to marketplace
// (legacy iteration3 route — deprecated)
export default function OldSpaceRedirect() {
  redirect('/marketplace')
}
