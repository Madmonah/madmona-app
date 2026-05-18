'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Clock, MapPin, MessageCircle, Loader2,
  AlertCircle, CheckCircle, X, Star, Image as ImageIcon, Lock,
  Building2, Hash, FileText,
} from 'lucide-react'
import InstaPayPaymentBox from '@/components/payment/InstaPayPaymentBox'

// ============================================================================
// /account/bookings/[id]
// Customer booking detail. Shows status, payment instructions, review form.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'not-found' | 'ready'

interface BookingDetail {
  id: string
  reference_code: string | null
  customer_id: string
  listing_id: string
  supplier_id: string
  start_at: string
  end_at: string
  base_amount: number
  commission_amount: number
  tax_amount: number
  total_amount: number
  currency: string
  status: string
  customer_notes: string | null
  supplier_notes: string | null
  cancellation_reason: string | null
  confirmed_at: string | null
  completed_at: string | null
  created_at: string
  listing: {
    id: string
    slug: string
    title: string
    city: string | null
    district: string | null
    address: string | null
    photos: { url: string; is_primary: boolean }[] | null
  } | null
  supplier: {
    id: string
    business_name: string
    profile: { phone: string; full_name: string | null } | null
  } | null
}

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  pending_payment: {
    label: 'بانتظار الدفع',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'تواصل مع المورد لتأكيد الدفع وبدء الحجز.',
  },
  confirmed: {
    label: 'مؤكّد',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'الحجز مؤكّد. هتلقى المورد جاهز في الموعد المحدد.',
  },
  active: {
    label: 'جاري',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'الحجز شغّال دلوقتي.',
  },
  completed: {
    label: 'تمّ',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'الحجز خلص. لو حابب، قيّم تجربتك.',
  },
  cancelled: {
    label: 'ملغي',
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'الحجز اتلغى.',
  },
  refunded: {
    label: 'تم الاسترداد',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'تم استرداد المبلغ.',
  },
}

