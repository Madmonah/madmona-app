'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { resolveListingAccess } from '@/lib/listing-edit-access'
// 🕒 (٢١ أغسطس ٢٠٢٦) محمد: «عايز وقت وتاريخ كل إعلان سواء منشور أو درافت
//    أو أي إعلان عمومًا» — صاحب البيزنس كمان لازم يشوفهم على إعلاناته.
import { fmtDateTime, sinceLabel } from '@/lib/arDateTime'
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/lib/notification-sound'
import BookingToast from '@/components/marketplace/BookingToast'
import {
  Plus, Building2, Edit2, Trash2, Eye, EyeOff, AlertCircle,
  Loader2, ArrowRight, CheckCircle, Clock, Lock, MapPin,
  Image as ImageIcon, ExternalLink, Calendar, TrendingUp,
  DollarSign, Bell, Copy, Crown, Users, ShoppingBag, ChefHat, Package,
} from 'lucide-react'

import { currencyLabel } from '@/lib/currency'
// ============================================================================
// /supplier/marketplace
//
// Supplier dashboard. KYC gate philosophy (relaxed v2):
//   - 'pending' suppliers: full dashboard access (can add/publish/manage listings).
//     A small banner reminds them KYC is in review and unlocks before first booking.
//   - 'rejected' / 'suspended': blocked with reason.
//   - 'approved': full access, no banner.
// The actual booking gate lives at /marketplace/[slug]/book.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'rejected' | 'ready'

interface SupplierState {
  id: string
  business_name: string
  logo_url?: string | null
  kyc_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  kyc_rejection_reason: string | null
  /** 🌍 (٦/٩/٢٠٢٦) عملة البيزنس — الإيرادات وأسعار الإعلانات بتتطبع بيها */
  currency?: string | null
}

// Permissions for the current user (full set if owner, subset if staff)
interface AccessState {
  isOwner: boolean
  isStaff: boolean
  roleLabel: string | null
  canManageListings: boolean
  canPublishListings: boolean
  canDeleteListings: boolean
  canManageBookings: boolean
  canViewAnalytics: boolean
  canManageTeam: boolean
}

const FULL_ACCESS: AccessState = {
  isOwner: true,
  isStaff: false,
  roleLabel: null,
  canManageListings: true,
  canPublishListings: true,
  canDeleteListings: true,
  canManageBookings: true,
  canViewAnalytics: true,
  canManageTeam: true,
}

interface ListingSummary {
  currency?: string | null
  id: string
  title: string
  slug: string
  city: string | null
  district: string | null
  status: string
  bookings_count: number
  views_count: number
  created_at: string
  published_at: string | null
  rejection_reason: string | null
  pause_reason: string | null
  category: { name_ar: string; icon: string | null; track: string | null } | null
  photos: { url: string; is_primary: boolean }[] | null
  pricing: { price: number | string; period_type: string; is_active: boolean }[] | null
}

interface Stats {
  totalRevenue: number
  monthBookings: number
  pending: number
  totalBookings: number
  totalReviews: number
  unansweredReviews: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700' },
  pending_review: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800' },
  published: { label: 'منشور', color: 'bg-green-100 text-green-800' },
  paused: { label: 'موقوف', color: 'bg-orange-100 text-orange-800' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
}

function SupplierMarketplaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justCreated = searchParams.get('success') === '1'

