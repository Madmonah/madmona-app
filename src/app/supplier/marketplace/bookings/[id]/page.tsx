'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Clock, MapPin, MessageCircle, Loader2,
  AlertCircle, CheckCircle, X, Star, Image as ImageIcon, Lock,
  User, Hash, FileText, Phone, ShieldCheck, CreditCard, ShieldAlert,
} from 'lucide-react'

// ============================================================================
// /supplier/marketplace/bookings/[id]
// Supplier booking detail. Confirm/cancel/complete actions.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'not-found' | 'ready'

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
  supplier_payout: number
  currency: string
  status: string
  customer_notes: string | null
  supplier_notes: string | null
  cancellation_reason: string | null
  customer_national_id: string | null
  id_verification_status: string | null
  confirmed_at: string | null
  completed_at: string | null
  created_at: string
  listing: {
    id: string
    slug: string
    title: string
    requires_id_verification: boolean | null
    photos: { url: string; is_primary: boolean }[] | null
  } | null
  customer: {
    id: string
    phone: string | null
    full_name: string | null
  } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_id_verification: { label: 'بطاقة بانتظار الموافقة', color: 'bg-[#B8860B]/10 text-[#B8860B] border-[#B8860B]/30' },
  pending_payment: { label: 'بانتظار الدفع', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmed: { label: 'مؤكّد', color: 'bg-green-100 text-green-800 border-green-200' },
  active: { label: 'جاري', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'تمّ', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800 border-red-200' },
  refunded: { label: 'تم الاسترداد', color: 'bg-purple-100 text-purple-800 border-purple-200' },
}

export default function SupplierBookingDetailPage() {
  const params = useParams()
  const bookingId = params?.id as string

  const [stage, setStage] = useState<Stage>('loading')
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [supplierProfileId, setSupplierProfileId] = useState<string | null>(null)
  const [supplierNotes, setSupplierNotes] = useState('')

  const [updating, setUpdating] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }
      setSupplierProfileId(session.user.id)

      // @ts-expect-error
      const { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (!sup) {
        setStage('no-supplier')
        return
      }

      // @ts-expect-error
      const { data: b, error } = await supabaseBrowser
        .from('marketplace_bookings')
        .select(`
          *,
          listing:listings(id, slug, title, requires_id_verification, photos:listing_photos(url, is_primary)),
          customer:profiles!marketplace_bookings_customer_id_fkey(id, phone, full_name)
        `)
        .eq('id', bookingId)
        .eq('supplier_id', sup.id)
        .maybeSingle()

      if (error || !b) {
        setStage('not-found')
        return
      }

      setBooking(b as BookingDetail)
      setSupplierNotes(b.supplier_notes || '')
      setStage('ready')
    }
    init()
  }, [bookingId])

  const updateStatus = async (newStatus: string, extras: any = {}) => {
    if (!booking) return
    setUpdating(true)
    const update: any = {
      status: newStatus,
      ...extras,
    }
    if (newStatus === 'confirmed') update.confirmed_at = new Date().toISOString()
    if (newStatus === 'completed') update.completed_at = new Date().toISOString()
    if (newStatus === 'cancelled') {
      update.cancelled_by = supplierProfileId
      update.cancelled_at = new Date().toISOString()
    }

    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('marketplace_bookings')
      .update(update)
      .eq('id', booking.id)

    setUpdating(false)
    if (error) {
      alert('فشل التحديث: ' + error.message)
      return
    }
    setBooking({ ...booking, ...update })
    setShowCancelForm(false)
  }

  const saveSupplierNotes = async () => {
    if (!booking) return
    setUpdating(true)
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('marketplace_bookings')
      .update({ supplier_notes: supplierNotes.trim() || null })
      .eq('id', booking.id)
    setUpdating(false)
    if (error) {
      alert('فشل الحفظ: ' + error.message)
      return
    }
    setBooking({ ...booking, supplier_notes: supplierNotes.trim() || null })
  }

  // Approve or reject ID verification (transitions booking from pending_id_verification -> pending_payment OR cancelled)
  const updateIdVerification = async (decision: 'approved' | 'rejected') => {
    if (!booking) return
    setUpdating(true)
    const update: Record<string, unknown> = {
      id_verification_status: decision,
    }
    if (decision === 'approved') {
      // Move booking to pending_payment so customer can pay
      update.status = 'pending_payment'
    } else {
      // Reject = cancel the booking
      update.status = 'cancelled'
      update.cancelled_by = supplierProfileId
      update.cancelled_at = new Date().toISOString()
      update.cancellation_reason = 'رفض التحقق من بيانات البطاقة'
    }

    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('marketplace_bookings')
      .update(update)
      .eq('id', booking.id)

    setUpdating(false)
    if (error) {
      alert('فشل التحديث: ' + error.message)
      return
    }
    setBooking({ ...booking, ...(update as Partial<BookingDetail>) })
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
          <Lock className="w-8 h-8 text-[#1F5F3F] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href={`/auth/login?redirect=/supplier/marketplace/bookings/${bookingId}`}
            className="block bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold"
          >
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'no-supplier' || stage === 'not-found' || !booking) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h1 className="font-bold mb-2">
            {stage === 'no-supplier' ? 'مش مورد' : 'الحجز ده مش موجود'}
          </h1>
          <Link href="/supplier/marketplace/bookings" className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold mt-4">
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

  const customerPhone = booking.customer?.phone || ''
  const phoneClean = customerPhone.replace(/\D/g, '')
  const whatsappMsg = encodeURIComponent(
    `مرحباً، خصوص الحجز رقم ${booking.reference_code || booking.id.slice(0, 8)} في "${booking.listing?.title || ''}"`
  )

  const canConfirm = booking.status === 'pending_payment'
  const canComplete = ['confirmed', 'active'].includes(booking.status)
  const canCancel = ['pending_payment', 'confirmed', 'active'].includes(booking.status)

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-4" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/supplier/marketplace/bookings" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-gray-900">تفاصيل الحجز</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Status banner */}
        <div className={`rounded-2xl border p-4 ${status.color}`}>
          <p className="font-bold">{status.label}</p>
        </div>

        {/* Listing */}
        {booking.listing && (
          <Link
            href={`/marketplace/${booking.listing.slug}`}
            target="_blank"
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
                <p className="text-xs text-gray-500 mt-1">اضغط لشوف الصفحة</p>
              </div>
            </div>
          </Link>
        )}

        {/* Customer */}
        {booking.customer && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-3">العميل</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{booking.customer.full_name || 'عميل'}</span>
              </div>
              {booking.customer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a
                    href={`tel:${booking.customer.phone}`}
                    className="font-medium text-[#1F5F3F]"
                    dir="ltr"
                  >
                    {booking.customer.phone}
                  </a>
                </div>
              )}
              {phoneClean && (
                <a
                  href={`https://wa.me/${phoneClean}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-2.5 rounded-xl font-semibold hover:bg-[#1da851] no-underline mt-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  واتساب العميل
                </a>
              )}
            </div>
          </div>
        )}

        {/* Booking info */}
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
                {start.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' '}
                {start.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-gray-500 mt-1">إلى</p>
              <p className="font-medium">
                {end.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' '}
                {end.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <h2 className="text-sm font-bold text-gray-900 mb-2">المالية</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">المبلغ المستلم</span>
            <span>{Number(booking.base_amount).toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>عمولة Madmona</span>
            <span>-{Number(booking.commission_amount).toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
            <span className="text-gray-900">صافيك</span>
            <span className="text-[#1F5F3F]">{Number(booking.supplier_payout).toLocaleString('ar-EG')} ج.م</span>
          </div>
        </div>

        {/* ID Verification card - shown only for listings requiring it */}
        {booking.listing?.requires_id_verification && booking.customer_national_id && (
          <div className="bg-gradient-to-br from-[#B8860B]/5 to-amber-50 rounded-2xl border-2 border-[#B8860B]/30 p-4 space-y-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#B8860B]" />
              التحقق من البطاقة
              {booking.id_verification_status === 'pending' && (
                <span className="text-[10px] px-2 py-0.5 bg-[#B8860B] text-white rounded-full font-bold">بانتظار ردك</span>
              )}
              {booking.id_verification_status === 'approved' && (
                <span className="text-[10px] px-2 py-0.5 bg-green-600 text-white rounded-full font-bold flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5" /> موافق
                </span>
              )}
              {booking.id_verification_status === 'rejected' && (
                <span className="text-[10px] px-2 py-0.5 bg-red-600 text-white rounded-full font-bold flex items-center gap-1">
                  <X className="w-2.5 h-2.5" /> مرفوض
                </span>
              )}
            </h2>

            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-[#B8860B]" />
                <p className="text-xs text-gray-500">رقم البطاقة الشخصية</p>
              </div>
              <p className="text-base font-mono font-bold text-gray-900 tracking-widest" dir="ltr">
                {booking.customer_national_id}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                العميل: <strong>{booking.customer?.full_name || booking.customer?.phone || 'غير محدد'}</strong>
              </p>
            </div>

            {booking.id_verification_status === 'pending' && (
              <>
                <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-900 leading-relaxed">
                    تأكد إن رقم البطاقة صحيح ومتطابق مع بيانات العميل قبل الموافقة. بعد الموافقة هيتحول الحجز لـ &ldquo;بانتظار الدفع&rdquo;.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateIdVerification('approved')}
                    disabled={updating}
                    className="bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    موافقة
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('رفض البطاقة هيلغي الحجز نهائياً. متأكد؟')) {
                        updateIdVerification('rejected')
                      }
                    }}
                    disabled={updating}
                    className="bg-red-100 text-red-700 border border-red-200 py-2.5 rounded-xl font-semibold hover:bg-red-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    <X className="w-4 h-4" />
                    رفض
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Customer notes */}
        {booking.customer_notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1F5F3F]" /> ملاحظات العميل
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.customer_notes}</p>
          </div>
        )}

        {/* Supplier notes (editable) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" /> ملاحظاتك الداخلية
          </h2>
          <textarea
            value={supplierNotes}
            onChange={e => setSupplierNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="ملاحظات داخلية بتاعتك (هتظهر للعميل)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          {supplierNotes !== (booking.supplier_notes || '') && (
            <button
              onClick={saveSupplierNotes}
              disabled={updating}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {updating ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
            </button>
          )}
        </div>

        {/* Cancellation reason */}
        {booking.status === 'cancelled' && booking.cancellation_reason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-red-900 mb-1">سبب الإلغاء</h2>
            <p className="text-sm text-red-800">{booking.cancellation_reason}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {canConfirm && (
            <button
              onClick={() => updateStatus('confirmed')}
              disabled={updating}
              className="w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              أكّد استلام الدفع
            </button>
          )}

          {canComplete && (
            <button
              onClick={() => updateStatus('completed')}
              disabled={updating}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              علّم كـمنتهي
            </button>
          )}

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
                  onClick={() => updateStatus('cancelled', { cancellation_reason: cancelReason.trim() || null })}
                  disabled={updating}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {updating ? 'جاري الإلغاء...' : 'أكّد الإلغاء'}
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
        </div>
      </main>
    </div>
  )
}
