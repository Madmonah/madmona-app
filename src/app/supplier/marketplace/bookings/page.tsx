'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/lib/notification-sound'
import BookingToast from '@/components/marketplace/BookingToast'
import {
  Clock, Loader2, ArrowRight, Lock, AlertCircle, ChevronLeft,
  Image as ImageIcon, Package, User, Users, ShieldCheck, CreditCard,
} from 'lucide-react'

// ============================================================================
// /supplier/marketplace/bookings
// Allows owner + staff with can_manage_bookings.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'no-permission' | 'ready'
type StatusFilter = 'all' | 'pending_id_verification' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled'

interface BookingSummary {
  id: string
  reference_code: string | null
  start_at: string
  end_at: string
  total_amount: number
  status: string
  customer_notes: string | null
  customer_national_id: string | null
  id_verification_status: string | null
  created_at: string
  listing: {
    id: string
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
  pending_id_verification: { label: 'بطاقة بانتظار الموافقة', color: 'bg-[#2FA084]/10 text-[#2FA084] border border-[#2FA084]/30' },
  pending_payment: { label: 'بانتظار الدفع', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكّد', color: 'bg-green-100 text-green-800' },
  active: { label: 'جاري', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'تمّ', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'تم الاسترداد', color: 'bg-purple-100 text-purple-800' },
}

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'pending_id_verification', label: 'بطاقة بانتظار' },
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
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())
  const [isStaff, setIsStaff] = useState(false)
  const [roleLabel, setRoleLabel] = useState<string | null>(null)

  const [toastVisible, setToastVisible] = useState(false)
  const [newBookingId, setNewBookingId] = useState<string | null>(null)

  const supplierIdRef = useRef<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      // Check ownership
      let { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, business_name')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      // If not owner, check staff with can_manage_bookings
      if (!sup) {
        const { data: staff } = await supabaseBrowser
          .from('supplier_staff')
          .select(`
            role_label, can_manage_bookings,
            supplier:marketplace_suppliers(id, business_name)
          `)
          .eq('profile_id', session.user.id)
          .eq('is_active', true)
          .eq('can_view', true)
          .maybeSingle()

        if (staff && staff.supplier) {
          if (!staff.can_manage_bookings) {
            setStage('no-permission')
            return
          }
          sup = staff.supplier as typeof sup
          setIsStaff(true)
          setRoleLabel(staff.role_label)
        }
      }

      if (!sup) {
        setStage('no-supplier')
        return
      }
      setSupplierName(sup.business_name)
      setSupplierId(sup.id)
      supplierIdRef.current = sup.id

      await loadBookings(sup.id)
      setStage('ready')

      requestNotificationPermission().catch(() => {})
    }
    init()
  }, [])

  const loadBookings = async (supId: string) => {
    const { data } = await supabaseBrowser
      .from('marketplace_bookings')
      .select(`
        id, reference_code, start_at, end_at, total_amount, status, customer_notes, customer_national_id, id_verification_status, created_at,
        listing:listings(id, title, requires_id_verification, photos:listing_photos(url, is_primary)),
        customer:profiles!marketplace_bookings_customer_id_fkey(id, phone, full_name)
      `)
      .eq('supplier_id', supId)
      .order('created_at', { ascending: false })

    setBookings((data || []) as BookingSummary[])
  }

  // Realtime subscription
  useEffect(() => {
    if (stage !== 'ready' || !supplierId) return

    const channel = supabaseBrowser
      .channel(`supplier-bookings-list-${supplierId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_bookings',
          filter: `supplier_id=eq.${supplierId}`,
        },
        async (payload: { new: { id: string } }) => {
          playNotificationSound()
          showBrowserNotification(
            'حجز جديد على Madmona! 🔔',
            'في حجز جديد بانتظار مراجعتك',
            `/supplier/marketplace/bookings/${payload.new.id}`
          )
          setNewBookingId(payload.new.id)
          setToastVisible(true)

          if (supplierIdRef.current) {
            await loadBookings(supplierIdRef.current)
          }

          setHighlightedIds(prev => new Set(prev).add(payload.new.id))
          setTimeout(() => {
            setHighlightedIds(prev => {
              const next = new Set(prev)
              next.delete(payload.new.id)
              return next
            })
          }, 4000)
        }
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'marketplace_bookings',
          filter: `supplier_id=eq.${supplierId}`,
        },
        async () => {
          if (supplierIdRef.current) {
            await loadBookings(supplierIdRef.current)
          }
        }
      )
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(channel)
    }
  }, [stage, supplierId])

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
          <Lock className="w-8 h-8 text-[#FA8125] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href="/auth/login?redirect=/supplier/marketplace/bookings"
            className="block bg-[#FA8125] text-white py-3 rounded-xl font-semibold"
          >
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'no-permission') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-md">
          <Lock className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مفيش صلاحية للحجوزات</h1>
          <p className="text-sm text-gray-600 mb-6">
            صلاحية &ldquo;إدارة الحجوزات&rdquo; مش مفعّلة. كلّم مدير الفريق.
          </p>
          <Link
            href="/supplier/marketplace"
            className="inline-block bg-[#FA8125] text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            ارجع للوحة
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
          <Link href="/supplier/register" className="inline-block bg-[#FA8125] text-white px-5 py-2.5 rounded-xl font-semibold mt-4">
            سجّل كمورد
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <BookingToast
        visible={toastVisible}
        bookingId={newBookingId}
        onDismiss={() => { setToastVisible(false); setNewBookingId(null) }}
      />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/supplier/marketplace" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">حجوزات {supplierName}</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                {bookings.length} حجز
                <span className="inline-flex items-center gap-1 text-[#FA8125]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FA8125] animate-pulse" />
                  متّصل لايف
                </span>
              </p>
            </div>
          </div>

          {isStaff && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              <span>إنت بتشوف بصفتك &ldquo;{roleLabel || 'موظف'}&rdquo;</span>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTER_TABS.map(tab => {
              const count = tab.key === 'all' ? bookings.length : bookings.filter(b => b.status === tab.key).length
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filter === tab.key
                      ? 'bg-[#FA8125] text-white'
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
            <p className="text-sm text-gray-500">لما يحجزلك حد، هتلاقيه هنا فوراً.</p>
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
              const isHighlighted = highlightedIds.has(booking.id)

              return (
                <Link
                  key={booking.id}
                  href={`/supplier/marketplace/bookings/${booking.id}`}
                  className={`block bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-all ${
                    isHighlighted
                      ? 'border-[#FA8125] ring-2 ring-[#FA8125]/30 animate-pulse'
                      : 'border-gray-100'
                  }`}
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

                      {/* ID verification badge */}
                      {booking.id_verification_status === 'pending' && (
                        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-[#2FA084]/10 border border-[#2FA084]/30 rounded-lg">
                          <ShieldCheck className="w-3 h-3 text-[#2FA084] flex-shrink-0" />
                          <span className="text-[10px] font-bold text-[#2FA084]">محتاج مراجعة البطاقة</span>
                        </div>
                      )}
                      {booking.id_verification_status === 'approved' && booking.listing?.requires_id_verification && (
                        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
                          <ShieldCheck className="w-3 h-3 text-green-700 flex-shrink-0" />
                          <span className="text-[10px] font-bold text-green-700">بطاقة متحقّقة</span>
                        </div>
                      )}

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
                          <strong className="text-[#FA8125]">{Number(booking.total_amount).toLocaleString('ar-EG')}</strong>
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