  const [stage, setStage] = useState<Stage>('loading')
  const [supplier, setSupplier] = useState<SupplierState | null>(null)
  const [access, setAccess] = useState<AccessState>(FULL_ACCESS)
  const [listings, setListings] = useState<ListingSummary[]>([])
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    monthBookings: 0,
    pending: 0,
    totalBookings: 0,
    totalReviews: 0,
    unansweredReviews: 0,
  })
  const [loadingListings, setLoadingListings] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const [toastVisible, setToastVisible] = useState(false)
  const [newBookingId, setNewBookingId] = useState<string | null>(null)
  const [pulseStats, setPulseStats] = useState(false)
  const supplierIdRef = useRef<string | null>(null)

  // ⚙️ (٧ أغسطس ٢٠٢٦) إعدادات المتجر — المالك يعدّل اسم المتجر واللوجو بنفسه
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const openSettings = () => {
    if (!supplier) return
    setNameDraft(supplier.business_name || '')
    setLogoFile(null)
    setLogoPreview(null)
    setSettingsError(null)
    setSettingsOpen(true)
  }

  const saveStoreSettings = async () => {
    if (!supplier) return
    setSavingSettings(true)
    setSettingsError(null)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session) throw new Error('سجّل دخولك تاني وجرّب')
      let logoUrl: string | null = null
      if (logoFile) {
        const fd = new FormData()
        fd.append('file', logoFile)
        fd.append('supplierId', supplier.id)
        fd.append('kind', 'logo')
        const up = await fetch('/api/supplier/upload-media', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: fd,
        }).then(r => r.json())
        if (!up.success) throw new Error(up.error || 'فشل رفع اللوجو')
        logoUrl = up.url
      }
      const res = await fetch('/api/supplier/store-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ supplierId: supplier.id, businessName: nameDraft.trim(), logoUrl }),
      }).then(r => r.json())
      if (!res.success) throw new Error(res.error || 'فشل الحفظ')
      setSupplier({
        ...supplier,
        business_name: nameDraft.trim() || supplier.business_name,
        logo_url: logoUrl || supplier.logo_url,
      })
      setSettingsOpen(false)
    } catch (e: any) {
      setSettingsError(e?.message || 'حصل خطأ — جرّب تاني')
    } finally {
      setSavingSettings(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      const userId = session.user.id

      // 🏛️ (٢٨/٨) مصدر واحد — v_business بتجمع الجدولين في صف واحد
      let { data: sup } = await supabaseBrowser
        .from('v_business')
        .select('id, business_name, logo_url, kyc_status, tracks, currency')
        .eq('owner_id', userId)
        .maybeSingle()

      let isOwner = !!sup
      let staffPerms: AccessState | null = null

      // If not owner, check if active staff
      if (!sup) {
        const { data: staff } = await supabaseBrowser
          .from('supplier_staff')
          .select(`
            role_label,
            can_manage_listings, can_publish_listings, can_delete_listings,
            can_manage_bookings, can_view_analytics, can_manage_team,
            supplier:marketplace_suppliers(id, business_name, logo_url, kyc_status, kyc_rejection_reason)
          `)
          .eq('profile_id', userId)
          .eq('is_active', true)
          .eq('can_view', true)
          .maybeSingle()

        if (staff && staff.supplier) {
          sup = staff.supplier as unknown as typeof sup
          staffPerms = {
            isOwner: false,
            isStaff: true,
            roleLabel: staff.role_label,
            canManageListings: !!staff.can_manage_listings,
            canPublishListings: !!staff.can_publish_listings,
            canDeleteListings: !!staff.can_delete_listings,
            canManageBookings: !!staff.can_manage_bookings,
            canViewAnalytics: !!staff.can_view_analytics,
            canManageTeam: !!staff.can_manage_team,
          }
        }
      }

      // 🏢 (٢٠ أغسطس ٢٠٢٦) موظف الشركة (`business_employees`) — الحالة
      //    اللي كانت ضايعة خالص. الفحص فوق بيسأل `supplier_staff` بس،
      //    وموظف مضمونة صلاحياته متسجّلة في `business_employees`، فكان
      //    بيوصل هنا بـ`sup = null` ويشوف «مالكش بيزنس» — رغم إنه موظف
      //    في الشركة اللي بتدير المنصة كلها.
      //    محمد: «الموظفين لازم يدخلوا على شاشة المنتجات … ويقدروا يعدّلوا».
      if (!sup) {
        const fallback = await resolveListingAccess(null)
        if (fallback.allowed && fallback.supplierId) {
          const { data: fsup } = await supabaseBrowser
            .from('v_business')
            .select('id, business_name, logo_url, kyc_status, tracks, currency')
            .eq('id', fallback.supplierId).maybeSingle()
          if (fsup) {
            sup = fsup as unknown as typeof sup
            isOwner = fallback.mode === 'owner'
            if (!isOwner) {
              staffPerms = {
                isOwner: false, isStaff: true, roleLabel: fallback.roleLabel,
                canManageListings: true, canPublishListings: true,
                canDeleteListings: false, canManageBookings: true,
                canViewAnalytics: true, canManageTeam: false,
              }
            }
          }
        }
      }

      if (!sup) {
        setStage('no-supplier')
        return
      }

      setSupplier(sup as unknown as SupplierState)
      setAccess(staffPerms || FULL_ACCESS)
      supplierIdRef.current = sup.id

      // Relaxed gate: only block rejected/suspended.
      // Pending and approved both go straight to the dashboard.
      if (sup.kyc_status === 'rejected' || sup.kyc_status === 'suspended') {
        setStage('rejected')
      } else {
        setStage('ready')
        loadListings(sup.id)
        if (isOwner || staffPerms?.canViewAnalytics) {
          loadStats(sup.id)
        }
        requestNotificationPermission().catch(() => {})
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (stage !== 'ready' || !supplier?.id) return

    const channel = supabaseBrowser
      .channel(`supplier-bookings-${supplier.id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_bookings',
          filter: `supplier_id=eq.${supplier.id}`,
        },
        (payload: { new: { id: string } }) => {
          playNotificationSound()
          setNewBookingId(payload.new.id)
          setToastVisible(true)
          setPulseStats(true)
          setTimeout(() => setPulseStats(false), 2000)
          showBrowserNotification(
            'حجز جديد على Madmona! 🔔',
            'في حجز جديد بانتظار مراجعتك',
            `/supplier/marketplace/bookings/${payload.new.id}`
          )
          if (supplierIdRef.current && (access.isOwner || access.canViewAnalytics)) {
            loadStats(supplierIdRef.current)
          }
        }
      )
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(channel)
    }
  }, [stage, supplier?.id, access.isOwner, access.canViewAnalytics])

  const loadListings = async (supId: string) => {
    setLoadingListings(true)
    const { data } = await supabaseBrowser
      .from('listings')
      .select(`
        id, title, slug, city, district, status, currency, bookings_count, views_count, created_at, published_at, rejection_reason, pause_reason,
        category:categories(name_ar, icon, track),
        photos:listing_photos(url, is_primary),
        pricing:pricing_rules(price, period_type, is_active)
      `)
      .eq('supplier_id', supId)
      .order('created_at', { ascending: false })

    // ⚠️ (٢١ أغسطس ٢٠٢٦) `as unknown as` مش ترفيه: الأنواع المولّدة في
    //    src/types/supabase.ts لسه مافيهاش `pause_reason`، فالـselect
    //    بيرجّع SelectQueryError. جرّبت أزوّد العمود للأنواع بإيدي
    //    وطلع خطأ تاني في MarketplaceClient (نسختين من postgrest-js
    //    في node_modules) — يعني الحل الصح إن الأنواع تتولّد من
    //    الداتابيز تاني (supabase gen types) مش تتكتب بالإيد.
    setListings((data || []) as unknown as ListingSummary[])
    setLoadingListings(false)
  }

  const loadStats = async (supId: string) => {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    const { data: bookings } = await supabaseBrowser
      .from('marketplace_bookings')
      .select('status, total_amount, supplier_payout, created_at')
      .eq('supplier_id', supId)

    const arr = (bookings || []) as Array<{ status: string; total_amount: number; supplier_payout: number; created_at: string }>
    const completed = arr.filter(b => ['confirmed', 'active', 'completed'].includes(b.status))
    const totalRevenue = completed.reduce((s, b) => s + Number(b.supplier_payout || 0), 0)
    const monthBookings = arr.filter(b => new Date(b.created_at) > monthAgo).length
    const pending = arr.filter(b => b.status === 'pending_payment').length

    const { data: rev } = await supabaseBrowser
      .from('reviews')
      .select('id, supplier_response')
      .eq('supplier_id', supId)
      .eq('is_published', true)

    const revArr = (rev || []) as Array<{ supplier_response: string | null }>

    setStats({
      totalRevenue,
      monthBookings,
      pending,
      totalBookings: arr.length,
      totalReviews: revArr.length,
      unansweredReviews: revArr.filter(r => !r.supplier_response).length,
    })
  }

  const togglePublished = async (listing: ListingSummary) => {
    if (!access.canPublishListings) {
      alert('مفيش صلاحية لنشر/إيقاف المنتجات.')
      return
    }
    setActioningId(listing.id)
    const newStatus = listing.status === 'published' ? 'paused' : 'published'
    const { error } = await supabaseBrowser
      .from('listings')
      .update({ status: newStatus })
      .eq('id', listing.id)
    setActioningId(null)
    if (error) {
      alert('فشل: ' + error.message)
    } else if (supplierIdRef.current) {
      loadListings(supplierIdRef.current)
    }
  }

  const deleteListing = async (listing: ListingSummary) => {
    if (!access.canDeleteListings) {
      alert('مفيش صلاحية لحذف المنتجات.')
      return
    }
    if (!confirm(`متأكد من حذف "${listing.title}"؟ ده مش هيتراجع.`)) return
    setActioningId(listing.id)
    const { error } = await supabaseBrowser
      .from('listings')
      .delete()
      .eq('id', listing.id)
    setActioningId(null)
    if (error) {
      alert('فشل: ' + error.message)
    } else if (supplierIdRef.current) {
      loadListings(supplierIdRef.current)
    }
  }

  const duplicateListing = async (listing: ListingSummary) => {
    if (!access.canManageListings) {
      alert('مفيش صلاحية لإنشاء listings جديدة.')
      return
    }
    setActioningId(listing.id)
    const { data: orig } = await supabaseBrowser
      .from('listings')
      .select('*')
      .eq('id', listing.id)
      .single()

    if (!orig) {
      setActioningId(null)
      return
    }

    type ListingRow = {
      id: string
      slug: string
      title: string
      status: string
      bookings_count: number
      views_count: number
      created_at: string
      updated_at: string
      [key: string]: unknown
    }
    const o = orig as ListingRow

    // Create new listing as draft
    const newListing: Record<string, unknown> = {
      ...o,
      title: o.title + ' (نسخة)',
      slug: `${o.slug}-copy-${Date.now().toString(36).slice(-4)}`,
      status: 'draft',
      bookings_count: 0,
      views_count: 0,
    }
    delete newListing.id
    delete newListing.created_at
    delete newListing.updated_at
    // 🕒 (٢١ أغسطس ٢٠٢٦) النسخة درافت لسه ماتنشرتش — لازم تاريخ النشر يترمي.
    //    كان بيتنسخ من الأصل، فالنسخة تطلع «مسودة» ومكتوب جنبها إنها اتنشرت
    //    من شهر. ماكانش باين قبل كده عشان التاريخ مكانش معروض أصلًا.
    delete newListing.published_at

    const { data: dup, error } = await supabaseBrowser
      .from('listings')
      .insert(newListing)
      .select('id')
      .single()

    setActioningId(null)
    if (error || !dup) {
      alert('فشل النسخ: ' + (error?.message || 'unknown'))
      return
    }
    router.push(`/supplier/marketplace/${dup.id}/edit`)
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  if (stage === 'loading') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#059669] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href="/auth/login?redirect=/supplier/marketplace"
            className="block bg-[#34D399] text-[#04352A] py-3 rounded-xl font-semibold"
          >
            دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'no-supplier') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <Building2 className="w-8 h-8 text-[#059669] mx-auto mb-3" />
          <h1 className="font-bold mb-2">مش مورد على Madmona</h1>
          <p className="text-sm text-gray-500 mb-4">
            عشان تنشر listings لازم تسجّل كمورد، أو يدعوك مدير فريق.
          </p>
          <Link
            href="/supplier/register"
            className="inline-block bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-xl font-semibold"
          >
            سجّل دلوقتي
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'rejected' && supplier) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">الحساب محظور</h1>
          {supplier.kyc_rejection_reason && (
            <p className="text-sm text-gray-600 mb-4 bg-red-50 p-3 rounded-xl">
              {supplier.kyc_rejection_reason}
            </p>
          )}
          <a href="https://wa.me/201002229982" className="inline-block bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-xl font-semibold">
            تواصل مع Madmona
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/account" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {supplier?.business_name}
                {access.isOwner ? (
                  <Crown className="w-4 h-4 text-[#2FA084]" aria-label="مالك" />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#34D399]/10 text-[#059669] rounded-full">
                    {access.roleLabel || 'موظف'}
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500">لوحة أجر معانا</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {access.isOwner && (
              <button
                onClick={openSettings}
                className="text-xs font-bold text-gray-600 hover:bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1"
                title="إعدادات المتجر — الاسم واللوجو"
              >
                ⚙️ المتجر
              </button>
            )}
            {access.canManageBookings && (
              <Link href="/supplier/marketplace/bookings" className="text-xs font-bold text-[#059669] hover:bg-[#34D399]/10 px-2 py-1 rounded-lg flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                الحجوزات
              </Link>
            )}
            {access.canManageBookings && (
              <Link href="/supplier/marketplace/orders" className="text-xs font-bold text-[#059669] hover:bg-[#34D399]/10 px-2 py-1 rounded-lg flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                الأوردرز
              </Link>
            )}
            {access.isOwner && access.canManageTeam && (
              <Link
                href="/supplier/team"
                className="text-xs font-bold text-orange-700 hover:bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                الفريق
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ⚙️ مودال إعدادات المتجر — اسم + لوجو (المالك بس) */}
      {settingsOpen && access.isOwner && supplier && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => { if (!savingSettings) setSettingsOpen(false) }}
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black text-gray-900 mb-4">⚙️ إعدادات المتجر</h2>

            <label className="block text-xs font-bold text-gray-600 mb-1">اسم المتجر</label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={80}
              placeholder="اسم متجرك زي ما هيظهر للعملاء"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#059669]/50 mb-4"
            />

            <label className="block text-xs font-bold text-gray-600 mb-1">لوجو المتجر</label>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                {(logoPreview || supplier.logo_url) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoPreview || supplier.logo_url || ''} alt="لوجو المتجر" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🏬</span>
                )}
              </span>
              <label className="text-xs font-bold text-[#059669] bg-[#34D399]/10 hover:bg-[#34D399]/20 px-4 py-2 rounded-xl cursor-pointer transition-colors">
                اختار صورة
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null
                    setLogoFile(f)
                    setLogoPreview(f ? URL.createObjectURL(f) : null)
                  }}
                />
              </label>
            </div>

            {settingsError && <p className="text-xs font-bold text-red-600 mb-3">{settingsError}</p>}

            <div className="flex gap-2">
              <button
                onClick={saveStoreSettings}
                disabled={savingSettings}
                className="flex-1 py-3 bg-[#34D399] text-[#04352A] rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {savingSettings ? 'بيحفظ…' : 'حفظ'}
              </button>
              <button
                onClick={() => setSettingsOpen(false)}
                disabled={savingSettings}
                className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <BookingToast
        visible={toastVisible}
        bookingId={newBookingId}
        onClose={() => setToastVisible(false)}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 pb-12">
        {justCreated && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-900">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>تم إنشاء المنتج بنجاح!</span>
          </div>
        )}

        {/* KYC pending banner — supplier can use the dashboard fully but customers
            won't be able to book yet until KYC is approved */}
        {supplier?.kyc_status === 'pending' && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-900 flex-1">
              <p className="font-bold mb-0.5">حسابك تحت المراجعة</p>
              <p className="text-xs leading-relaxed text-yellow-900/85">
                تقدر تضيف وتعدّل listings عادي. الموافقة النهائية بتيجي قبل أول حجز يقدر زبون يعمله عندك.
                هنبعتلك إشعار على واتساب لما تتفعل.
              </p>
            </div>
          </div>
        )}

        {/* Staff banner if not owner */}
        {access.isStaff && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">إنت في الفريق كـ&ldquo;{access.roleLabel || 'موظف'}&rdquo;</p>
              <p className="text-blue-700 mt-0.5">صلاحياتك بتتحدد من مالك أجر معانا.</p>
            </div>
          </div>
        )}

        {/* Stats */}
        {(access.isOwner || access.canViewAnalytics) && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-1.5 mb-1 text-[#059669]">
                <DollarSign className="w-3.5 h-3.5" />
                <p className="text-[10px] font-medium uppercase tracking-wider">إيرادات صافية</p>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900">
                {stats.totalRevenue.toLocaleString('ar-EG')}
                <span className="text-xs font-normal text-gray-500 mr-1">{currencyLabel(supplier?.currency)}</span>
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-1.5 mb-1 text-gray-500">
                <TrendingUp className="w-3.5 h-3.5" />
                <p className="text-[10px] font-medium uppercase tracking-wider">حجوزات الشهر</p>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900">{stats.monthBookings}</p>
            </div>
            <div className={`rounded-xl border p-3 transition-all ${
              stats.pending > 0
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-white border-gray-100'
            } ${pulseStats ? 'ring-2 ring-yellow-400' : ''}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${
                stats.pending > 0 ? 'text-yellow-700' : 'text-gray-500'
              }`}>
                <Bell className="w-3.5 h-3.5" />
                <p className="text-[10px] font-medium uppercase tracking-wider">بانتظار الدفع</p>
              </div>
              <p className={`text-base sm:text-lg font-bold ${
                stats.pending > 0 ? 'text-yellow-900' : 'text-gray-900'
              }`}>
                {stats.pending}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">
            Listings ({listings.length})
          </h2>
          {access.canManageListings && (
            <div className="flex items-center gap-2">
              <Link
                href="/supplier/marketplace/bulk-products"
                className="flex items-center gap-1 px-3 py-2 bg-white border border-[#059669]/30 text-[#059669] rounded-lg text-sm font-semibold hover:bg-[#34D399]/5"
                title="ضيف إعلانات أو منتجات بالجملة من شيت Excel"
              >
                📊 استيراد بالجملة (Excel)
              </Link>
              <Link
                href="/supplier/marketplace/new"
                className="flex items-center gap-1 px-4 py-2 bg-[#34D399] text-[#04352A] rounded-lg text-sm font-semibold hover:bg-[#34D399]/90"
              >
                <Plus className="w-4 h-4" /> ضيف منتج جديد
              </Link>
            </div>
          )}
        </div>

        {loadingListings ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">مفيش منتجات لسه</h3>
            <p className="text-sm text-gray-500 mb-6">ابدأ بإضافة أول منتج عشان تستقبل حجوزات</p>
            {access.canManageListings && (
              <Link
                href="/supplier/marketplace/new"
                className="inline-flex items-center gap-1 px-5 py-2.5 bg-[#34D399] text-[#04352A] rounded-lg text-sm font-semibold hover:bg-[#34D399]/90"
              >
                <Plus className="w-4 h-4" /> ضيف أول منتج
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map(listing => {
              const status = STATUS_LABELS[listing.status] || STATUS_LABELS.draft
              const photos = listing.photos || []
              const primary = photos.find(p => p.is_primary) || photos[0]
              const photoUrl = primary?.url

              const activePrices = (listing.pricing || [])
                .filter(p => p.is_active)
                .map(p => Number(p.price))
                .filter(p => p > 0)
              const startingPrice = activePrices.length > 0 ? Math.min(...activePrices) : null

              return (
                <div key={listing.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col sm:flex-row">
                  <div className="sm:w-40 sm:h-32 bg-gray-100 flex-shrink-0">
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
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {listing.category && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full flex items-center gap-1">
                              {listing.category.icon} {listing.category.name_ar}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 mt-1 truncate">{listing.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {(listing.district || listing.city) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {[listing.district, listing.city].filter(Boolean).join(', ')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {listing.views_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {listing.bookings_count}
                          </span>
                        </div>
                        {/* 🕒 (٢١ أغسطس ٢٠٢٦) محمد: «عايز وقت وتاريخ كل إعلان
                            سواء منشور أو درافت أو أي إعلان عمومًا».
                            كان مفيش أي تاريخ على الكارت — صاحب البيزنس ماكانش
                            يعرف الإعلان ده بقاله قد إيه ولا نزل إمتى. */}
                        {/* 🚫 (٢١ أغسطس ٢٠٢٦) محمد: «وعايزين سبب للإعلانات
                            المرفوضة». صاحب البيزنس كان بيلاقي إعلانه «مرفوض»
                            من غير أي كلمة — ولا يعرف يصلّح إيه ولا يسأل مين. */}
                        {/* ⏸️ (٢١ أغسطس ٢٠٢٦) وسبب الإيقاف كمان — محمد:
                            «الإعلانات الموقوفة برضو عايز أعرف اتوقفت ليه».
                            صاحب البيزنس كان بيلاقي إعلانه واقف من غير كلمة. */}
                        {listing.status === 'paused' && listing.pause_reason && (
                          <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-amber-700 leading-none mb-1">سبب الإيقاف</p>
                              <p className="text-[11.5px] text-amber-900 leading-relaxed">{listing.pause_reason}</p>
                            </div>
                          </div>
                        )}
                        {listing.status === 'rejected' && listing.rejection_reason && (
                          <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-red-700 leading-none mb-1">سبب الرفض</p>
                              <p className="text-[11.5px] text-red-800 leading-relaxed">{listing.rejection_reason}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            اتعمل {fmtDateTime(listing.created_at)} ({sinceLabel(listing.created_at)})
                          </span>
                          {listing.published_at && (
                            <span className="text-emerald-600">
                              · اتنشر {fmtDateTime(listing.published_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm text-gray-700">
                        {startingPrice !== null ? (
                          <>
                            <span className="font-bold">{startingPrice.toLocaleString('ar-EG')}</span>
                            <span className="text-xs text-gray-500"> {currencyLabel(listing.currency)}</span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">بدون سعر</span>
                        )}
                      </div>

                      <div className="flex gap-1">
                        {listing.status === 'published' && (
                          <Link
                            href={`/marketplace/${listing.slug}`}
                            target="_blank"
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                            title="عرض الصفحة"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {access.canPublishListings && (
                          <button
                            onClick={() => togglePublished(listing)}
                            disabled={actioningId === listing.id}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50"
                            title={listing.status === 'published' ? 'إيقاف النشر' : 'نشر'}
                          >
                            {listing.status === 'published'
                              ? <EyeOff className="w-3.5 h-3.5" />
                              : <Eye className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}
                        {access.canManageListings && (
                          <button
                            onClick={() => duplicateListing(listing)}
                            disabled={actioningId === listing.id}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                            title="نسخ كمسودة جديدة"
                          >
                            {actioningId === listing.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        {access.canManageListings && listing.category?.track === 'restaurants' && (
                          <Link
                            href={`/supplier/marketplace/${listing.id}/menu`}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                            title="إدارة المنيو"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {access.canManageListings && listing.category?.track !== 'restaurants' && (
                          <Link
                            href={`/supplier/marketplace/${listing.id}/products`}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                            title="إدارة المنتجات + استيراد Excel"
                          >
                            <Package className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {access.canManageListings && (
                          <Link
                            href={`/supplier/marketplace/${listing.id}/edit`}
                            className="p-1.5 text-[#059669] hover:bg-[#34D399]/10 rounded"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {access.canDeleteListings && (
                          <button
                            onClick={() => deleteListing(listing)}
                            disabled={actioningId === listing.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function SupplierMarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    }>
      <SupplierMarketplaceContent />
    </Suspense>
  )
}
