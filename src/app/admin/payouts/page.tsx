'use client'

import { useEffect, useState, useMemo, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Lock,
  RefreshCw,
  LogOut,
  ArrowRight,
  Wallet,
  CheckCircle,
  Phone,
  Calendar,
  AlertCircle,
} from 'lucide-react'

// ============================================================
// Payouts page — groups bookings by supplier and shows the total
// pending payout per supplier. Admin can mark all of a supplier's
// payouts as paid in one click.
// ============================================================

interface UnitBooking {
  id: string
  booking_code: string
  unit_id: string
  unit_name?: string
  supplier_id?: string
  supplier_name?: string
  booking_date: string
  total_price_egp: number | string
  commission_amount: number | string
  supplier_payout: number | string
  payment_status: string
  status: string
  payout_status: 'unpaid' | 'paid'
  payout_paid_at: string | null
  created_at: string
}

interface SupplierGroup {
  supplier_id: string
  supplier_name: string
  bookings: UnitBooking[]
  unpaid_total: number
  paid_total: number
  unpaid_count: number
}

function formatPrice(p: number | string): string {
  return Number(p).toLocaleString('ar-EG') + ' ج'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

export default function AdminPayoutsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [bookings, setBookings] = useState<UnitBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)
  const [filter, setFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid')

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
      const res = await fetch('/api/admin/unit-bookings?include_payout=1', {
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

  const markPaid = async (bookingId: string) => {
    setActioning(bookingId)
    try {
      const res = await fetch('/api/admin/unit-bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify({ id: bookingId, payout_status: 'paid' }),
      })
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? { ...b, payout_status: 'paid', payout_paid_at: new Date().toISOString() }
              : b
          )
        )
      }
    } finally {
      setActioning(null)
    }
  }

  const markAllPaidForSupplier = async (group: SupplierGroup) => {
    if (!confirm(`تأكيد دفع ${formatPrice(group.unpaid_total)} لـ ${group.supplier_name}؟`)) return
    const unpaid = group.bookings.filter((b) => b.payout_status === 'unpaid')
    setActioning(group.supplier_id)
    try {
      // Mark each booking as paid in parallel. The API processes one
      // at a time but parallelism is safe because each ID is independent.
      await Promise.all(
        unpaid.map((b) =>
          fetch('/api/admin/unit-bookings', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Password': password,
            },
            body: JSON.stringify({ id: b.id, payout_status: 'paid' }),
          })
        )
      )
      // Refresh from server to get accurate state
      tryFetch(password, true)
    } finally {
      setActioning(null)
    }
  }

  // Group bookings by supplier
  const grouped = useMemo(() => {
    const filteredBookings =
      filter === 'all'
        ? bookings
        : bookings.filter((b) => b.payout_status === filter)

    const map = new Map<string, SupplierGroup>()
    for (const b of filteredBookings) {
      // Skip bookings that aren't confirmed/completed
      if (b.status === 'cancelled') continue

      const supId = b.supplier_id || 'unknown'
      const supName = b.supplier_name || 'مورد غير معروف'

      if (!map.has(supId)) {
        map.set(supId, {
          supplier_id: supId,
          supplier_name: supName,
          bookings: [],
          unpaid_total: 0,
          paid_total: 0,
          unpaid_count: 0,
        })
      }
      const grp = map.get(supId)!
      grp.bookings.push(b)
      const payout = Number(b.supplier_payout)
      if (b.payout_status === 'unpaid') {
        grp.unpaid_total += payout
        grp.unpaid_count++
      } else {
        grp.paid_total += payout
      }
    }
    return Array.from(map.values()).sort((a, b) => b.unpaid_total - a.unpaid_total)
  }, [bookings, filter])

  const totalUnpaid = grouped.reduce((sum, g) => sum + g.unpaid_total, 0)

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#FA8125]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#FA8125]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">تسويات الموردين</h1>
          <p className="text-sm text-gray-500 text-center mb-6">إدخال كلمة السر</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة السر"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#FA8125]/30 focus:border-[#FA8125] text-right"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#FA8125] text-white py-3 rounded-xl font-semibold hover:bg-[#FA8125]/90 disabled:opacity-50"
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
              <h1 className="text-lg font-bold text-gray-900">تسويات الموردين</h1>
              <p className="text-xs text-[#2FA084] mt-0.5 font-bold">
                مستحقات: {formatPrice(totalUnpaid)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => tryFetch(password)}
              disabled={loading}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-50 rounded-full">
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2">
          {(['unpaid', 'paid', 'all'] as const).map((f) => {
            const labels = { unpaid: 'مستحقة', paid: 'مدفوعة', all: 'الكل' }
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  filter === f ? 'bg-[#FA8125] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {labels[f]}
              </button>
            )
          })}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {grouped.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {filter === 'unpaid' ? 'لا توجد مستحقات حالياً 🎉' : 'لا توجد بيانات'}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.supplier_id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Supplier header */}
                <div className="bg-[#FAFAF7] p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{group.supplier_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {group.unpaid_count} حجز مستحق
                    </p>
                  </div>
                  {group.unpaid_total > 0 && (
                    <div className="text-left">
                      <div className="text-xs text-gray-500 mb-1">المستحق</div>
                      <div className="font-bold text-[#2FA084] text-lg">
                        {formatPrice(group.unpaid_total)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bookings list */}
                <div className="divide-y divide-gray-100">
                  {group.bookings.map((b) => (
                    <div
                      key={b.id}
                      className={`p-4 flex items-center justify-between gap-3 ${
                        b.payout_status === 'paid' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-400">
                            {b.booking_code}
                          </span>
                          {b.unit_name && (
                            <span className="text-xs text-gray-700 truncate">{b.unit_name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(b.booking_date)}
                          </span>
                          <span>إجمالي: {formatPrice(b.total_price_egp)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-left">
                          <div className="text-xs text-gray-500">حصة المورد</div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {formatPrice(b.supplier_payout)}
                          </div>
                        </div>
                        {b.payout_status === 'unpaid' ? (
                          <button
                            onClick={() => markPaid(b.id)}
                            disabled={actioning === b.id}
                            className="px-2.5 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            دفع
                          </button>
                        ) : (
                          <span className="px-2.5 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            مدفوع
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pay all button */}
                {group.unpaid_count > 1 && (
                  <div className="p-3 bg-[#FAFAF7] border-t border-gray-100">
                    <button
                      onClick={() => markAllPaidForSupplier(group)}
                      disabled={actioning === group.supplier_id}
                      className="w-full px-3 py-2 bg-[#FA8125] text-white rounded-lg text-sm font-medium hover:bg-[#FA8125]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      دفع كل المستحقات: {formatPrice(group.unpaid_total)}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