export default function CustomerBookingDetailPage() {
  const params = useParams()
  const bookingId = params?.id as string

  const [stage, setStage] = useState<Stage>('loading')
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [review, setReview] = useState<Review | null>(null)

  // Review form
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Cancel
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      // @ts-expect-error
      const { data: b, error } = await supabaseBrowser
        .from('marketplace_bookings')
        .select(`
          *,
          listing:listings(
            id, slug, title, city, district, address,
            photos:listing_photos(url, is_primary)
          ),
          supplier:marketplace_suppliers(
            id, business_name,
            profile:profiles!marketplace_suppliers_profile_id_fkey(phone, full_name)
          )
        `)
        .eq('id', bookingId)
        .eq('customer_id', session.user.id)
        .maybeSingle()

      if (error || !b) {
        setStage('not-found')
        return
      }

      setBooking(b as BookingDetail)

      // Fetch existing review
      // @ts-expect-error
      const { data: rev } = await supabaseBrowser
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('booking_id', bookingId)
        .maybeSingle()

      if (rev) setReview(rev as Review)
      setStage('ready')
    }
    init()
  }, [bookingId])

  const handleCancelBooking = async () => {
    if (!booking) return
    setCancelling(true)
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('marketplace_bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: cancelReason.trim() || null,
        cancelled_by: booking.customer_id,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    setCancelling(false)
    if (!error) {
      setBooking({ ...booking, status: 'cancelled', cancellation_reason: cancelReason.trim() || null })
      setShowCancelForm(false)
    } else {
      alert('فشل الإلغاء: ' + error.message)
    }
  }

  const handleSubmitReview = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!booking) return
    setReviewError(null)
    if (rating < 1 || rating > 5) {
      setReviewError('اختار تقييم من 1 لـ 5 نجوم')
      return
    }

    setSubmittingReview(true)
    // @ts-expect-error
    const { data: newReview, error } = await supabaseBrowser
      .from('reviews')
      .insert({
        booking_id: booking.id,
        customer_id: booking.customer_id,
        listing_id: booking.listing_id,
        supplier_id: booking.supplier_id,
        rating,
        comment: comment.trim() || null,
      })
      .select('id, rating, comment, created_at')
      .single()

    setSubmittingReview(false)
    if (error) {
      setReviewError(error.message || 'فشل حفظ التقييم')
      return
    }
    setReview(newReview as Review)
  }

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
            href={`/auth/login?redirect=/account/bookings/${bookingId}`}
            className="block bg-[#1F6F5F] text-white py-3 rounded-xl font-semibold"
          >
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'not-found' || !booking) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h1 className="font-bold mb-2">الحجز ده مش موجود</h1>
          <Link href="/account/bookings" className="inline-block bg-[#1F6F5F] text-white px-5 py-2.5 rounded-xl font-semibold mt-4">
            ارجع للحجوزات
          </Link>
        </div>
      </div>
    )
  }

  const status = STATUS_LABELS[booking.status] || STATUS_LABELS.pending_payment
  const photos = booking.listing?.photos || []
  const primary = photos.find(p => p.is_primary) || photos[0]
  const photoUrl = primary?.url
  const start = new Date(booking.start_at)
  const end = new Date(booking.end_at)

  const supplierPhone = booking.supplier?.profile?.phone || ''
  const phoneClean = supplierPhone.replace(/\D/g, '')
  const whatsappMsg = encodeURIComponent(
    `مرحباً، أنا ${booking.supplier?.profile?.full_name || ''} والحجز رقم ${booking.reference_code || booking.id.slice(0, 8)}.\nعايز أأكد الدفع.`
  )

  const canCancel = ['pending_payment', 'confirmed'].includes(booking.status)
  const canReview = booking.status === 'completed' && !review

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/account/bookings" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-gray-900">تفاصيل الحجز</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Status banner */}
        <div className={`rounded-2xl border p-4 ${status.color}`}>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{status.label}</p>
              <p className="text-sm mt-0.5">{status.description}</p>
            </div>
          </div>
        </div>

        {/* Listing info */}
        {booking.listing && (
          <Link
            href={`/marketplace/${booking.listing.slug}`}
            className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
          >
            <div className="flex">
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
              <div className="flex-1 p-3">
                <h3 className="font-bold text-gray-900 text-sm">{booking.listing.title}</h3>
                {(booking.listing.district || booking.listing.city) && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {[booking.listing.district, booking.listing.city].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Booking details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">تفاصيل الحجز</h2>

          {booking.reference_code && (
            <div className="flex items-center gap-3 text-sm">
              <Hash className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">رقم الحجز</p>
                <p className="font-medium font-mono">{booking.reference_code}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 text-sm">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">من</p>
              <p className="font-medium">
                {start.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                <br />
                {start.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-gray-500 mt-2">إلى</p>
              <p className="font-medium">
                {end.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                <br />
                {end.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {booking.supplier && (
            <div className="flex items-center gap-3 text-sm pt-3 border-t border-gray-100">
              <Building2 className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">المورد</p>
                <p className="font-medium">{booking.supplier.business_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Pricing breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <h2 className="text-sm font-bold text-gray-900 mb-2">المبلغ</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">السعر الأساسي</span>
            <span>{Number(booking.base_amount).toLocaleString('ar-EG')} ج.م</span>
          </div>
          {Number(booking.tax_amount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ضريبة</span>
              <span>{Number(booking.tax_amount).toLocaleString('ar-EG')} ج.م</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
            <span>الإجمالي</span>
            <span className="text-[#1F6F5F]">{Number(booking.total_amount).toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>

        {/* InstaPay payment box — only when payment is pending (Phase X, May 18 2026).
            Pulls saved account/IPA/payment_link from site_settings via /api/payment/instapay.
            Pre-fills the booking total + reference so customer can include it in the
            InstaPay note field. */}
        {booking.status === 'pending_payment' && (
          <InstaPayPaymentBox
            amount={Number(booking.total_amount)}
            reference={booking.reference_code || booking.id.slice(0, 8)}
          />
        )}

        {/* Notes */}
        {booking.customer_notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> ملاحظاتك
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.customer_notes}</p>
          </div>
        )}

        {booking.supplier_notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1F6F5F]" /> ملاحظات المورد
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.supplier_notes}</p>
          </div>
        )}

        {/* Cancellation reason */}
        {booking.status === 'cancelled' && booking.cancellation_reason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-red-900 mb-1">سبب الإلغاء</h2>
            <p className="text-sm text-red-800">{booking.cancellation_reason}</p>
          </div>
        )}

        {/* WhatsApp CTA — for pending_payment + confirmed */}
        {['pending_payment', 'confirmed'].includes(booking.status) && phoneClean && (
          <a
            href={`https://wa.me/${phoneClean}?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-xl font-semibold hover:bg-[#1da851] no-underline"
          >
            <MessageCircle className="w-5 h-5" />
            تواصل واتساب مع المورد
          </a>
        )}

        {/* Cancel section */}
        {canCancel && !showCancelForm && (
          <button
            onClick={() => setShowCancelForm(true)}
            className="w-full text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg"
          >
            ألغي الحجز
          </button>
        )}

        {showCancelForm && (
          <div className="bg-white rounded-2xl border border-red-200 p-4 space-y-3">
            <h2 className="text-sm font-bold text-red-900">إلغاء الحجز</h2>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="سبب الإلغاء (اختياري)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'جاري الإلغاء...' : 'أكّد الإلغاء'}
              </button>
              <button
                onClick={() => setShowCancelForm(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
              >
                تراجع
              </button>
            </div>
          </div>
        )}

        {/* Review section */}
        {review && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-3">تقييمك</h2>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${s <= review.rating ? 'fill-[#2FA084] text-[#2FA084]' : 'text-gray-200'}`}
                />
              ))}
              <span className="text-sm font-medium text-gray-700 mr-2">{review.rating}/5</span>
            </div>
            {review.comment && (
              <p className="text-sm text-gray-700 mt-2">{review.comment}</p>
            )}
          </div>
        )}

        {canReview && (
          <form onSubmit={handleSubmitReview} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="text-sm font-bold text-gray-900">قيّم تجربتك</h2>

            <div className="flex items-center gap-1 justify-center py-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 ${s <= rating ? 'fill-[#2FA084] text-[#2FA084]' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="شارك تجربتك (اختياري)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30"
            />

            {reviewError && (
              <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg text-sm text-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{reviewError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingReview || rating === 0}
              className="w-full bg-[#1F6F5F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F6F5F]/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submittingReview ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
              ) : (
                <><Star className="w-4 h-4" /> أرسل التقييم</>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
