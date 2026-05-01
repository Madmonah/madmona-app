'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, Crown, Building2, Calendar,
  TrendingUp, DollarSign, Users, Package, Eye, Star,
  Clock, AlertCircle, CheckCircle,
} from 'lucide-react'

// ============================================================================
// /admin/dashboard
// 
// Comprehensive analytics dashboard for admin (Mohamed).
// Shows key business metrics: bookings, revenue, suppliers, listings.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

interface Stats {
  // Bookings
  totalBookings: number
  monthBookings: number
  pendingBookings: number
  confirmedBookings: number
  completedBookings: number
  cancelledBookings: number

  // Revenue
  totalCommission: number
  monthCommission: number
  totalGMV: number  // Gross merchandise value
  monthGMV: number

  // Suppliers
  approvedSuppliers: number
  pendingSuppliers: number

  // Listings
  publishedListings: number
  draftListings: number

  // Customers
  totalCustomers: number

  // Engagement
  totalReviews: number
  averageRating: number
}

interface RecentBooking {
  id: string
  reference_code: string | null
  total_amount: number
  status: string
  created_at: string
  listing: { title: string } | null
  supplier: { business_name: string } | null
  customer: { full_name: string | null } | null
}

interface TopListing {
  id: string
  title: string
  slug: string
  views_count: number
  bookings_count: number
  rating: number | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'بانتظار', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكّد', color: 'bg-green-100 text-green-800' },
  active: { label: 'جاري', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'تمّ', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'مُسترد', color: 'bg-purple-100 text-purple-800' },
}

