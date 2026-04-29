'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Lock,
  Users,
  Building,
  Calendar,
  Banknote,
  Percent,
  Clock,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Wallet,
  TrendingUp,
} from 'lucide-react'

// ============================================================
// Master admin dashboard. Aggregates marketplace metrics:
// - Total bookings (today, this week, all-time)
// - Revenue + commission earned
// - Pending payouts to suppliers
// - Suppliers (total, pending approval)
// - Units (total, active, by category)
//
// Auth: shares the same X-Admin-Password mechanism as other /admin pages.
// ============================================================

interface DashboardStats {
  bookings: {
    today: number
    this_week: number
    total: number
    pending: number
    confirmed: number
  }
  revenue: {
    today: number
    this_week: number
    total: number
    commission_earned: number
    pending_payout: number
  }
  suppliers: {
    total: number
    pending: number
    approved: number
  }
  units: {
    total: number
    active: number
    by_category: Record<string, number>
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  workstation: 'مكاتب فردية',
  meeting_room: 'غرف اجتماعات',
  office: 'مكاتب خاصة',
  amenity: 'وسائل راحة',
  equipment: 'معدات',
}

function formatPrice(egp: number): string {
  return egp.toLocaleString('ar-EG') + ' ج'
}

export default function AdminDashboardPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)

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
      const res = await fetch('/api/admin/stats', {
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
      setStats(data.stats)
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
    setStats(null)
  }

  // ============ Login Screen ============
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#1F5F3F]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#1F5F3F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">لوحة الإدارة</h1>
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

  // ============ Dashboard ============
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">لوحة الإدارة</h1>
            <p className="text-xs text-gray-500 mt-0.5">نظرة شاملة على المنصة</p>
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

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* === Hero stats === */}
        {stats && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard
                icon={<Calendar className="w-4 h-4" />}
                label="حجوزات اليوم"
                value={stats.bookings.today.toString()}
                accent="bg-[#1F5F3F]/10 text-[#1F5F3F]"
              />
              <StatCard
                icon={<Banknote className="w-4 h-4" />}
                label="إيرادات اليوم"
                value={formatPrice(stats.revenue.today)}
                accent="bg-[#B8860B]/10 text-[#B8860B]"
              />
              <StatCard
                icon={<Percent className="w-4 h-4" />}
                label="عمولة كلية"
                value={formatPrice(stats.revenue.commission_earned)}
                accent="bg-[#C2410C]/10 text-[#C2410C]"
              />
              <StatCard
                icon={<Wallet className="w-4 h-4" />}
                label="مستحقات الموردين"
                value={formatPrice(stats.revenue.pending_payout)}
                accent="bg-blue-100 text-blue-700"
              />
            </section>

            {/* === Detailed sections === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Bookings panel */}
              <DetailPanel
                title="الحجوزات"
                icon={<Calendar className="w-4 h-4" />}
                rows={[
                  { label: 'إجمالي', value: stats.bookings.total.toString() },
                  { label: 'هذا الأسبوع', value: stats.bookings.this_week.toString() },
                  { label: 'في انتظار التأكيد', value: stats.bookings.pending.toString() },
                  { label: 'مؤكد', value: stats.bookings.confirmed.toString() },
                ]}
              />

              {/* Revenue panel */}
              <DetailPanel
                title="الإيرادات"
                icon={<TrendingUp className="w-4 h-4" />}
                rows={[
                  { label: 'إجمالي', value: formatPrice(stats.revenue.total) },
                  { label: 'هذا الأسبوع', value: formatPrice(stats.revenue.this_week) },
                  { label: 'عمولة كلية', value: formatPrice(stats.revenue.commission_earned), highlight: true },
                  { label: 'مستحقات لم تُدفع بعد', value: formatPrice(stats.revenue.pending_payout) },
                ]}
              />

              {/* Suppliers panel */}
              <DetailPanel
                title="الموردين"
                icon={<Users className="w-4 h-4" />}
                rows={[
                  { label: 'إجمالي', value: stats.suppliers.total.toString() },
                  { label: 'موافق عليهم', value: stats.suppliers.approved.toString() },
                  { label: 'في انتظار الموافقة', value: stats.suppliers.pending.toString(), highlight: stats.suppliers.pending > 0 },
                ]}
                cta={
                  stats.suppliers.pending > 0
                    ? { label: `مراجعة ${stats.suppliers.pending} طلبات`, href: '/admin/suppliers' }
                    : { label: 'إدارة الموردين', href: '/admin/suppliers' }
                }
              />

              {/* Units panel */}
              <DetailPanel
                title="الوحدات"
                icon={<Building className="w-4 h-4" />}
                rows={[
                  { label: 'إجمالي', value: stats.units.total.toString() },
                  { label: 'نشطة', value: stats.units.active.toString() },
                  ...Object.entries(stats.units.by_category).map(([slug, count]) => ({
                    label: CATEGORY_LABELS[slug] || slug,
                    value: count.toString(),
                  })),
                ]}
                cta={{ label: 'إدارة الوحدات', href: '/admin/units' }}
              />
            </div>

            {/* === Quick navigation === */}
            <section className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">روابط سريعة</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <NavTile href="/admin/suppliers" icon={<Users className="w-4 h-4" />} label="الموردين" />
                <NavTile href="/admin/units" icon={<Building className="w-4 h-4" />} label="الوحدات" />
                <NavTile href="/admin/marketplace-bookings" icon={<Calendar className="w-4 h-4" />} label="حجوزات Marketplace" />
                <NavTile href="/admin/payouts" icon={<Wallet className="w-4 h-4" />} label="تسويات الموردين" />
                <NavTile href="/admin/bookings" icon={<Clock className="w-4 h-4" />} label="حجوزات قديمة" />
                <NavTile href="/admin/leads" icon={<Users className="w-4 h-4" />} label="رسائل واتساب" />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${accent}`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}

function DetailPanel({
  title,
  icon,
  rows,
  cta,
}: {
  title: string
  icon: React.ReactNode
  rows: Array<{ label: string; value: string; highlight?: boolean }>
  cta?: { label: string; href: string }
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
        <span className="text-gray-400">{icon}</span>
        {title}
      </h3>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <dt className="text-gray-500">{row.label}</dt>
            <dd className={row.highlight ? 'font-bold text-[#B8860B]' : 'font-medium text-gray-900'}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 flex items-center justify-between px-3 py-2 bg-[#FAFAF7] hover:bg-gray-100 rounded-lg text-sm text-[#1F5F3F] font-medium transition-colors no-underline"
        >
          <span>{cta.label}</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}

function NavTile({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-3 bg-[#FAFAF7] hover:bg-[#1F5F3F]/5 rounded-lg text-sm text-gray-700 font-medium transition-colors no-underline"
    >
      <span className="text-[#1F5F3F]">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
