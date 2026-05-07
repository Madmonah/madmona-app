'use client'

// src/components/AnalyticsTracker.tsx
// Drop this in app/layout.tsx to track every page view + listing view + click events.
// Sends to /api/events/track. AI agents read from site_events to score leads.

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const SESSION_KEY = 'madmona_session_id'
const VISITOR_KEY = 'madmona_visitor_id'

function getOrCreate(key: string, storage: 'session' | 'local'): string {
  if (typeof window === 'undefined') return ''
  const store = storage === 'session' ? window.sessionStorage : window.localStorage
  let v = store.getItem(key)
  if (!v) {
    v = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    store.setItem(key, v)
  }
  return v
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'
  const w = window.innerWidth
  if (w < 640) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

interface TrackEventArgs {
  event_type: string
  page_url?: string
  listing_id?: string
  category?: string
  search_query?: string
  metadata?: Record<string, unknown>
}

export function trackEvent(args: TrackEventArgs): void {
  if (typeof window === 'undefined') return
  const session_id = getOrCreate(SESSION_KEY, 'session')
  const visitor_id = getOrCreate(VISITOR_KEY, 'local')
  const params = new URLSearchParams(window.location.search)

  const body = {
    ...args,
    session_id,
    visitor_id,
    page_url: args.page_url ?? window.location.pathname + window.location.search,
    page_referrer: document.referrer || undefined,
    device_type: getDeviceType(),
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
  }

  fetch('/api/events/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {})
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return

    let event_type = 'page_view'
    let listing_id: string | undefined
    let category: string | undefined

    const listingMatch = pathname.match(/^\/listing[s]?\/([\w-]+)/)
    if (listingMatch) {
      event_type = 'listing_view'
      listing_id = listingMatch[1]
    }

    const categoryMatch = pathname.match(/^\/category\/([\w-]+)/)
    if (categoryMatch) {
      category = categoryMatch[1]
    }

    trackEvent({ event_type, listing_id, category })
  }, [pathname, searchParams])

  return null
}
