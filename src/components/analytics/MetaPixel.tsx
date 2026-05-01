'use client'

import Script from 'next/script'

// ============================================================================
// Meta (Facebook) Pixel
//
// To activate: add NEXT_PUBLIC_META_PIXEL_ID to .env.local
// Example: NEXT_PUBLIC_META_PIXEL_ID=1234567890
//
// If not set, the component renders nothing.
// ============================================================================

export default function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!pixelId) return null

  return (
    <>
      <Script id="fb-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export function trackPixelEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', eventName, params || {})
}

// Common Meta Pixel events for Madmona
export const pixelEvents = {
  viewContent: (id: string, name: string, value?: number) =>
    trackPixelEvent('ViewContent', {
      content_ids: id,
      content_name: name,
      ...(value !== undefined ? { value, currency: 'EGP' } : {}),
    }),

  addToCart: (id: string, name: string, value: number) =>
    trackPixelEvent('AddToCart', {
      content_ids: id,
      content_name: name,
      value,
      currency: 'EGP',
    }),

  initiateCheckout: (value: number) =>
    trackPixelEvent('InitiateCheckout', { value, currency: 'EGP' }),

  purchase: (orderId: string, value: number) =>
    trackPixelEvent('Purchase', {
      content_ids: orderId,
      value,
      currency: 'EGP',
    }),

  completeRegistration: () =>
    trackPixelEvent('CompleteRegistration'),

  search: (query: string) =>
    trackPixelEvent('Search', { search_string: query }),

  contact: () =>
    trackPixelEvent('Contact'),
}
