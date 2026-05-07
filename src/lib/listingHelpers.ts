// ============================================================================
// listingHelpers — utilities for handling demo/coming-soon listings
//
// DEMO listings (titles starting with "DEMO ·") are placeholder listings used
// to populate the marketplace before real suppliers fill it in. They:
//   - Are visible on browse/featured pages with a "🟡 قريباً" badge
//   - Have their booking buttons replaced with "قريباً - نموذج" message
//   - Show with the "DEMO" prefix stripped from display (for clean UX)
//
// Detection is done via title prefix to avoid a DB schema migration.
// ============================================================================

export function isDemoListing(title: string | null | undefined): boolean {
  if (!title) return false
  return title.startsWith('DEMO')
}

export function cleanListingTitle(title: string | null | undefined): string {
  if (!title) return ''
  // Strip "DEMO · " prefix
  return title.replace(/^DEMO\s*·\s*/, '').trim()
}