export default function AdminDashboardPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [topListings, setTopListings] = useState<TopListing[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      // @ts-expect-error
      const { data: prof } = await supabaseBrowser
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (prof?.role !== 'admin') {
        setStage('forbidden')
        return
      }

      await loadAllStats()
      setStage('ready')
    }
    init()
  }, [])

  const loadAllStats = async () => {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const monthAgoIso = monthAgo.toISOString()

    // Bookings stats
    // @ts-expect-error
    const { data: bookings } = await supabaseBrowser
      .from('marketplace_bookings')
      .select('id, status, total_amount, commission_amount, created_at')

    const bookingsArr = (bookings || []) as Array<{
      status: string
      total_amount: number | string
      commission_amount: number | string
      created_at: string
    }>

    const totalGMV = bookingsArr
      .filter(b => ['confirmed', 'active', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0)

    const totalCommission = bookingsArr
      .filter(b => ['confirmed', 'active', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + Number(b.commission_amount || 0), 0)

    const monthGMV = bookingsArr
      .filter(b =>
        ['confirmed', 'active', 'completed'].includes(b.status) &&
        new Date(b.created_at) > monthAgo
      )
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0)

    const monthCommission = bookingsArr
      .filter(b =>
        ['confirmed', 'active', 'completed'].includes(b.status) &&
        new Date(b.created_at) > monthAgo
      )
      .reduce((sum, b) => sum + Number(b.commission_amount || 0), 0)

    // Suppliers
    // @ts-expect-error
    const { data: suppliers } = await supabaseBrowser
      .from('marketplace_suppliers')
      .select('kyc_status')

    const suppliersArr = (suppliers || []) as Array<{ kyc_status: string }>

    // Listings
    // @ts-expect-error
    const { data: listings } = await supabaseBrowser
      .from('listings')
      .select('status')

    const listingsArr = (listings || []) as Array<{ status: string }>

    // Customers
    // @ts-expect-error
    const { count: customersCount } = await supabaseBrowser
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    // Reviews
    // @ts-expect-error
    const { data: reviews } = await supabaseBrowser
      .from('reviews')
      .select('rating')
      .eq('is_published', true)

    const reviewsArr = (reviews || []) as Array<{ rating: number }>
    const avgRating = reviewsArr.length > 0
      ? reviewsArr.reduce((sum, r) => sum + r.rating, 0) / reviewsArr.length
      : 0

    setStats({
      totalBookings: bookingsArr.length,
      monthBookings: bookingsArr.filter(b => new Date(b.created_at) > monthAgo).length,
      pendingBookings: bookingsArr.filter(b => b.status === 'pending_payment').length,
      confirmedBookings: bookingsArr.filter(b => b.status === 'confirmed').length,
      completedBookings: bookingsArr.filter(b => b.status === 'completed').length,
      cancelledBookings: bookingsArr.filter(b => b.status === 'cancelled').length,
      totalCommission,
      monthCommission,
      totalGMV,
      monthGMV,
      approvedSuppliers: suppliersArr.filter(s => s.kyc_status === 'approved').length,
      pendingSuppliers: suppliersArr.filter(s => s.kyc_status === 'pending').length,
      publishedListings: listingsArr.filter(l => l.status === 'published').length,
      draftListings: listingsArr.filter(l => ['draft', 'pending_review'].includes(l.status)).length,
      totalCustomers: customersCount || 0,
      totalReviews: reviewsArr.length,
      averageRating: avgRating,
    })

    // Recent bookings
    // @ts-expect-error
    const { data: recent } = await supabaseBrowser
      .from('marketplace_bookings')
      .select(`
        id, reference_code, total_amount, status, created_at,
        listing:listings(title),
        supplier:marketplace_suppliers(business_name),
        customer:profiles!marketplace_bookings_customer_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    setRecentBookings((recent || []) as RecentBooking[])

    // Top listings
    // @ts-expect-error
    const { data: top } = await supabaseBrowser
      .from('listings')
      .select('id, title, slug, views_count, bookings_count, rating')
      .eq('status', 'published')
      .order('views_count', { ascending: false })
      .limit(5)

    setTopListings((top || []) as TopListing[])
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
            href="/auth/login?redirect=/admin/dashboard"
            className="block bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold"
          >
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مش مسموح</h1>
          <p className="text-sm text-gray-600 mb-4">الصفحة دي للأدمن فقط.</p>
          <Link href="/account" className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold">
            ارجع للحساب
          </Link>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/account" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#B8860B]" />
            <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Headline metrics */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            الأرقام الكبرى
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={<DollarSign className="w-4 h-4" />}
              label="عمولة Madmona (شهرياً)"
              value={`${stats.monthCommission.toLocaleString('ar-EG')} ج.م`}
              subtitle={`إجمالي: ${stats.totalCommission.toLocaleString('ar-EG')}`}
              accent="bg-[#1F5F3F]/10 text-[#1F5F3F]"
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="GMV (شهرياً)"
              value={`${stats.monthGMV.toLocaleString('ar-EG')} ج.م`}
              subtitle={`إجمالي: ${stats.totalGMV.toLocaleString('ar-EG')}`}
              accent="bg-[#B8860B]/10 text-[#B8860B]"
            />
            <MetricCard
              icon={<Calendar className="w-4 h-4" />}
              label="حجوزات الشهر"
              value={stats.monthBookings.toString()}
              subtitle={`إجمالي: ${stats.totalBookings}`}
              accent="bg-blue-100 text-blue-700"
            />
            <MetricCard
              icon={<Users className="w-4 h-4" />}
              label="عملاء مسجلين"
              value={stats.totalCustomers.toString()}
              subtitle={`${stats.approvedSuppliers} مورد · ${stats.pendingSuppliers} معلّق`}
              accent="bg-purple-100 text-purple-700"
            />
          </div>
        </section>

        {/* Booking status breakdown */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            توزيع الحجوزات
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatusCard label="بانتظار" value={stats.pendingBookings} color="text-yellow-700 bg-yellow-50" />
            <StatusCard label="مؤكّد" value={stats.confirmedBookings} color="text-green-700 bg-green-50" />
            <StatusCard label="تمّ" value={stats.completedBookings} color="text-gray-700 bg-gray-50" />
            <StatusCard label="ملغي" value={stats.cancelledBookings} color="text-red-700 bg-red-50" />
            <StatusCard
              label="تقييم متوسط"
              value={stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)}` : '—'}
              color="text-[#B8860B] bg-[#B8860B]/10"
              suffix={stats.totalReviews > 0 ? `(${stats.totalReviews})` : ''}
            />
          </div>
        </section>

        {/* Listings + Suppliers */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1F5F3F]" /> Listings
              </h3>
              <Link href="/admin/marketplace-suppliers" className="text-xs text-[#1F5F3F] hover:underline">
                إدارة الموردين
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">منشورة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.publishedListings}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">مسودات / قيد المراجعة</p>
                <p className="text-2xl font-bold text-gray-700">{stats.draftListings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#B8860B]" /> الموردين
              </h3>
              {stats.pendingSuppliers > 0 && (
                <Link href="/admin/marketplace-suppliers" className="text-xs bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full font-bold">
                  {stats.pendingSuppliers} يحتاج موافقة
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">معتمدين</p>
                <p className="text-2xl font-bold text-green-700">{stats.approvedSuppliers}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">في الانتظار</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.pendingSuppliers}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Top listings */}
        {topListings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              الأكثر مشاهدة
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {topListings.map((listing, i) => (
                <Link
                  key={listing.id}
                  href={`/marketplace/${listing.slug}`}
                  target="_blank"
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 no-underline"
                >
                  <span className="w-6 h-6 bg-[#1F5F3F]/10 text-[#1F5F3F] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <h4 className="flex-1 text-sm font-medium text-gray-900 truncate">{listing.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {listing.views_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {listing.bookings_count}
                    </span>
                    {listing.rating && Number(listing.rating) > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-[#B8860B] text-[#B8860B]" />
                        {Number(listing.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent bookings */}
        {recentBookings.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              آخر الحجوزات
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {recentBookings.map(booking => {
                const status = STATUS_LABELS[booking.status] || STATUS_LABELS.pending_payment
                return (
                  <div key={booking.id} className="flex items-center gap-3 p-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {booking.reference_code && (
                          <span className="text-[10px] text-gray-400 font-mono">#{booking.reference_code}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {booking.listing?.title || 'Listing محذوف'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {booking.customer?.full_name || 'عميل'} · {booking.supplier?.business_name || 'مورد'}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-bold text-[#1F5F3F]">
                        {Number(booking.total_amount).toLocaleString('ar-EG')} <span className="text-xs font-normal">ج.م</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(booking.created_at).toLocaleDateString('ar-EG', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function MetricCard({
  icon, label, value, subtitle, accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  accent: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg mb-2 ${accent}`}>
        {icon}
      </div>
      <p className="text-[11px] text-gray-500 mb-1 leading-tight">{label}</p>
      <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="text-[10px] text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

function StatusCard({
  label, value, color, suffix,
}: {
  label: string
  value: string | number
  color: string
  suffix?: string
}) {
  return (
    <div className={`rounded-xl p-3 border border-gray-100 ${color}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider mb-1 opacity-75">{label}</p>
      <p className="text-xl font-bold">
        {value}
        {suffix && <span className="text-xs font-normal opacity-75 mr-1">{suffix}</span>}
      </p>
    </div>
  )
}
