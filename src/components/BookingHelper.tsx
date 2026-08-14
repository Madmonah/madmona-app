'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { MessageCircle, X, Phone, Check, Loader2 } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import { safeStorage } from '@/lib/safe-storage'

// ============================================================================
// BookingHelper — multi-purpose conversion-rescue widget
//
// Behavior:
//   - For ANONYMOUS visitors: shows a phone-capture card after 20s
//     ("سيب رقمك ونساعدك تحجز")
//   - For AUTHENTICATED visitors: shows a "concierge" card after 45s
//     with no submit ("في مشكلة؟ كلّمنا واتساب")
//   - Saves all captures to phone_captures via capture_phone RPC
//   - Tracks every show + interaction in site_events
//
// Mounted on:
//   - /marketplace/[slug]/book (booking page) — primary placement
//   - Can be extended to listing detail pages later
//
// Brand: deep green (#059669) + gold (#2FA084) + clean ivory
// ============================================================================

interface Props {
  listingId?: string | null
  listingTitle?: string | null
  listingSlug?: string | null
  // If true (auth'd user), show concierge mode. If false, show phone capture.
  isAuthenticated: boolean
  // Delay in ms before showing the widget. Defaults differ by mode.
  delayMs?: number
}

const ADMIN_WHATSAPP = '+201002229982'

// Stable visitor ID (same as analytics.ts)
function getVisitorId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let id = safeStorage.get('madmona_visitor_id')
    if (!id) {
      id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      safeStorage.set('madmona_visitor_id', id)
    }
    return id
  } catch { return 'anon' }
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let id = sessionStorage.getItem('madmona_session_id')
    if (!id) {
      id = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('madmona_session_id', id)
    }
    return id
  } catch { return 'anon' }
}

// Has user already been shown this widget on this listing?
function getDismissKey(listingId: string | null | undefined): string {
  return `madmona_booking_helper_dismissed_${listingId || 'global'}`
}

