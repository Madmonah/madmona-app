'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Clock, Loader2, AlertCircle, CheckCircle,
  Lock, MapPin, Image as ImageIcon, Building2, MessageCircle, Hash,
  CreditCard, X, AlertTriangle,
} from 'lucide-react'

// ============================================================================
// /bookings/[id]
// 
// Booking detail page — shows status, listing summary, schedule, pricing.
// Customer can view; supplier sees actions to confirm/cancel.
// ============================================================================

interface Booking {
  id: string
  reference_code: string | null
  customer_id: string
  listing_id: string
  supplier_id: string
  start_at: string
  end_at: string
  base_amount: number | string
  commission_amount: number | string
  total_amount: number | string
  currency: string
  status: string
  customer_notes: string | null
  supplier_notes: string | null
  cancellation_reason: string | null
  confirmed_at: string | null
  cancelled_at: string | null
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
    profile: { phone: string | null } | null
  } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending_payment: { label: 'في انتظار التأكيد', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  active: { label: 'نشط', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  completed: { label: 'تم الإكمال', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800 border-red-200', icon: X },
  refunded: { label: 'مسترد', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertCircle },
}

function BookingDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const bookingId = params?.id as string
  const justCreated = searchParams.get('created') === '1'

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState(false)
  const [isOwnerSupplier, setIsOwnerSupplier] = useState(false)
  const [isOwnerCustomer, setIsOwnerCustomer] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setError('سجّل دخول الأول')
        setLoading(false)
        return
      }
      setUserId(session.user.id)

      // @ts-expect-error
      const { data, error: fetchErr } = await supabaseBrowser
        .from('marketplace_bookings')
        .select(`
          *,
          listing:listings(title, slug, city, district, photos:listing_photos(url, is_primary)),
          supplier:marketplace_suppliers(
            business_name, profile_id,
            profile:profiles!marketplace_suppliers_profile_id_fkey(phone)
          )
        `)
        .eq('id', bookingId)
        .maybeSingle()

      if (fetchErr || !data) {
        setError('الحجز ده مش موجود أو مش مصرحلك تشوفه')
        setLoading(false)
        return
      }

      setBooking(data as Booking)
      setIsOwnerCustomer(data.customer_id === session.user.id)

      // Check if current user is the supplier
      // @ts-expect-error
      const { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id')
        .eq('profile_id', session.user.id)
        .eq('id', data.supplier_id)
        .maybeSingle()
      if (sup) setIsOwnerSupplier(true)

      setLoading(false)
    }
    load()
  }, [bookingId])

  const updateBookingStatus = async (newStatus: string, reason?: string) => {
    if (!booking) return
    setActioning(true)

    const update: any = { status: newStatus }
    if (newStatus === 'confirmed') update.confirmed_at = new Date().toISOString()
    if (newStatus === 'cancelled') {
      update.cancelled_at = new Date().toISOString()
      update.cancelled_by = userId
      if (reason) update.cancellation_reason = reason
    }

    // @ts-expect-error
    const { error: updateErr } = await supabaseBrowser
      .from('marketplace_bookings')
      .update(update)
      .eq('id', booking.id)

    if (updateErr) {
      alert('فشل تحديث الحجز: ' + updateErr.message)
    } else {
      // Reload
      // @ts-expect-error
      const { data: refreshed } = await supabaseBrowser
        .from('marketplace_bookings')
        .select(`
          *,
          listing:listings(title, slug, city, district, photos:listing_photos(url, is_primary)),
          supplier:marketplace_suppliers(
            business_name,
            profile:profiles!marketplace_suppliers_profile_id_fkey(phone)
          )
        `)
        .eq('id', booking.id)
        .maybeSingle()
      if (refreshed) setBooking(refreshed as Booking)
    }
    setActioning(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h1 className="font-bold mb-4">{error || 'الحجز مش موجود'}</h1>
          <Link href="/" className="bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold">
            الرئيسية
          </Link>
        </div>
      </div>
    )
  }

  const status = STATUS_LABELS[booking.status] || STATUS_LABELS.pending_payment
  const StatusIcon = status.icon
  const photos = booking.listing?.photos || []
  const primary = photos.find(p => p.is_primary) || photos[0]
  const photoUrl = primary?.url

  const supplierPhone = booking.supplier?.profile?.phone || ''
  const phoneClean = supplierPhone.replace(/\D/g, '')

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={isOwnerSupplier ? '/supplier/bookings' : '/my-bookings'} className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-gray-900">تفاصيل الحجز</h1>
          <div className="w-7" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-12">
        {justCreated && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-900">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>تم إنشاء الحجز! المورد هيراجعه ويأكّده قريباً.</span>
          </div>
        )}

        {/* Status badge */}
        <div className={`flex items-center gap-2 p-3 rounded-xl border mb-4 ${status.color}`}>
          <StatusIcon className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold flex-1">{status.label}</span>
          {booking.reference_code && (
            <span className="text-xs flex items-center gap-1 opacity-80">
              <Hash className="w-3 h-3" /> {booking.reference_code}
            </span>
          )}
        </div>

        {/* Listing summary */}
        {booking.listing && (
          <Link href={`/marketplace/${booking.listing.slug}`} className="block bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4 flex hover:shadow-sm transition-shadow">
            <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
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
              <h2 className="font-bold text-gray-900 truncate">{booking.listing.title}</h2>
              {booking.supplier && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {booking.supplier.business_name}
                </p>
              )}
              {(booking.listing.district || booking.listing.city) && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[booking.listing.district, booking.listing.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </Link>
        )}

        {/* Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1F5F3F]" /> الموعد
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">من</span>
              <span className="font-medium">{formatDateTime(booking.start_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">إلى</span>
              <span className="font-medium">{formatDateTime(booking.end_at)}</span>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#1F5F3F]" /> السعر
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">السعر الأساسي</span>
              <span>{Number(booking.base_amount).toLocaleString('ar-EG')} {booking.currency}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-gray-100 text-base">
              <span>الإجمالي</span>
              <span className="text-[#1F5F3F]">{Number(booking.total_amount).toLocaleString('ar-EG')} {booking.currency}</span>
            </div>
          </div>
        </div>

        {/* Customer notes */}
        {booking.customer_notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">ملاحظات العميل</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.customer_notes}</p>
          </div>
        )}

        {/* Cancellation reason */}
        {booking.cancellation_reason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <h3 className="text-sm font-bold text-red-900 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> سبب الإلغاء
            </h3>
            <p className="text-sm text-red-800">{booking.cancellation_reason}</p>
          </div>
        )}

        {/* Actions */}
        {isOwnerSupplier && booking.status === 'pending_payment' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">إجراءات</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateBookingStatus('confirmed')}
                disabled={actioning}
                className="bg-[#1F5F3F] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-4 h-4" /> أكّد الحجز
              </button>
              <button
                onClick={() => {
                  const reason = prompt('سبب الرفض (اختياري):')
                  updateBookingStatus('cancelled', reason || 'تم الرفض من المورد')
                }}
                disabled={actioning}
                className="bg-red-50 text-red-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" /> ارفض
              </button>
            </div>
          </div>
        )}

        {isOwnerSupplier && booking.status === 'confirmed' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <button
              onClick={() => updateBookingStatus('completed')}
              disabled={actioning}
              className="w-full bg-[#1F5F3F] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 inline-block ml-1" /> اعتبره مكتمل
            </button>
          </div>
        )}

        {isOwnerCustomer && (booking.status === 'pending_payment' || booking.status === 'confirmed') && (
          <button
            onClick={() => {
              if (confirm('متأكد إنك عاوز تلغي الحجز؟')) {
                const reason = prompt('سبب الإلغاء (اختياري):')
                updateBookingStatus('cancelled', reason || 'تم الإلغاء من العميل')
              }
            }}
            disabled={actioning}
            className="w-full bg-red-50 text-red-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 mb-4 flex items-center justify-center gap-1"
          >
            <X className="w-4 h-4" /> ألغي الحجز
          </button>
        )}

        {/* Contact supplier via WhatsApp */}
        {phoneClean && isOwnerCustomer && (
          <a
            href={`https://wa.me/${phoneClean}?text=${encodeURIComponent(`مرحباً، عندي استفسار بخصوص الحجز رقم ${booking.reference_code || booking.id.slice(0, 8)}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#25D366] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1da851] text-center"
          >
            <MessageCircle className="w-4 h-4 inline-block ml-1" /> تواصل مع المورد عبر واتساب
          </a>
        )}
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function BookingDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    }>
      <BookingDetailContent />
    </Suspense>
  )
}
