import Script from 'next/script'

// ============================================================================
// Google Analytics 4
//
// To activate: add NEXT_PUBLIC_GA_ID to .env.local with your GA4 Measurement ID
// Example: NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
//
// If not set, the component renders nothing (graceful degradation).
// ============================================================================

export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  if (!gaId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
            anonymize_ip: true,
          });
        `}
      </Script>
    </>
  )
}

// Helper to track custom events from anywhere in the app
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', eventName, params || {})
}

// Common e-commerce events for Madmona
export const trackingEvents = {
  viewListing: (listingId: string, title: string, category?: string) =>
    trackEvent('view_item', {
      item_id: listingId,
      item_name: title,
      item_category: category || 'unknown',
    }),

  startBooking: (listingId: string, title: string) =>
    trackEvent('begin_checkout', {
      item_id: listingId,
      item_name: title,
    }),

  completeBooking: (bookingId: string, amount: number) =>
    trackEvent('purchase', {
      transaction_id: bookingId,
      value: amount,
      currency: 'EGP',
    }),

  signup: (method: string = 'phone') =>
    trackEvent('sign_up', { method }),

  search: (query: string) =>
    trackEvent('search', { search_term: query }),

  addToFavorites: (listingId: string) =>
    trackEvent('add_to_wishlist', { item_id: listingId }),
}
