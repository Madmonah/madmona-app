'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Calendar, Clock, MapPin, Loader2, ArrowRight, Lock,
  AlertCircle, ChevronLeft, Image as ImageIcon, Package,
} from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'

// ============================================================================
// /account/bookings
// Customer bookings list.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'ready'

interface BookingSummary {
  id: string
  reference_code: string | null
  start_at: string
  end_at: string
  total_amount: number
  currency: string
  status: string
  created_at: string
  listing: {
    id: string
    slug: string
    title: string
    city: string | null
    district: string | null
    photos: { url: string; is_primary: boolean }[] | null
  } | null
}

const STATUS_LABELS: Record<string, { labelKey: string; color: string }> = {
  pending_payment: { labelKey: 'bstatus.pending_payment', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { labelKey: 'bstatus.confirmed', color: 'bg-green-100 text-green-800' },
  active: { labelKey: 'bstatus.active', color: 'bg-blue-100 text-blue-800' },
  completed: { labelKey: 'bstatus.completed', color: 'bg-gray-100 text-gray-700' },
  cancelled: { labelKey: 'bstatus.cancelled', color: 'bg-red-100 text-red-800' },
  refunded: { labelKey: 'bstatus.refunded', color: 'bg-purple-100 text-purple-800' },
}

export default function CustomerBookingsPage() {
  const { t, lang, dir } = useT()
  const [stage, setStage] = useState<Stage>('loading')
  const [bookings, setBookings] = useState<BookingSummary[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      // @ts-expect-error
      const { data } = await supabaseBrowser
        .from('marketplace_bookings')
        .select(`
          id, reference_code, start_at, end_at, total_amount, currency, status, created_at,
          listing:listings(
            id, slug, title, city, district,
            photos:listing_photos(url, is_primary)
          )
        `)
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })

      setBookings((data || []) as BookingSummary[])
      setStage('ready')
    }
    init()
  }, [])

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir={dir}>
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir={dir}>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#2B4521] mx-auto mb-3" />
          <h1 className="font-bold mb-4">{t('booking.login_first')}</h1>
          <Link
            href="/auth/login?redirect=/account/bookings"
            className="block bg-[#2B4521] text-white py-3 rounded-xl font-semibold"
          >
            {t('auth.login.title')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir={dir}>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/account" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{t('account.my_bookings')}</h1>
            <p className="text-xs text-gray-500">{t('account.n_bookings', { n: bookings.length })}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">{t('account.no_bookings')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('account.bookings_empty_sub')}</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 bg-[#2B4521] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2B4521]/90"
            >
              {t('listing.browse_marketplace')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(booking => {
              const status = STATUS_LABELS[booking.status] || STATUS_LABELS.pending_payment
              const photos = booking.listing?.photos || []
              const primary = photos.find(p => p.is_primary) || photos[0]
              const photoUrl = primary?.url
              const start = new Date(booking.start_at)
              const end = new Date(booking.end_at)

              return (
                <Link
                  key={booking.id}
                  href={`/account/bookings/${booking.id}`}
                  className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-32 sm:h-28 bg-gray-100 flex-shrink-0 relative">
                      {photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide the broken image and show the fallback icon underneath
                            const img = e.currentTarget
                            img.style.display = 'none'
                            const sibling = img.nextElementSibling as HTMLElement | null
                            if (sibling) sibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full items-center justify-center absolute inset-0"
                        style={{ display: photoUrl ? 'none' : 'flex' }}
                      >
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                    </div>

                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-sm truncate flex-1">
                          {booking.listing?.title || t('account.listing_deleted')}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${status.color}`}>
                          {t(status.labelKey)}
                        </span>
                      </div>

                      {booking.reference_code && (
                        <p className="text-xs text-gray-400 mb-2">#{booking.reference_code}</p>
                      )}

                      {booking.listing && (booking.listing.district || booking.listing.city) && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3" />
                          {[booking.listing.district, booking.listing.city].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}
                        </p>
                      )}

                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                        <Clock className="w-3 h-3" />
                        {start.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' '}
                        {start.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        {' '}
                        - {end.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-sm">
                          <strong className="text-[#2B4521]">{Number(booking.total_amount).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</strong>
                          <span className="text-xs text-gray-500"> {t('common.egp')}</span>
                        </span>
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
