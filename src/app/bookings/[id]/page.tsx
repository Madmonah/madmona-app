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
import { useT } from '@/lib/i18n/LanguageProvider'

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

const STATUS_LABELS: Record<string, { labelKey: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending_payment: { labelKey: 'bstatus.pending_payment', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  confirmed: { labelKey: 'bstatus.confirmed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  active: { labelKey: 'bstatus.active', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  completed: { labelKey: 'bstatus.completed', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: CheckCircle },
  cancelled: { labelKey: 'bstatus.cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: X },
  refunded: { labelKey: 'bstatus.refunded', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertCircle },
}

function BookingDetailContent() {
  const { t, lang, dir } = useT()
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
  const [isGuestView, setIsGuestView] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; byRole: 'supplier' | 'customer' | null }>({ open: false, byRole: null })
  const [cancelReasonInput, setCancelReasonInput] = useState('')

  useEffect(() => {
    const load = async () => {
      const refParam = searchParams.get('ref')
      const { data: { session } } = await supabaseBrowser.auth.getSession()

      // ---- Authenticated read (owner customer / supplier / staff) via RLS ----
      if (session?.user) {
        setUserId(session.user.id)
        // @ts-expect-error
        const { data } = await supabaseBrowser
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

        if (data) {
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
          return
        }
        // RLS returned nothing for this user — fall through to the guest
        // (capability-token) read below if a ?ref= was supplied.
      }

      // ---- Guest read via reference_code capability token (?ref=) ----
      if (refParam) {
        // @ts-expect-error - rpc typing not generated
        const { data: pub } = await supabaseBrowser.rpc('get_booking_public', {
          p_booking_id: bookingId,
          p_reference_code: refParam,
        })
        if (pub) {
          const b = pub as {
            id: string; reference_code: string | null; status: string
            start_at: string; end_at: string
            base_amount: number | string; total_amount: number | string; currency: string
            customer_notes: string | null; cancellation_reason: string | null
            listing: { title: string; slug: string; city: string | null; district: string | null; photo: string | null } | null
            supplier: { business_name: string; phone: string | null } | null
          }
          const mapped: Booking = {
            id: b.id,
            reference_code: b.reference_code,
            customer_id: '',
            listing_id: '',
            supplier_id: '',
            start_at: b.start_at,
            end_at: b.end_at,
            base_amount: b.base_amount,
            commission_amount: 0,
            total_amount: b.total_amount,
            currency: b.currency,
            status: b.status,
            customer_notes: b.customer_notes,
            supplier_notes: null,
            cancellation_reason: b.cancellation_reason,
            confirmed_at: null,
            cancelled_at: null,
            created_at: '',
            listing: b.listing
              ? {
                  title: b.listing.title, slug: b.listing.slug,
                  city: b.listing.city, district: b.listing.district,
                  photos: b.listing.photo ? [{ url: b.listing.photo, is_primary: true }] : [],
                }
              : null,
            supplier: b.supplier
              ? { business_name: b.supplier.business_name, profile: { phone: b.supplier.phone } }
              : null,
          }
          setBooking(mapped)
          setIsGuestView(true)
          setLoading(false)
          return
        }
      }

      // ---- Nothing accessible ----
      setError(session?.user ? t('bdetail.not_found_or_unauthorized') : t('booking.login_first'))
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

    // Single roundtrip: UPDATE + return enriched row via .select()
    // @ts-expect-error
    const { data: refreshed, error: updateErr } = await supabaseBrowser
      .from('marketplace_bookings')
      .update(update)
      .eq('id', booking.id)
      .select(`
        *,
        listing:listings(title, slug, city, district, photos:listing_photos(url, is_primary)),
        supplier:marketplace_suppliers(
          business_name,
          profile:profiles!marketplace_suppliers_profile_id_fkey(phone)
        )
      `)
      .maybeSingle()

    if (updateErr) {
      alert(t('bdetail.update_failed') + updateErr.message)
    } else {
      if (newStatus === 'confirmed') fireEmailNotification('confirmed')
      if (refreshed) setBooking(refreshed as Booking)
    }
    setActioning(false)
  }

  const openCancelDialog = (byRole: 'supplier' | 'customer') => {
    setCancelReasonInput('')
    setCancelDialog({ open: true, byRole })
  }

  const closeCancelDialog = () => {
    setCancelDialog({ open: false, byRole: null })
    setCancelReasonInput('')
  }

  const confirmCancel = () => {
    const role = cancelDialog.byRole
    const reason = cancelReasonInput.trim() ||
      (role === 'supplier' ? t('bdetail.reason_supplier_default') : t('bdetail.reason_customer_default'))
    closeCancelDialog()
    void updateBookingStatus('cancelled', reason)
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
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir={dir}>
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir={dir}>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h1 className="font-bold mb-4">{error || t('bdetail.not_found')}</h1>
          <Link href="/" className="bg-[#1F6F5F] text-white px-5 py-2.5 rounded-xl font-semibold">
            {t('bdetail.home')}
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
    return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const refCode = booking.reference_code || booking.id.slice(0, 8)
  const totalFmt = Number(booking.total_amount).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')
  const paymentConfirmationMessage = encodeURIComponent(
`السلام عليكم، أنا حوّلت مبلغ الحجز عبر InstaPay.

رقم الحجز: ${refCode}
المبلغ: ${totalFmt} ج.م
الـlisting: ${booking.listing?.title || ''}

ده screenshot من التحويل:`
  )
  const showPaymentBlock = (isOwnerCustomer || isGuestView) && booking.status === 'pending_payment'

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir={dir}>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={isOwnerSupplier ? '/supplier/marketplace/bookings' : '/account/bookings'}
            className="p-1 hover:bg-gray-50 rounded-full"
          >
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-gray-900">{t('bdetail.title')}</h1>
          <div className="w-7" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-12">
        {justCreated && (
          <div className="mb-4 flex items-start gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-sm text-green-900 animate-scale-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
            <div className="flex-1">
              <p className="font-bold mb-1">{t('bdetail.created_title')}</p>
              <p className="text-xs leading-relaxed">
                {showPaymentBlock
                  ? t('bdetail.created_pay')
                  : t('bdetail.created_soon')}
              </p>
            </div>
          </div>
        )}

        <div className={`flex items-center gap-2 p-3 rounded-xl border mb-4 ${status.color}`}>
          <StatusIcon className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold flex-1">{t(status.labelKey)}</span>
          {booking.reference_code && (
            <span className="text-xs flex items-center gap-1 opacity-80 tabular">
              <Hash className="w-3 h-3" /> {booking.reference_code}
            </span>
          )}
        </div>

        {showPaymentBlock && (
          <div className="bg-gradient-to-br from-[#1F6F5F] to-[#2d7a52] text-white rounded-2xl shadow-elevated overflow-hidden mb-4">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-base font-black">{t('bdetail.pay_title')}</h3>
              </div>
              <p className="text-xs text-white/80 mb-4">{t('bdetail.pay_sub')}</p>

              <div className="bg-white/10 backdrop-blur rounded-xl p-3 mb-3 border border-white/15">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">{t('bdetail.amount_due')}</p>
                <p className="text-3xl font-black tabular leading-none">
                  {totalFmt}
                  <span className="text-sm font-medium text-white/80 ms-1">{t('common.egp')}</span>
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-xl p-3 mb-3 border border-white/15">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">{t('bdetail.account_number')} — {t('bdetail.bank')}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-black tabular tracking-wider" dir="ltr">{INSTAPAY_ACCOUNT}</p>
                  <button
                    onClick={copyAccountNumber}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#1F6F5F] rounded-lg text-xs font-bold hover:bg-gray-50 flex-shrink-0"
                  >
                    {copiedAccount ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedAccount ? t('bdetail.copied') : t('bdetail.copy')}
                  </button>
                </div>
              </div>

              {booking.reference_code && (
                <div className="bg-[#2FA084]/20 border border-[#2FA084]/40 backdrop-blur rounded-xl p-3 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#FFD675] mb-0.5">{t('bdetail.important')}</p>
                  <p className="text-xs leading-relaxed">
                    {t('bdetail.ref_pre')} <strong className="font-black tabular">{booking.reference_code}</strong> {t('bdetail.ref_post')}
                  </p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <p className="text-xs font-bold text-white/90 mb-2">{t('bdetail.steps_title')}</p>
                <PaymentStep num="1" text={t('bdetail.step1')} />
                <PaymentStep num="2" text={t('bdetail.step2', { amt: totalFmt })} />
                <PaymentStep num="3" text={t('bdetail.step3')} />
                <PaymentStep num="4" text={t('bdetail.step4')} />
              </div>

              <a
                href={`https://wa.me/${MADMONA_WHATSAPP}?text=${paymentConfirmationMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-xl font-black hover:bg-[#1da851] no-underline transition-all hover:-translate-y-0.5"
              >
                <MessageCircle className="w-5 h-5" />
                {t('bdetail.send_receipt')}
              </a>

              <p className="text-[10px] text-white/60 text-center mt-3 leading-relaxed">
                {t('bdetail.pay_footer')}
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
                  {[booking.listing.district, booking.listing.city].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}
                </p>
              )}
            </div>
          </Link>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1F6F5F]" /> {t('bdetail.schedule')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('booking.from')}</span>
              <span className="font-medium">{formatDateTime(booking.start_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('booking.to')}</span>
              <span className="font-medium">{formatDateTime(booking.end_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#1F6F5F]" /> {t('bdetail.price_title')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('bdetail.base_price')}</span>
              <span>{Number(booking.base_amount).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {booking.currency}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t border-gray-100 text-base">
              <span>{t('booking.total')}</span>
              <span className="text-[#1F6F5F]">{Number(booking.total_amount).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {booking.currency}</span>
            </div>
          </div>
        </div>

        {booking.customer_notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">{t('bdetail.customer_notes')}</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.customer_notes}</p>
          </div>
        )}

        {booking.cancellation_reason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <h3 className="text-sm font-bold text-red-900 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {t('bdetail.cancel_reason_title')}
            </h3>
            <p className="text-sm text-red-800">{booking.cancellation_reason}</p>
          </div>
        )}

        {isOwnerSupplier && booking.status === 'pending_payment' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">{t('bdetail.supplier_actions')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('bdetail.supplier_actions_sub')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateBookingStatus('confirmed')}
                disabled={actioning}
                className="bg-[#1F6F5F] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1F6F5F]/90 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-4 h-4" /> {t('bdetail.confirm_booking')}
              </button>
              <button
                onClick={() => openCancelDialog('supplier')}
                disabled={actioning}
                className="bg-red-50 text-red-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" /> {t('bdetail.reject')}
              </button>
            </div>
          </div>
        )}

        {isOwnerSupplier && booking.status === 'confirmed' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <button
              onClick={() => updateBookingStatus('completed')}
              disabled={actioning}
              className="w-full bg-[#1F6F5F] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1F6F5F]/90 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 inline-block ml-1" /> {t('bdetail.mark_completed')}
            </button>
          </div>
        )}

        {isOwnerCustomer && (booking.status === 'pending_payment' || booking.status === 'confirmed') && (
          <button
            onClick={() => openCancelDialog('customer')}
            disabled={actioning}
            className="w-full bg-red-50 text-red-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 mb-4 flex items-center justify-center gap-1"
          >
            <X className="w-4 h-4" /> {t('bdetail.cancel_booking')}
          </button>
        )}

        {phoneClean && isOwnerCustomer && booking.status === 'confirmed' && (
          <a
            href={`https://wa.me/${phoneClean}?text=${encodeURIComponent(`مرحباً، عندي استفسار بخصوص الحجز رقم ${refCode}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#25D366] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1da851] text-center no-underline"
          >
            <MessageCircle className="w-4 h-4 inline-block ml-1" /> {t('bdetail.contact_supplier')}
          </a>
        )}
      </main>

      {cancelDialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          dir={dir}
          onClick={closeCancelDialog}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">
                {cancelDialog.byRole === 'supplier' ? t('bdetail.confirm_reject_title') : t('bdetail.confirm_cancel_title')}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {cancelDialog.byRole === 'supplier'
                ? t('bdetail.confirm_reject_body')
                : t('bdetail.confirm_cancel_body')}
            </p>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('bdetail.reason_label')}</label>
            <textarea
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              placeholder={cancelDialog.byRole === 'supplier' ? t('bdetail.reason_ph_supplier') : t('bdetail.reason_ph_customer')}
              rows={2}
              maxLength={300}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 resize-none mb-4"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={closeCancelDialog}
                className="bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200"
              >
                {t('bdetail.back')}
              </button>
              <button
                onClick={confirmCancel}
                disabled={actioning}
                className="bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                {cancelDialog.byRole === 'supplier' ? t('bdetail.reject_booking') : t('bdetail.cancel_booking')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentStep({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-full bg-white text-[#1F6F5F] flex items-center justify-center flex-shrink-0 text-[10px] font-black tabular">
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
