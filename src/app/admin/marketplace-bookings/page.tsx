'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Lock,
  RefreshCw,
  LogOut,
  ArrowRight,
  Phone,
  Calendar,
  Clock,
  User,
  Building,
  Banknote,
  Smartphone,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface UnitBooking {
  id: string
  booking_code: string
  unit_id: string
  unit_name?: string
  supplier_name?: string
  pricing_plan: 'hourly' | 'daily' | 'package_10' | 'monthly'
  booking_date: string
  start_hour: number
  end_hour: number
  customer_name: string
  customer_phone: string
  customer_email: string | null
  notes: string | null
  total_price_egp: number | string
  commission_amount: number | string
  supplier_payout: number | string
  payment_method: 'cash_on_arrival' | 'instapay'
  payment_proof_url: string | null
  payment_status: 'pending' | 'verified' | 'rejected' | 'refunded'
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  payout_status: 'unpaid' | 'paid'
  created_at: string
}

const PLAN_LABELS: Record<UnitBooking['pricing_plan'], string> = {
  hourly: 'ساعة',
  daily: 'يوم',
  package_10: 'باكدج ١٠ أيام',
  monthly: 'شهر',
}

const STATUS_LABELS: Record<UnitBooking['status'], { label: string; color: string }> = {
  pending: { label: 'في انتظار التأكيد', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكد', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-600' },
  completed: { label: 'تم', color: 'bg-blue-100 text-blue-800' },
  no_show: { label: 'لم يحضر', color: 'bg-red-100 text-red-800' },
}

const PAYMENT_LABELS: Record<UnitBooking['payment_status'], { label: string; color: string }> = {
  pending: { label: 'لم يدفع', color: 'bg-gray-100 text-gray-600' },
  verified: { label: 'تم الدفع', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'دفع مرفوض', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'استُرد', color: 'bg-blue-100 text-blue-800' },
}

function hourLabel(h: number): string {
  if (h === 0) return '١٢ ص'
  if (h < 12) return `${h} ص`
  if (h === 12) return '١٢ م'
  return `${h - 12} م`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function formatPrice(p: number | string): string {
  return Number(p).toLocaleString('ar-EG') + ' ج'
}

export default function AdminMarketplaceBookingsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [bookings, setBookings] = useState<UnitBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) {
      setPassword(stored)
      tryFetch(stored, true)
    }
  }, [])

  const tryFetch = async (pw: string, silent = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/unit-bookings', {
        headers: { 'X-Admin-Password': pw },
      })
      if (res.status === 401) {
        if (!silent) setAuthError('كلمة السر غلط')
        sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false)
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setBookings(data.bookings || [])
      setAuthed(true)
      sessionStorage.setItem('madmona_admin_pw', pw)
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
    update: { status?: UnitBooking['status']; payment_status?: UnitBooking['payment_status'] }
  ) => {
    const res = await fetch('/api/admin/unit-bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
      body: JSON.stringify({ id, ...update }),
    })
    if (res.ok) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...update } : b))
      )
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#34D399]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#059669]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">حجوزات Marketplace</h1>
          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669] text-right"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <button
              type="submit" disabled={loading || !password}
              className="w-full bg-[#34D399] text-[#04352A] py-3 rounded-xl font-semibold hover:bg-[#34D399]/90 disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">حجوزات Marketplace</h1>
              <p className="text-xs text-gray-500 mt-0.5">{bookings.length} حجز</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => tryFetch(password)} disabled={loading} className="p-2 hover:bg-gray-50 rounded-full">
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-50 rounded-full">
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {bookings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">لا توجد حجوزات بعد</div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => {
              const status = STATUS_LABELS[b.status]
              const payment = PAYMENT_LABELS[b.payment_status]
              const isInstaPay = b.payment_method === 'instapay'
              const phoneClean = b.customer_phone.replace(/\D/g, '')

              return (
                <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{b.customer_name}</h3>
                        <span className="font-mono text-xs text-gray-400">{b.booking_code}</span>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(b.created_at)}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${payment.color}`}>
                        {payment.label}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                    {b.unit_name && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{b.unit_name}</span>
                      </div>
                    )}
                    {b.supplier_name && (
                      <div className="flex items-center gap-2 text-[#2FA084]">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">{b.supplier_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span dir="ltr">{b.customer_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{b.booking_date}</span>
                      <span className="text-xs text-gray-500">· {PLAN_LABELS[b.pricing_plan]}</span>
                    </div>
                    {b.pricing_plan === 'hourly' && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{hourLabel(b.start_hour)} → {hourLabel(b.end_hour)}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#FAFAF7] rounded-lg p-3 mb-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500 mb-0.5">إجمالي</div>
                      <div className="font-bold text-gray-900">{formatPrice(b.total_price_egp)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">عمولة</div>
                      <div className="font-bold text-[#2FA084]">{formatPrice(b.commission_amount)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">لأجر معانا</div>
                      <div className="font-bold text-[#059669]">{formatPrice(b.supplier_payout)}</div>
                    </div>
                  </div>

                  {isInstaPay && b.payment_proof_url && (
                    <button
                      onClick={() => setProofModalUrl(b.payment_proof_url)}
                      className="w-full flex items-center justify-center gap-2 py-2 mb-3 bg-[#2FA084]/10 text-[#2FA084] rounded-lg text-xs font-medium hover:bg-[#2FA084]/20"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      عرض صورة التحويل
                    </button>
                  )}

                  {b.notes && (
                    <div className="text-sm text-gray-600 mb-3 bg-gray-50 rounded-lg p-3">{b.notes}</div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                    <a
                      href={`https://wa.me/${phoneClean}`}
                      target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#25D366]/10 text-[#1a8a45] rounded-lg text-xs font-medium hover:bg-[#25D366]/20 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      واتساب
                    </a>
                    <div className="flex-1" />

                    {isInstaPay && b.payment_status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateBooking(b.id, { payment_status: 'verified', status: 'confirmed' })}
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
                          رفض
                        </button>
                      </>
                    )}
                    {!isInstaPay && b.status === 'pending' && (
                      <button
                        onClick={() => updateBooking(b.id, { status: 'confirmed' })}
                        className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100"
                      >
                        تأكيد
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
        )}
      </main>

      {proofModalUrl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setProofModalUrl(null)}
        >
          <div className="bg-white rounded-2xl p-2 max-w-lg w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proofModalUrl} alt="صورة التحويل" className="w-full h-auto rounded-xl" />
            <button onClick={() => setProofModalUrl(null)} className="mt-3 w-full py-2 text-sm text-gray-600">
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
