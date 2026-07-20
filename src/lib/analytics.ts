import { safeStorage } from '@/lib/safe-storage'
// ============================================================
// src/lib/analytics.ts — frontend funnel events tracker
// Calls the public.track_event() RPC to log key user actions.
// Use this everywhere the user takes a meaningful step.
// ============================================================
import { supabaseBrowser } from './supabase-browser'

// Stable per-browser visitor ID (persists across sessions)
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let id = safeStorage.get('madmona_visitor_id')
    if (!id) {
      id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      safeStorage.set('madmona_visitor_id', id)
    }
    return id
  } catch {
    return 'anon'
  }
}

// Per-tab session ID (resets when tab is closed)
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let id = sessionStorage.getItem('madmona_session_id')
    if (!id) {
      id = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('madmona_session_id', id)
    }
    return id
  } catch {
    return 'anon'
  }
}

export interface TrackOptions {
  listing_id?: string
  category?: string
  page_url?: string
  metadata?: Record<string, unknown>
}

/**
 * Track a funnel event. Fire-and-forget — never blocks UI.
 *
 * Standard event_types:
 * - 'page_view'             — page load
 * - 'listing_view'          — opened a listing detail page
 * - 'listing_click'         — clicked listing from a list
 * - 'search'                — used the search bar
 * - 'category_filter'       — filtered by category
 * - 'add_to_favorites'      — heart icon
 * - 'whatsapp_click'        — clicked WhatsApp CTA
 * - 'phone_click'           — clicked phone CTA
 * - 'start_booking'         — opened booking form
 * - 'booking_form_view'     — saw the booking form
 * - 'booking_submitted'     — submitted booking
 * - 'booking_completed'     — booking confirmed
 * - 'cta_click_add_listing' — clicked "Add your listing" CTA
 * - 'signup_started'        — opened signup
 * - 'signup_completed'      — finished signup
 */
export async function trackEvent(eventType: string, opts: TrackOptions = {}): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const visitor_id = getOrCreateVisitorId()
    const session_id = getOrCreateSessionId()
    const page_url = opts.page_url ?? window.location.pathname + window.location.search

    // Fire-and-forget — don't await on the network in the UI thread
    void supabaseBrowser.rpc('track_event', {
      p_event_type: eventType,
      p_visitor_id: visitor_id,
      p_session_id: session_id,
      p_listing_id: opts.listing_id ?? null,
      p_category: opts.category ?? null,
      p_page_url: page_url,
      p_metadata: opts.metadata ?? {},
    })
  } catch (e) {
    // Silent: never break the UI for analytics
    if (typeof window !== 'undefined' && window.console) {
      console.debug('[track_event] failed:', e)
    }
  }
}

// ============================================================
// Convenience wrappers — call these from components
// ============================================================
export const track = {
  pageView: (opts: TrackOptions = {}) => trackEvent('page_view', opts),
  listingView: (listing_id: string, category?: string, metadata?: Record<string, unknown>) =>
    trackEvent('listing_view', { listing_id, category, metadata }),
  listingClick: (listing_id: string, category?: string) =>
    trackEvent('listing_click', { listing_id, category }),
  search: (query: string, results_count?: number) =>
    trackEvent('search', { metadata: { query, results_count } }),
  categoryFilter: (category: string) =>
    trackEvent('category_filter', { category }),
  addToFavorites: (listing_id: string) =>
    trackEvent('add_to_favorites', { listing_id }),
  whatsappClick: (listing_id?: string, opts?: { phone?: string }) =>
    trackEvent('whatsapp_click', { listing_id, metadata: opts }),
  phoneClick: (listing_id?: string, opts?: { phone?: string }) =>
    trackEvent('phone_click', { listing_id, metadata: opts }),
  startBooking: (listing_id: string, category?: string) =>
    trackEvent('start_booking', { listing_id, category }),
  bookingSubmitted: (listing_id: string, total_amount?: number) =>
    trackEvent('booking_submitted', { listing_id, metadata: { total_amount } }),
  bookingCompleted: (listing_id: string, booking_id: string, total_amount?: number) =>
    trackEvent('booking_completed', { listing_id, metadata: { booking_id, total_amount } }),
  ctaClickAddListing: (source?: string) =>
    trackEvent('cta_click_add_listing', { metadata: { source } }),
  signupStarted: (source?: string) =>
    trackEvent('signup_started', { metadata: { source } }),
  signupCompleted: (role?: string) =>
    trackEvent('signup_completed', { metadata: { role } }),
}

/**
 * React hook: fires page_view on mount.
 * Usage: useTrackPageView() at the top of any page component.
 */
export function useTrackPageView(extraMetadata?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  // Lazy import to avoid circular deps when used in server components
  // Note: this only runs in client components
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { useEffect } = require('react')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    track.pageView({ metadata: extraMetadata })
  }, [])
}
