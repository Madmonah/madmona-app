import { redirect } from 'next/navigation'

// /browse was the legacy "Madmona-spaces only" page.
// Now everything is unified under /marketplace ("خدمات مضمونة").
export default function BrowseRedirect() {
  redirect('/marketplace')
}
