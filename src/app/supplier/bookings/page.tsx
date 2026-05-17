'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Loader2, Lock, MapPin,
  Image as ImageIcon, Inbox, Hash, AlertCircle,
} from 'lucide-react'

// ============================================================================
// /supplier/bookings
// Supplier's incoming bookings list.
// ============================================================================

interface BookingItem {
  id: string
  reference_code: string | null
  start_at: string
  end_at: string
  base_amount: number | string
  total_amount: number | string
  supplier_payout: number | string
  currency: string
  status: string
  customer_notes: string | null
  created_at: string
  listing: {
    title: string
    slug: string
    photos: { url: string; is_primary: boolean }[] | null
  } | null
  customer: {
    full_name: string | null
    phone: string | null
  } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'جديد - في انتظار الموافقة', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-800' },
  active: { label: 'نشط', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'تم', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'مسترد', color: 'bg-gray-100 text-gray-700' },
}

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending_payment', label: 'قيد المراجعة' },
  { key: 'confirmed', label: 'مؤكدة' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'cancelled', label: 'ملغية' },
]

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'ready'

export default function SupplierBookingsPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)

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
        .select('id, kyc_status')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (!sup) {
        setStage('no-supplier')
        return
      }
      setSupplierId(sup.id)
      setStage('ready')
      loadBookings(sup.id, 'all')
    }
    init()
  }, [])

  const loadBookings = async (supId: string, currentFilter: string) => {
    setLoading(true)
    // @ts-expect-error
    let query = supabaseBrowser
      .from('marketplace_bookings')
      .select(`
        id, reference_code, start_at, end_at, base_amount, total_amount, supplier_payout,
        currency, status, customer_notes, created_at,
        listing:listings(title, slug, photos:listing_photos(url, is_primary)),
        customer:profiles!marketplace_bookings_customer_id_fkey(full_name, phone)
      `)
      .eq('supplier_id', supId)
      .order('created_at', { ascending: false })

    if (currentFilter !== 'all') {
      query = query.eq('status', currentFilter)
    }

    const { data } = await query
    setBookings((data || []) as BookingItem[])
    setLoading(false)
  }

  useEffect(() => {
    if (supplierId) loadBookings(supplierId, filter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

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
          <Lock className="w-8 h-8 text-[#1F6F5F] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent('/supplier/bookings')}`}
            className="block w-full bg-[#1F6F5F] text-white py-3 rounded-xl font-semibold"
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
          <h1 className="font-bold mb-2">مش مسجل كمورد</h1>
          <Link href="/supplier/register" className="inline-block bg-[#1F6F5F] text-white px-5 py-2.5 rounded-xl font-semibold mt-4">
            سجّل كمورد
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
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/supplier/marketplace" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">الحجوزات الواردة</h1>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-[#1F6F5F] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">مفيش حجوزات</h3>
            <p className="text-sm text-gray-500">لما يجي حجز جديد، هيظهر هنا</p>
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
                      {b.customer && (
                        <p className="text-xs text-gray-600">
                          {b.customer.full_name || b.customer.phone || 'عميل'}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(b.start_at)} → {formatDate(b.end_at)}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        <div>
                          <p className="text-xs text-gray-500">صافي العائد</p>
                          <p className="font-bold text-[#1F6F5F]">
                            {Number(b.supplier_payout).toLocaleString('ar-EG')} {b.currency}
                          </p>
                        </div>
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