export default function BookingHelper({
  listingId,
  listingTitle,
  listingSlug,
  isAuthenticated,
  delayMs,
}: Props) {
  const { t, dir } = useT()
  const [visible, setVisible] = useState(false)
  const [stage, setStage] = useState<'prompt' | 'submitting' | 'success'>('prompt')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Don't show if already dismissed this session
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (sessionStorage.getItem(getDismissKey(listingId))) return
    } catch { /* ignore */ }

    const ms = delayMs ?? (isAuthenticated ? 45_000 : 20_000)
    const timer = setTimeout(() => {
      setVisible(true)
      // Track the show event (best-effort)
      void supabaseBrowser.rpc('track_event', {
        p_event_type: 'booking_helper_shown',
        p_visitor_id: getVisitorId(),
        p_session_id: getSessionId(),
        p_listing_id: listingId || undefined,
        p_category: undefined,
        p_page_url: typeof window !== 'undefined' ? window.location.pathname : undefined,
        p_metadata: { mode: isAuthenticated ? 'concierge' : 'phone_capture' },
      }).then(() => { /* ok */ }, () => { /* ignore */ })
    }, ms)

    return () => clearTimeout(timer)
  }, [delayMs, isAuthenticated, listingId])

  const dismiss = useCallback((reason: 'closed' | 'submitted' | 'whatsapp_click') => {
    try {
      sessionStorage.setItem(getDismissKey(listingId), '1')
    } catch { /* ignore */ }
    setVisible(false)
    void supabaseBrowser.rpc('track_event', {
      p_event_type: 'booking_helper_dismissed',
      p_visitor_id: getVisitorId(),
      p_session_id: getSessionId(),
      p_listing_id: listingId || undefined,
      p_category: undefined,
      p_page_url: typeof window !== 'undefined' ? window.location.pathname : undefined,
      p_metadata: { reason },
    }).then(() => { /* ok */ }, () => { /* ignore */ })
  }, [listingId])

  const handleSubmit = useCallback(async () => {
    setError(null)
    // Validate Egyptian phone format
    const cleaned = phone.replace(/[^\d+]/g, '')
    const isValid = /^(\+?20)?01\d{9}$/.test(cleaned)
    if (!isValid) {
      setError(t('comp.bh.err_phone'))
      return
    }
    setStage('submitting')
    try {
      const { error: rpcErr } = await supabaseBrowser.rpc('capture_phone', {
        p_phone: cleaned,
        p_visitor_id: getVisitorId(),
        p_session_id: getSessionId(),
        p_page_url: typeof window !== 'undefined' ? window.location.pathname : undefined,
        p_listing_id: listingId || undefined,
        p_capture_context: 'booking_helper',
        p_user_name: name.trim() || undefined,
        p_notes: undefined,
        p_metadata: { listing_title: listingTitle, listing_slug: listingSlug },
      })
      if (rpcErr) throw new Error(rpcErr.message)
      setStage('success')
      // Track success
      void supabaseBrowser.rpc('track_event', {
        p_event_type: 'phone_captured',
        p_visitor_id: getVisitorId(),
        p_session_id: getSessionId(),
        p_listing_id: listingId || undefined,
        p_category: undefined,
        p_page_url: typeof window !== 'undefined' ? window.location.pathname : undefined,
        p_metadata: { source: 'booking_helper' },
      }).then(() => { /* ok */ }, () => { /* ignore */ })
      // Auto-dismiss after showing success for 4 seconds
      setTimeout(() => dismiss('submitted'), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('comp.bh.err_generic'))
      setStage('prompt')
    }
  }, [phone, name, listingId, listingTitle, listingSlug, dismiss])

  const handleWhatsAppClick = useCallback(() => {
    const msg = listingTitle
      ? `مرحباً، شفت "${listingTitle}" على مضمونة وعايز أحجز. ممكن تساعدوني؟`
      : 'مرحباً، عايز أحجز على مضمونة وعايز مساعدة'
    void supabaseBrowser.rpc('track_event', {
      p_event_type: 'whatsapp_click',
      p_visitor_id: getVisitorId(),
      p_session_id: getSessionId(),
      p_listing_id: listingId || undefined,
      p_category: undefined,
      p_page_url: typeof window !== 'undefined' ? window.location.pathname : undefined,
      p_metadata: { source: 'booking_helper' },
    }).then(() => { /* ok */ }, () => { /* ignore */ })
    window.open(
      `https://wa.me/${ADMIN_WHATSAPP.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    )
    dismiss('whatsapp_click')
  }, [listingTitle, listingId, dismiss])

  if (!visible) return null

  return (
    <div
      dir={dir}
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-md mx-auto sm:mx-0 animate-slide-up"
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="bg-white rounded-2xl border-2 border-[#059669]/20 shadow-2xl overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 bg-gradient-to-l from-[#34D399] to-[#2a7a52] px-4 py-2.5 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <p className="text-sm font-bold truncate">{t('comp.bh.header')}</p>
          </div>
          <button
            onClick={() => dismiss('closed')}
            className="p-1 hover:bg-white/15 rounded-full transition-colors"
            aria-label={t('comp.bh.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {stage === 'success' ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-700" />
              </div>
              <h3 className="font-bold text-[#059669] mb-1">{t('comp.bh.success_title')}</h3>
              <p className="text-xs text-gray-600">{t('comp.bh.success_sub')}</p>
            </div>
          ) : isAuthenticated ? (
            // Concierge mode for authenticated users (they have an account but maybe stuck)
            <>
              <h3 className="font-bold text-gray-900 mb-1.5">{t('comp.bh.concierge_title')}</h3>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                {t('comp.bh.concierge_sub')}
              </p>
              <button
                onClick={handleWhatsAppClick}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold py-2.5 px-4 rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {t('comp.bh.wa_send')}
              </button>
            </>
          ) : (
            // Phone-capture mode for anonymous visitors
            <>
              <h3 className="font-bold text-gray-900 mb-1.5">{t('comp.bh.capture_title')}</h3>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                {listingTitle
                  ? t('comp.bh.capture_sub_listing', { title: listingTitle })
                  : t('comp.bh.capture_sub')}
              </p>
              <div className="space-y-2 mb-3">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 14))}
                  placeholder={t('comp.bh.phone_ph')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  inputMode="tel"
                  autoComplete="tel"
                />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value.slice(0, 60))}
                  placeholder={t('comp.bh.name_ph')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669]"
                  autoComplete="name"
                />
              </div>
              {error && (
                <p className="text-xs text-red-700 mb-2">{error}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={stage === 'submitting' || phone.length < 10}
                className="w-full flex items-center justify-center gap-2 bg-[#34D399] hover:bg-[#34D399]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#04352A] font-bold py-2.5 px-4 rounded-xl transition-colors"
              >
                {stage === 'submitting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                <span>{t('comp.bh.cta')}</span>
              </button>
              <button
                onClick={handleWhatsAppClick}
                className="w-full mt-2 text-xs text-[#059669] hover:underline"
              >
                {t('comp.bh.or_wa')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
