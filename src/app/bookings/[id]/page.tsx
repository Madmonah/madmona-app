'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Clock, Loader2, AlertCircle, CheckCircle,
  MapPin, Image as ImageIcon, Building2, MessageCircle, Hash,
  CreditCard, X, AlertTriangle, Copy, Check,
} from 'lucide-react'

// ============================================================================
// /bookings/[id]
// Booking detail with InstaPay payment instructions for pending bookings.
// On confirm: fires email notification to customer (fire-and-forget).
// ============================================================================

const INSTAPAY_ACCOUNT = '5220001000009207'
const INSTAPAY_BANK = 'بنك مصر'
const MADMONA_WHATSAPP = '201002229982'

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

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending_payment: { label: 'في انتظار الدفع', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  confirmed: { label: 'مؤكد ✓', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
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
  const [copiedAccount, setCopiedAccount] = useState(false)

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

      // Check ownership OR staff with can_manage_bookings
      // @ts-expect-error
      const { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id')
        .eq('profile_id', session.user.id)
        .eq('id', data.supplier_id)
        .maybeSingle()

      if (sup) {
        setIsOwnerSupplier(true)
      } else {
        // Check staff
        // @ts-expect-error
        const { data: staff } = await supabaseBrowser
          .from('supplier_staff')
          .select('can_manage_bookings, supplier_id')
          .eq('profile_id', session.user.id)
          .eq('supplier_id', data.supplier_id)
          .eq('is_active', true)
          .eq('can_manage_bookings', true)
          .maybeSingle()

        if (staff) setIsOwnerSupplier(true)
      }

      setLoading(false)
    }
    load()
  }, [bookingId])

  // Fire-and-forget email notification
  const fireEmailNotification = async (event: 'confirmed') => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token || !booking) return
      void fetch('/api/bookings/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ booking_id: booking.id, event }),
      }).catch(() => {/* swallow */})
    } catch {
      // ignore
    }
  }

  const updateBookingStatus = async (newStatus: string, reason?: string) => {
    if (!booking) return
    setActioning(true)

    const update: Record<string, unknown> = { status: newStatus }
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
      // Fire email if confirmed
      if (newStatus === 'confirmed') {
        fireEmailNotification('confirmed')
      }

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

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(INSTAPAY_ACCOUNT)
      setCopiedAccount(true)
      setTimeout(() => setCopiedAccount(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = INSTAPAY_ACCOUNT
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
      setCopiedAccount(true)
      setTimeout(() => setCopiedAccount(false), 2000)
    }
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

  const refCode = booking.reference_code || booking.id.slice(0, 8)
  const totalFmt = Number(booking.total_amount).toLocaleString('ar-EG')
  const paymentConfirmationMessage = encodeURIComponent(
`السلام عليكم، أنا حوّلت مبلغ الحجز عبر InstaPay.

رقم الحجز: ${refCode}
المبلغ: ${totalFmt} ج.م
الـlisting: ${booking.listing?.title || ''}

ده screenshot من التحويل:`
  )
  const showPaymentBlock = isOwnerCustomer && booking.status === 'pending_payment'

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={isOwnerSupplier ? '/supplier/marketplace/bookings' : '/account/bookings'}
            className="p-1 hover:bg-gray-50 rounded-full"
          >
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-gray-900">تفاصيل الحجز</h1>
          <div className="w-7" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-12">
        {justCreated && (
          <div className="mb-4 flex items-start gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-sm text-green-900 animate-scale-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
            <div className="flex-1">
              <p className="font-bold mb-1">تم استلام طلب الحجز بنجاح! ✓</p>
              <p className="text-xs leading-relaxed">
                {showPaymentBlock
                  ? 'الخطوة التالية: حوّل المبلغ عبر InstaPay وابعتلنا screenshot على واتساب لتأكيد الحجز.'
                  : 'هتوصلك تأكيد قريباً.'}
              </p>
            </div>
          </div>
        )}

        <div className={`flex items-center gap-2 p-3 rounded-xl border mb-4 ${status.color}`}>
          <StatusIcon className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold flex-1">{status.label}</span>
          {booking.reference_code && (
            <span className="text-xs flex items-center gap-1 opacity-80 tabular">
              <Hash className="w-3 h-3" /> {booking.reference_code}
            </span>
          )}
        </div>

        {showPaymentBlock && (
          <div className="bg-gradient-to-br from-[#1F5F3F] to-[#2d7a52] text-white rounded-2xl shadow-elevated overflow-hidden mb-4">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-base font-black">ادفع عبر InstaPay</h3>
              </div>
              <p className="text-xs text-white/80 mb-4">حوّل المبلغ من تطبيق البنك بتاعك على رقم الحساب التالي:</p>

              <div className="bg-white/10 backdrop-blur rounded-xl p-3 mb-3 border border-white/15">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">المبلغ المستحق</p>
                <p className="text-3xl font-black tabular leading-none">
                  {totalFmt}
                  <span className="text-sm font-medium text-white/80 mr-1">ج.م</span>
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-xl p-3 mb-3 border border-white/15">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">رقم الحساب — {INSTAPAY_BANK}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-black tabular tracking-wider" dir="ltr">{INSTAPAY_ACCOUNT}</p>
                  <button
                    onClick={copyAccountNumber}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#1F5F3F] rounded-lg text-xs font-bold hover:bg-gray-50 flex-shrink-0"
                  >
                    {copiedAccount ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedAccount ? 'تم النسخ' : 'انسخ'}
                  </button>
                </div>
              </div>

              {booking.reference_code && (
                <div className="bg-[#B8860B]/20 border border-[#B8860B]/40 backdrop-blur rounded-xl p-3 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#FFD675] mb-0.5">مهم</p>
                  <p className="text-xs leading-relaxed">
                    اكتب رقم الحجز <strong className="font-black tabular">{booking.reference_code}</strong> في خانة &ldquo;ملاحظات&rdquo; أو &ldquo;الغرض من التحويل&rdquo; عشان نحدّد الحجز بسرعة.
                  </p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <p className="text-xs font-bold text-white/90 mb-2">الخطوات:</p>
                <PaymentStep num="1" text="افتح تطبيق البنك أو InstaPay" />
                <PaymentStep num="2" text={`حوّل ${totalFmt} ج.م على الحساب اللي فوق`} />
                <PaymentStep num="3" text="خد screenshot من إيصال التحويل" />
                <PaymentStep num="4" text="ابعت الـscreenshot على واتساب لتأكيد الحجز" />
              </div>

              <a
                href={`https://wa.me/${MADMONA_WHATSAPP}?text=${paymentConfirmationMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-xl font-black hover:bg-[#1da851] no-underline transition-all hover:-translate-y-0.5"
              >
                <MessageCircle className="w-5 h-5" />
                ابعت إيصال الدفع على واتساب
              </a>

              <p className="text-[10px] text-white/60 text-center mt-3 leading-relaxed">
                الحجز يتأكد بعد ما نستلم إيصال الدفع. الفترة دي محجوزة مؤقتاً لحد ما يجي حد آخر يأكد. ⏱️
              </p>
            </div>
          </div>
        )}

        {booking.listing && (
          <Link
            href={`/marketplace/${booking.listing.slug}`}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4 flex hover:shadow-sm transition-shadow no-underline"
          >
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

        {booking.customer_notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">ملاحظات العميل</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.customer_notes}</p>
          </div>
        )}

        {booking.cancellation_reason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <h3 className="text-sm font-bold text-red-900 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> سبب الإلغاء
            </h3>
            <p className="text-sm text-red-800">{booking.cancellation_reason}</p>
          </div>
        )}

        {isOwnerSupplier && booking.status === 'pending_payment' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">إجراءات المورد</h3>
            <p className="text-xs text-gray-500 mb-3">أكّد الحجز بعد ما تستلم تأكيد الدفع على واتساب.</p>
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

        {phoneClean && isOwnerCustomer && booking.status === 'confirmed' && (
          <a
            href={`https://wa.me/${phoneClean}?text=${encodeURIComponent(`مرحباً، عندي استفسار بخصوص الحجز رقم ${refCode}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#25D366] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1da851] text-center no-underline"
          >
            <MessageCircle className="w-4 h-4 inline-block ml-1" /> تواصل مع المورد
          </a>
        )}
      </main>
    </div>
  )
}

function PaymentStep({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-full bg-white text-[#1F5F3F] flex items-center justify-center flex-shrink-0 text-[10px] font-black tabular">
        {num}
      </div>
      <p className="text-xs text-white/95 leading-relaxed">{text}</p>
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
