'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Calendar, Clock, MapPin, Loader2, ArrowRight, Lock,
  AlertCircle, ChevronLeft, Image as ImageIcon, Package,
  User, Filter,
} from 'lucide-react'

// ============================================================================
// /supplier/marketplace/bookings
// Supplier bookings management — see all incoming bookings.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'ready'
type StatusFilter = 'all' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled'

interface BookingSummary {
  id: string
  reference_code: string | null
  start_at: string
  end_at: string
  total_amount: number
  status: string
  customer_notes: string | null
  created_at: string
  listing: {
    id: string
    title: string
    photos: { url: string; is_primary: boolean }[] | null
  } | null
  customer: {
    id: string
    phone: string | null
    full_name: string | null
  } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'بانتظار الدفع', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكّد', color: 'bg-green-100 text-green-800' },
  active: { label: 'جاري', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'تمّ', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'تم الاسترداد', color: 'bg-purple-100 text-purple-800' },
}

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'pending_payment', label: 'بانتظار الدفع' },
  { key: 'confirmed', label: 'مؤكّد' },
  { key: 'completed', label: 'تمّ' },
  { key: 'cancelled', label: 'ملغي' },
]

export default function SupplierBookingsPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [bookings, setBookings] = useState<BookingSummary[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [supplierName, setSupplierName] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      // @ts-expect-error
      const { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, business_name')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (!sup) {
        setStage('no-supplier')
        return
      }
      setSupplierName(sup.business_name)

      // @ts-expect-error
      const { data } = await supabaseBrowser
        .from('marketplace_bookings')
        .select(`
          id, reference_code, start_at, end_at, total_amount, status, customer_notes, created_at,
          listing:listings(id, title, photos:listing_photos(url, is_primary)),
          customer:profiles!marketplace_bookings_customer_id_fkey(id, phone, full_name)
        `)
        .eq('supplier_id', sup.id)
        .order('created_at', { ascending: false })

      setBookings((data || []) as BookingSummary[])
      setStage('ready')
    }
    init()
  }, [])

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

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
            href="/auth/login?redirect=/supplier/marketplace/bookings"
            className="block bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold"
          >
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'no-supplier') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مش مورد على Madmona</h1>
          <Link href="/supplier/register" className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold mt-4">
            سجّل كمورد
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/supplier/marketplace" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">حجوزات {supplierName}</h1>
              <p className="text-xs text-gray-500">{bookings.length} حجز</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTER_TABS.map(tab => {
              const count = tab.key === 'all' ? bookings.length : bookings.filter(b => b.status === tab.key).length
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filter === tab.key
                      ? 'bg-[#1F5F3F] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label} {count > 0 && <span className="opacity-75">({count})</span>}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              {filter === 'all' ? 'مفيش حجوزات لسه' : 'مفيش حجوزات في الفئة دي'}
            </h3>
            <p className="text-sm text-gray-500">لما يحجزلك حد، هتلاقيه هنا.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(booking => {
              const status = STATUS_LABELS[booking.status] || STATUS_LABELS.pending_payment
              const photos = booking.listing?.photos || []
              const primary = photos.find(p => p.is_primary) || photos[0]
              const photoUrl = primary?.url
              const start = new Date(booking.start_at)
              const end = new Date(booking.end_at)

              return (
                <Link
                  key={booking.id}
                  href={`/supplier/marketplace/bookings/${booking.id}`}
                  className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-32 sm:h-28 bg-gray-100 flex-shrink-0">
                      {photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-sm truncate flex-1">
                          {booking.listing?.title || 'Listing محذوف'}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {booking.reference_code && (
                        <p className="text-xs text-gray-400 font-mono mb-2">#{booking.reference_code}</p>
                      )}

                      {booking.customer && (
                        <p className="text-xs text-gray-700 flex items-center gap-1 mb-1">
                          <User className="w-3 h-3 text-gray-400" />
                          {booking.customer.full_name || booking.customer.phone || 'عميل'}
                        </p>
                      )}

                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                        <Clock className="w-3 h-3" />
                        {start.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                        {' '}
                        {start.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {end.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                        {' '}
                        {end.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-sm">
                          <strong className="text-[#1F5F3F]">{Number(booking.total_amount).toLocaleString('ar-EG')}</strong>
                          <span className="text-xs text-gray-500"> ج.م</span>
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
