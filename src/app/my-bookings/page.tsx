'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Clock, Loader2, CheckCircle, X,
  Lock, MapPin, Image as ImageIcon, AlertCircle, Inbox,
  Hash,
} from 'lucide-react'

// ============================================================================
// /my-bookings
// Customer's bookings list.
// ============================================================================

interface BookingItem {
  id: string
  reference_code: string | null
  start_at: string
  end_at: string
  total_amount: number | string
  currency: string
  status: string
  created_at: string
  listing: {
    title: string
    slug: string
    city: string | null
    district: string | null
    photos: { url: string; is_primary: boolean }[] | null
  } | null
  supplier: {
    business_name: string
  } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'في انتظار التأكيد', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-800' },
  active: { label: 'نشط', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'تم', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'مسترد', color: 'bg-gray-100 text-gray-700' },
}

type Stage = 'loading' | 'unauthenticated' | 'ready'

export default function MyBookingsPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [bookings, setBookings] = useState<BookingItem[]>([])

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
          listing:listings(title, slug, city, district, photos:listing_photos(url, is_primary)),
          supplier:marketplace_suppliers(business_name)
        `)
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })

      setBookings((data || []) as BookingItem[])
      setStage('ready')
    }
    init()
  }, [])

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#1F5F3F] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent('/my-bookings')}`}
            className="block w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold"
          >
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">حجوزاتي</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">مفيش حجوزات لسه</h3>
            <p className="text-sm text-gray-500 mb-6">تصفّح الـmarketplace واحجز اللي يعجبك</p>
            <Link
              href="/marketplace"
              className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold"
            >
              تصفح Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => {
              const status = STATUS_LABELS[b.status] || STATUS_LABELS.pending_payment
              const photos = b.listing?.photos || []
              const primary = photos.find(p => p.is_primary) || photos[0]
              const photoUrl = primary?.url

              return (
                <Link
                  key={b.id}
                  href={`/bookings/${b.id}`}
                  className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
                >
                  <div className="flex">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 flex-shrink-0">
                      {photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 truncate flex-1">{b.listing?.title || 'حجز'}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      {b.supplier && (
                        <p className="text-xs text-gray-500">{b.supplier.business_name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(b.start_at)} → {formatDate(b.end_at)}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        <span className="font-bold text-[#1F5F3F]">
                          {Number(b.total_amount).toLocaleString('ar-EG')} {b.currency}
                        </span>
                        {b.reference_code && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Hash className="w-3 h-3" /> {b.reference_code}
                          </span>
                        )}
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
