import { redirect } from 'next/navigation'

// Redirect /spaces to the marketplace, filtered for workspaces.
// The /spaces route was referenced in the Terms of Service but had no index page.
// We send users to the marketplace with the workspaces category pre-selected,
// which surfaces all Madmona-owned and partner spaces in one place.
export default function SpacesPage() {
  redirect('/marketplace?category=workspaces')
}
