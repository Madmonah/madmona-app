'use client'

import { useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Lock,
  Phone,
  Calendar,
  Clock,
  Users,
  RefreshCw,
  LogOut,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Banknote,
  Smartphone,
  ExternalLink,
} from 'lucide-react'

interface Booking {
  id: string
  booking_code: string
  space_slug: string
  capacity_option: string | null
  booking_date: string
  start_hour: number
  end_hour: number
  customer_name: string
  customer_phone: string
  notes: string | null
  total_price_egp: string | number
  payment_method: 'cash_on_arrival' | 'instapay'
  payment_proof_url: string | null
  payment_status: 'pending' | 'verified' | 'rejected' | 'refunded'
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  created_at: string
}

const SPACE_NAMES: Record<string, string> = {
  'meeting-room': 'غرفة الاجتماعات',
  'private-office': 'الأوفيس الخاص',
  'indoor-coworking': 'المساحة الداخلية',
  'outdoor-garden': 'الجاردن',
}

const CAPACITY_LABELS: Record<string, string> = {
  '4-people': '٤ أشخاص',
  '8-people': '٨ أشخاص',
}

const STATUS_LABELS: Record<Booking['status'], { label: string; color: string }> = {
  pending: { label: 'في انتظار التأكيد', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-600' },
  completed: { label: 'تم', color: 'bg-blue-100 text-blue-800' },
  no_show: { label: 'لم يحضر', color: 'bg-red-100 text-red-800' },
}

const PAYMENT_STATUS_LABELS: Record<Booking['payment_status'], { label: string; color: string }> = {
  pending: { label: 'لم يدفع بعد', color: 'bg-gray-100 text-gray-600' },
  verified: { label: 'تم الدفع', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'دفع مرفوض', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'تم الاسترداد', color: 'bg-blue-100 text-blue-800' },
}

function hourLabel(h: number): string {
  if (h === 0) return '١٢ ص'
  if (h < 12) return `${h} ص`
  if (h === 12) return '١٢ م'
  return `${h - 12} م`
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatBookingDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

export default function AdminBookingsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null)

  // Auto-restore password from sessionStorage (shared with /admin/leads)
  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) {
      setPassword(stored)
      tryFetch(stored, true)
    }
  }, [])

  const tryFetch = async (pw: string, silent = false) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bookings', {
        headers: { 'X-Admin-Password': pw },
      })
      if (res.status === 401) {
        if (!silent) setAuthError('كلمة السر غلط')
        sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false)
        return
      }
      if (!res.ok) {
        setError('حصل خطأ في جلب البيانات')
        return
      }
      const data = await res.json()
      setBookings(data.bookings || [])
      setAuthed(true)
      sessionStorage.setItem('madmona_admin_pw', pw)
    } catch {
      setError('مشكلة في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    tryFetch(password)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('madmona_admin_pw')
    setAuthed(false)
    setPassword('')
    setBookings([])
  }

  const updateBooking = async (
    id: string,
    update: { status?: Booking['status']; payment_status?: Booking['payment_status'] }
  ) => {
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify({ id, ...update }),
      })
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...update } : b))
        )
      }
    } catch {
      // silent
    }
  }

  // ============ Login Screen ============
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#1F5F3F]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#1F5F3F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">حجوزات الغرف</h1>
          <p className="text-sm text-gray-500 text-center mb-6">إدخال كلمة السر للوصول</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-right"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ============ Bookings Dashboard ============
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">الحجوزات</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-500">{bookings.length} حجز</span>
              <Link
                href="/admin/leads"
                className="text-xs text-[#1F5F3F] hover:underline"
              >
                عرض طلبات واتساب ←
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => tryFetch(password)}
              disabled={loading}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors"
              aria-label="تحديث"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors"
              aria-label="خروج"
            >
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            {error}
          </div>
        )}

        {bookings.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد حجوزات بعد</p>
          </div>
        )}

        <div className="space-y-3">
          {bookings.map((b) => {
            const statusInfo = STATUS_LABELS[b.status]
            const paymentInfo = PAYMENT_STATUS_LABELS[b.payment_status]
            const spaceName = SPACE_NAMES[b.space_slug] || b.space_slug
            const capacityLabel = b.capacity_option ? CAPACITY_LABELS[b.capacity_option] : null
            const phoneClean = b.customer_phone.replace(/\D/g, '')
            const isInstaPay = b.payment_method === 'instapay'

            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{b.customer_name}</h3>
                      <span className="font-mono text-xs text-gray-400">
                        {b.booking_code}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(b.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${paymentInfo.color}`}>
                      {paymentInfo.label}
                    </span>
                  </div>
                </div>

                {/* Booking details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{spaceName}</span>
                    {capacityLabel && (
                      <span className="text-xs text-[#B8860B]">· {capacityLabel}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span dir="ltr">{b.customer_phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{formatBookingDate(b.booking_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>
                      {hourLabel(b.start_hour)} → {hourLabel(b.end_hour)}
                    </span>
                  </div>
                </div>

                {/* Price + payment method */}
                <div className="flex items-center justify-between bg-[#FAFAF7] rounded-lg p-3 mb-3 text-sm">
                  <div className="flex items-center gap-2">
                    {isInstaPay ? (
                      <Smartphone className="w-4 h-4 text-[#B8860B]" />
                    ) : (
                      <Banknote className="w-4 h-4 text-[#1F5F3F]" />
                    )}
                    <span className="text-gray-700">
                      {isInstaPay ? 'InstaPay' : 'كاش عند الوصول'}
                    </span>
                  </div>
                  <div className="text-[#1F5F3F] font-bold">
                    {Number(b.total_price_egp).toLocaleString('ar-EG')} جنيه
                  </div>
                </div>

                {/* InstaPay proof preview */}
                {isInstaPay && b.payment_proof_url && (
                  <button
                    onClick={() => setProofModalUrl(b.payment_proof_url)}
                    className="w-full flex items-center justify-center gap-2 py-2 mb-3 bg-[#B8860B]/10 text-[#B8860B] rounded-lg text-xs font-medium hover:bg-[#B8860B]/20 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    عرض صورة التحويل
                  </button>
                )}

                {b.notes && (
                  <div className="text-sm text-gray-600 mb-3 bg-gray-50 rounded-lg p-3">
                    {b.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  <a
                    href={`https://wa.me/${phoneClean}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#25D366]/10 text-[#1a8a45] rounded-lg text-xs font-medium hover:bg-[#25D366]/20 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    واتساب
                  </a>
                  <a
                    href={`tel:${b.customer_phone}`}
                    className="px-3 py-1.5 bg-[#1F5F3F]/10 text-[#1F5F3F] rounded-lg text-xs font-medium hover:bg-[#1F5F3F]/20"
                  >
                    اتصال
                  </a>
                  <div className="flex-1" />

                  {isInstaPay && b.payment_status === 'pending' && (
                    <>
                      <button
                        onClick={() =>
                          updateBooking(b.id, {
                            payment_status: 'verified',
                            status: 'confirmed',
                          })
                        }
                        className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        تأكيد الدفع
                      </button>
                      <button
                        onClick={() => updateBooking(b.id, { payment_status: 'rejected' })}
                        className="px-3 py-1.5 bg-red-50 text-red-800 rounded-lg text-xs font-medium hover:bg-red-100 flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        رفض الدفع
                      </button>
                    </>
                  )}
                  {!isInstaPay && b.status === 'pending' && (
                    <button
                      onClick={() => updateBooking(b.id, { status: 'confirmed' })}
                      className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100"
                    >
                      تأكيد الحجز
                    </button>
                  )}
                  {b.status !== 'cancelled' && b.status !== 'completed' && (
                    <button
                      onClick={() => updateBooking(b.id, { status: 'cancelled' })}
                      className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100"
                    >
                      إلغاء
                    </button>
                  )}
                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => updateBooking(b.id, { status: 'completed' })}
                      className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg text-xs font-medium hover:bg-blue-100"
                    >
                      تم الحضور
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Proof image modal */}
      {proofModalUrl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setProofModalUrl(null)}
        >
          <div
            className="bg-white rounded-2xl p-2 max-w-lg w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofModalUrl}
              alt="صورة التحويل"
              className="w-full h-auto rounded-xl"
            />
            <button
              onClick={() => setProofModalUrl(null)}
              className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
