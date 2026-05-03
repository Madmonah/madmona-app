'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, AlertCircle, Search, Filter,
  Edit2, Trash2, Eye, EyeOff, Building2, MapPin, Image as ImageIcon,
  CheckCircle, TrendingUp, ShieldAlert, Archive, Plus,
} from 'lucide-react'

// ============================================================================
// /admin/listings — Master listings management for admin.
// View, edit, delete, change status of ANY listing across ALL suppliers.
// "Create new" button takes admin to /supplier/marketplace/new where the
// admin bypass picks a supplier and creates the listing.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

interface AdminListing {
  id: string
  title: string
  slug: string
  city: string | null
  district: string | null
  status: 'draft' | 'pending_review' | 'published' | 'paused' | 'rejected'
  bookings_count: number
  views_count: number
  created_at: string
  supplier_id: string
  supplier_name: string
  category_name: string | null
  primary_photo_url: string | null
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'مسودة', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  { value: 'pending_review', label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  { value: 'published', label: 'منشور', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  { value: 'paused', label: 'موقوف', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  { value: 'rejected', label: 'مؤرشف', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
] as const

export default function AdminListingsPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('loading')
  const [listings, setListings] = useState<AdminListing[]>([])
  const [filtered, setFiltered] = useState<AdminListing[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AdminListing['status']>('all')

  const [deleting, setDeleting] = useState<AdminListing | null>(null)
  const [statusChanging, setStatusChanging] = useState<AdminListing | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  useEffect(() => { init() }, [])

  useEffect(() => {
    let f = listings
    if (statusFilter !== 'all') {
      f = f.filter(l => l.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      f = f.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.supplier_name.toLowerCase().includes(q) ||
        (l.city && l.city.toLowerCase().includes(q))
      )
    }
    setFiltered(f)
  }, [listings, searchQuery, statusFilter])

  const init = async () => {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }

    // @ts-expect-error
    const { data: prof } = await supabaseBrowser
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()

    if (prof?.role !== 'admin') { setStage('forbidden'); return }

    await loadListings()
    setStage('ready')
  }

  const loadListings = async () => {
    // @ts-expect-error
    const { data, error } = await supabaseBrowser
      .from('listings')
      .select(`
        id, title, slug, city, district, status,
        bookings_count, views_count, created_at, supplier_id,
        supplier:marketplace_suppliers!supplier_id ( business_name ),
        category:categories!category_id ( name_ar ),
        photos:listing_photos ( url, is_primary )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load listings', error)
      return
    }

    type RawRow = {
      id: string
      title: string
      slug: string
      city: string | null
      district: string | null
      status: AdminListing['status']
      bookings_count: number
      views_count: number
      created_at: string
      supplier_id: string
      supplier: { business_name: string } | null
      category: { name_ar: string } | null
      photos: { url: string; is_primary: boolean }[] | null
    }

    const enriched: AdminListing[] = ((data || []) as RawRow[]).map(row => {
      const primary = row.photos?.find(p => p.is_primary) || row.photos?.[0]
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        city: row.city,
        district: row.district,
        status: row.status,
        bookings_count: row.bookings_count || 0,
        views_count: row.views_count || 0,
        created_at: row.created_at,
        supplier_id: row.supplier_id,
        supplier_name: row.supplier?.business_name || 'مورد محذوف',
        category_name: row.category?.name_ar || null,
        primary_photo_url: primary?.url || null,
      }
    })

    setListings(enriched)
  }

  const handleDelete = async () => {
    if (!deleting) return
    setActionBusy(true)
    setActionMsg(null)

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const accessToken = session?.access_token || ''

      const res = await fetch(`/api/admin/listings/${deleting.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await res.json()

      if (!res.ok || result.error) {
        const errMsg = result.message || result.error || 'فشل الحذف'
        setActionMsg('فشل الحذف: ' + errMsg)
        setActionBusy(false)
        return
      }

      if (result.type === 'soft_delete') {
        setListings(prev => prev.map(l =>
          l.id === deleting.id ? { ...l, status: 'rejected' as const } : l
        ))
        setActionMsg(`✅ ${result.message}`)
      } else {
        setListings(prev => prev.filter(l => l.id !== deleting.id))
        setActionMsg(`✅ ${result.message}`)
      }

      setDeleting(null)
      setTimeout(() => setActionMsg(null), 5000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown'
      setActionMsg('حصل خطأ في الاتصال: ' + msg)
    }
    setActionBusy(false)
  }

  const handleStatusChange = async (newStatus: AdminListing['status']) => {
    if (!statusChanging) return
    setActionBusy(true)
    setActionMsg(null)

    try {
      // @ts-expect-error
      const { error } = await supabaseBrowser
        .from('listings')
        .update({ status: newStatus })
        .eq('id', statusChanging.id)

      if (error) {
        setActionMsg('فشل التحديث: ' + error.message)
        setActionBusy(false)
        return
      }

      setListings(prev => prev.map(l =>
        l.id === statusChanging.id ? { ...l, status: newStatus } : l
      ))
      setStatusChanging(null)
      setActionMsg('تم تحديث الحالة بنجاح')
      setTimeout(() => setActionMsg(null), 3000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown'
      setActionMsg('حصل خطأ: ' + msg)
    }
    setActionBusy(false)
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F5F3F] animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#1F5F3F] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link href="/auth/login?redirect=/admin/listings" className="block bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold">
            دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مش مسموح</h1>
          <p className="text-sm text-gray-600 mb-4">الصفحة دي للأدمن فقط.</p>
          <Link href="/account" className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold">
            ارجع للحساب
          </Link>
        </div>
      </div>
    )
  }

  const totalCount = listings.length
  const publishedCount = listings.filter(l => l.status === 'published').length
  const pendingCount = listings.filter(l => l.status === 'pending_review').length
  const draftCount = listings.filter(l => l.status === 'draft').length

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="w-5 h-5 text-[#1F5F3F] flex-shrink-0" />
            <h1 className="text-lg font-black text-gray-900 truncate">إدارة الخدمات</h1>
          </div>

          {/* + Create New Listing button */}
          <Link
            href="/supplier/marketplace/new"
            className="inline-flex items-center gap-1.5 bg-[#1F5F3F] text-white px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">أضف خدمة</span>
            <span className="sm:hidden">أضف</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="الإجمالي" value={totalCount} color="text-[#1F5F3F]" bg="bg-[#1F5F3F]/10" icon={<Building2 className="w-4 h-4" />} />
          <StatCard label="منشورة" value={publishedCount} color="text-green-700" bg="bg-green-100" icon={<CheckCircle className="w-4 h-4" />} />
          <StatCard label="قيد المراجعة" value={pendingCount} color="text-yellow-700" bg="bg-yellow-100" icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard label="مسودة" value={draftCount} color="text-gray-700" bg="bg-gray-100" icon={<EyeOff className="w-4 h-4" />} />
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالعنوان، اسم المورد، أو المدينة..."
                className="w-full pr-10 pl-3 py-2.5 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="الكل" />
              {STATUS_OPTIONS.map(opt => (
                <FilterChip
                  key={opt.value}
                  active={statusFilter === opt.value}
                  onClick={() => setStatusFilter(opt.value as AdminListing['status'])}
                  label={opt.label}
                />
              ))}
            </div>
          </div>
        </div>

        {actionMsg && (
          <div className={`p-3 rounded-2xl border flex items-start gap-2 ${
            actionMsg.includes('✅') || actionMsg.includes('بنجاح')
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {(actionMsg.includes('✅') || actionMsg.includes('بنجاح'))
              ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <p className="text-sm leading-relaxed">{actionMsg}</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              {listings.length === 0 ? 'مفيش خدمات لسه. ابدأ بإضافة أول خدمة.' : 'مفيش خدمات تطابق البحث'}
            </p>
            {listings.length === 0 && (
              <Link
                href="/supplier/marketplace/new"
                className="inline-flex items-center gap-2 bg-[#1F5F3F] text-white px-5 py-3 rounded-xl text-sm font-bold shadow-soft hover:shadow-elevated transition-all no-underline"
              >
                <Plus className="w-4 h-4" />
                أضف أول خدمة
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(listing => (
              <ListingRow
                key={listing.id}
                listing={listing}
                onDelete={() => setDeleting(listing)}
                onChangeStatus={() => setStatusChanging(listing)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete modal */}
      {deleting && (
        <Modal onClose={() => !actionBusy && setDeleting(null)}>
          <div className="text-center mb-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
              deleting.bookings_count > 0 ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              {deleting.bookings_count > 0
                ? <Archive className="w-7 h-7 text-orange-600" />
                : <Trash2 className="w-7 h-7 text-red-600" />}
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">
              {deleting.bookings_count > 0 ? 'أرشفة الخدمة' : 'تأكيد الحذف'}
            </h2>
            <p className="text-sm text-gray-600 mb-2">
              &quot;{deleting.title}&quot;
            </p>

            {deleting.bookings_count > 0 ? (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-right mt-3">
                <p className="text-xs text-orange-900 leading-relaxed">
                  <span className="font-bold">⚠️ الخدمة دي عندها {deleting.bookings_count} حجز.</span>
                  <br />
                  مش هنحذفها نهائياً عشان نحافظ على تاريخ الحجوزات. هنخفيها من الموقع (status = مؤرشف) ومش هتظهر للعملاء تاني.
                </p>
              </div>
            ) : (
              <p className="text-xs text-red-600 mt-2 font-bold">
                ⚠️ ده هيحذف الخدمة وكل بياناتها (صور، أسعار، إلخ) نهائياً!
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleting(null)}
              disabled={actionBusy}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl disabled:opacity-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleDelete}
              disabled={actionBusy}
              className={`flex-1 py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${
                deleting.bookings_count > 0
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {actionBusy
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : (deleting.bookings_count > 0
                    ? <Archive className="w-4 h-4" />
                    : <Trash2 className="w-4 h-4" />)
              }
              {actionBusy
                ? 'جاري التنفيذ...'
                : (deleting.bookings_count > 0 ? 'أرشف الخدمة' : 'احذف نهائياً')}
            </button>
          </div>
        </Modal>
      )}

      {statusChanging && (
        <Modal onClose={() => !actionBusy && setStatusChanging(null)}>
          <div className="mb-4">
            <h2 className="text-xl font-black text-gray-900 mb-1">تغيير حالة الخدمة</h2>
            <p className="text-sm text-gray-600">&quot;{statusChanging.title}&quot;</p>
          </div>
          <div className="space-y-2">
            {STATUS_OPTIONS.map(opt => {
              const isCurrent = opt.value === statusChanging.status
              return (
                <button
                  key={opt.value}
                  onClick={() => !isCurrent && handleStatusChange(opt.value as AdminListing['status'])}
                  disabled={actionBusy || isCurrent}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    isCurrent
                      ? 'border-[#1F5F3F] bg-[#1F5F3F]/5 cursor-default'
                      : 'border-gray-100 hover:border-[#1F5F3F]/30 bg-white'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                    <span className="font-bold text-sm">{opt.label}</span>
                  </div>
                  {isCurrent && <span className="text-xs text-[#1F5F3F] font-bold">الحالة الحالية</span>}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setStatusChanging(null)}
            disabled={actionBusy}
            className="w-full mt-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 font-bold disabled:opacity-50"
          >
            إلغاء
          </button>
        </Modal>
      )}
    </div>
  )
}

function StatCard({ label, value, color, bg, icon }: {
  label: string; value: number; color: string; bg: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg mb-2 ${bg} ${color}`}>
        {icon}
      </div>
      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-black text-gray-900 tabular">{value}</p>
    </div>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
        active
          ? 'bg-[#1F5F3F] text-white'
          : 'bg-[#FAFAF7] text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )
}

function ListingRow({ listing, onDelete, onChangeStatus }: {
  listing: AdminListing
  onDelete: () => void
  onChangeStatus: () => void
}) {
  const statusOpt = STATUS_OPTIONS.find(o => o.value === listing.status)

  return (
    <div className="bg-white rounded-2xl shadow-soft p-3 flex items-center gap-3 hover:shadow-card transition-shadow">
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
        {listing.primary_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.primary_photo_url} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-gray-900 truncate mb-1">{listing.title}</h3>
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
          {statusOpt && (
            <span className={`px-1.5 py-0.5 rounded-full font-bold ${statusOpt.color}`}>
              {statusOpt.label}
            </span>
          )}
          <span className="inline-flex items-center gap-1 truncate">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{listing.supplier_name}</span>
          </span>
          {listing.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {listing.city}
            </span>
          )}
          {listing.bookings_count > 0 && (
            <span className="font-bold text-[#1F5F3F]">
              {listing.bookings_count} حجز
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href={`/marketplace/${listing.slug}`}
          target="_blank"
          rel="noreferrer"
          className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
          title="معاينة"
        >
          <Eye className="w-4 h-4" />
        </a>
        <button
          onClick={onChangeStatus}
          className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors"
          title="تغيير الحالة"
        >
          <Filter className="w-4 h-4" />
        </button>
        <Link
          href={`/supplier/marketplace/${listing.id}/edit`}
          className="w-9 h-9 rounded-xl bg-[#1F5F3F]/10 hover:bg-[#1F5F3F]/20 text-[#1F5F3F] flex items-center justify-center transition-colors"
          title="تعديل"
        >
          <Edit2 className="w-4 h-4" />
        </Link>
        <button
          onClick={onDelete}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            listing.bookings_count > 0
              ? 'bg-orange-50 hover:bg-orange-100 text-orange-600'
              : 'bg-red-50 hover:bg-red-100 text-red-600'
          }`}
          title={listing.bookings_count > 0 ? 'أرشفة (عندها حجوزات)' : 'حذف'}
        >
          {listing.bookings_count > 0 ? <Archive className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full pointer-events-auto" dir="rtl">
          {children}
        </div>
      </div>
    </>
  )
}
