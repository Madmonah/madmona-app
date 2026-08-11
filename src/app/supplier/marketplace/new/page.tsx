'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ListingForm from '@/components/marketplace/ListingForm'
import {
  ArrowRight, Loader2, AlertCircle, Lock, Users, ShieldCheck, Building2, ChevronDown, Clock,
} from 'lucide-react'

// ============================================================================
// /supplier/marketplace/new
//
// Auth modes (priority order):
//   1. ADMIN MODE — `madmona_admin_pw` in sessionStorage → can create under
//      ANY supplier (picks from a dropdown). Default: Madmona.
//   2. OWNER MODE — user owns a supplier (any KYC except rejected/suspended)
//      → uses their supplier_id.
//   3. STAFF MODE — user is staff with can_manage_listings → uses employer's id.
//
// KYC gate philosophy (relaxed v2):
//   - Pending suppliers CAN add listings. The actual gate is at booking time.
//   - Only rejected/suspended are blocked here.
// ============================================================================

type Stage =
  | 'loading'
  | 'unauthenticated'
  | 'no-supplier'
  | 'supplier-blocked'
  | 'no-permission'
  | 'admin-pick-supplier'
  | 'ready'

type Mode = 'admin' | 'owner' | 'staff'

interface SupplierOption {
  id: string
  business_name: string
  kyc_status: string
}

const MADMONA_SUPPLIER_ID = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'

export default function NewListingPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [mode, setMode] = useState<Mode>('owner')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [roleLabel, setRoleLabel] = useState<string | null>(null)
  const [kycStatus, setKycStatus] = useState<string | null>(null)

  // Admin-specific state
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(MADMONA_SUPPLIER_ID)

  useEffect(() => {
    const init = async () => {
      // ============================================================
      // 1. ADMIN MODE — admin password in sessionStorage
      // ============================================================
      const adminPw = typeof window !== 'undefined'
        ? sessionStorage.getItem('madmona_admin_pw')
        : null

      const { data: { session } } = await supabaseBrowser.auth.getSession()

      if (adminPw) {
        setMode('admin')
        if (session?.user) {
          setUserId(session.user.id)
        }

        // Admin still uses approved-only suppliers (admin assigns to verified
        // owners). This stays strict because admin is curating; the relaxed
        // gate only matters for self-service supplier creation.
        // @ts-expect-error
        const { data: sups } = await supabaseBrowser
          .from('marketplace_suppliers')
          .select('id, business_name, kyc_status')
          .eq('kyc_status', 'approved')
          .order('business_name', { ascending: true })

        const list: SupplierOption[] = (sups as SupplierOption[]) || []
        setSuppliers(list)

        // Default to Madmona if available, otherwise first supplier
        const madmonaInList = list.find(s => s.id === MADMONA_SUPPLIER_ID)
        const defaultId = madmonaInList?.id || list[0]?.id || ''
        setSelectedSupplierId(defaultId)

        // For admin without user session, use supplier_id as userId proxy for photo paths
        if (!session?.user && defaultId) {
          setUserId(defaultId)
        }

        setStage('admin-pick-supplier')
        return
      }

      // ============================================================
      // 2. Not admin — require user session
      // ============================================================
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }
      setUserId(session.user.id)

      // Owner check
      // @ts-expect-error
      let { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, kyc_status')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (sup) {
        setMode('owner')
      } else {
        // 3. Staff check
        // @ts-expect-error
        const { data: staff } = await supabaseBrowser
          .from('supplier_staff')
          .select(`
            role_label, can_manage_listings,
            supplier:marketplace_suppliers(id, kyc_status)
          `)
          .eq('profile_id', session.user.id)
          .eq('is_active', true)
          .eq('can_view', true)
          .maybeSingle()

        if (staff && staff.supplier) {
          if (!staff.can_manage_listings) {
            setStage('no-permission')
            return
          }
          sup = staff.supplier as typeof sup
          setMode('staff')
          setRoleLabel(staff.role_label)
        }
      }

      if (!sup) {
        setStage('no-supplier')
        return
      }

      // Relaxed KYC gate: only block rejected/suspended.
      // Pending and approved both proceed. The booking page enforces the
      // approval check at booking time.
      if (sup.kyc_status === 'rejected' || sup.kyc_status === 'suspended') {
        setKycStatus(sup.kyc_status)
        setStage('supplier-blocked')
        return
      }

      setKycStatus(sup.kyc_status)
      setSupplierId(sup.id)
      setStage('ready')
    }
    init()
  }, [])

  const handleAdminConfirm = () => {
    if (!selectedSupplierId) return
    setSupplierId(selectedSupplierId)
    // For admin without user session, use supplier_id as userId proxy
    if (!userId) {
      setUserId(selectedSupplierId)
    }
    setStage('ready')
  }

  // ============================================================================
  // Render guards
  // ============================================================================

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
          <Lock className="w-8 h-8 text-[#2B4521] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent('/supplier/marketplace/new')}`}
            className="block bg-[#2B4521] text-white py-3 rounded-xl font-semibold"
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
          <h1 className="font-bold mb-2">مفيش صلاحية لإضافة منتجات</h1>
          <p className="text-sm text-gray-600 mb-6">
            صلاحية &ldquo;إدارة المنتجات&rdquo; مش مفعّلة في حسابك. كلّم مدير الفريق لو محتاج تتفعّلك.
          </p>
          <Link
            href="/supplier/marketplace"
            className="inline-block bg-[#2B4521] text-white px-5 py-2.5 rounded-xl font-semibold"
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
        <div className="bg-white rounded-2xl border p-8 text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">لازم تسجل كأجر معانا الأول</h1>
          <p className="text-sm text-gray-600 mb-6">
            عشان تضيف listings، لازم تسجّل كأجر معانا على Madmona.
          </p>
          <Link
            href="/supplier/register"
            className="inline-block bg-[#2B4521] text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            سجّل دلوقتي
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'supplier-blocked') {
    const isSuspended = kycStatus === 'suspended'
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">
            {isSuspended ? 'حسابك موقوف مؤقتاً' : 'الحساب محظور'}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            تواصل مع فريق Madmona على واتساب للتفاصيل وإعادة التفعيل.
          </p>
          <a
            href="https://wa.me/201002229982"
            className="inline-block bg-[#2B4521] text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            تواصل
          </a>
        </div>
      </div>
    )
  }

  // ============================================================================
  // Admin: pick supplier first
  // ============================================================================

  if (stage === 'admin-pick-supplier') {
    return (
      <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/admin/listings" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">منتج جديد</h1>
              <p className="text-xs text-gray-500">إنت في وضع الإدارة</p>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-purple-900">
              <p className="font-bold mb-1">وضع الإدارة (Admin Mode)</p>
              <p className="text-xs leading-relaxed text-purple-800/90">
                إنت بتنشر listing بصلاحيات admin. اختار أجر معانا اللي هيتسجل تحته المنتج.
                المنتج هيظهر في خدمات مضمونة (/marketplace) فوراً بعد النشر.
              </p>
            </div>
          </div>

          {suppliers.length === 0 ? (
            <div className="bg-white rounded-2xl border p-6 text-center">
              <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
              <h2 className="font-bold mb-2">مفيش أجر معانا موافق عليهم</h2>
              <p className="text-sm text-gray-600 mb-4">
                لازم يكون فيه أجر معانا واحد على الأقل بـkyc_status = approved عشان تنشر listing.
              </p>
              <Link
                href="/admin/marketplace-suppliers"
                className="inline-block bg-[#2B4521] text-white px-5 py-2.5 rounded-xl font-semibold"
              >
                إدارة أجر معانا
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-[#2B4521]" />
                  أجر معانا
                </label>
                <div className="relative">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => {
                      setSelectedSupplierId(e.target.value)
                      // Update userId proxy if no real session
                      if (!userId || userId === MADMONA_SUPPLIER_ID || suppliers.find(s => s.id === userId)) {
                        setUserId(e.target.value)
                      }
                    }}
                    className="w-full appearance-none px-4 py-3 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2B4521]/40 focus:ring-4 focus:ring-[#2B4521]/10"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.business_name}
                        {s.id === MADMONA_SUPPLIER_ID ? ' (Madmona)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {suppliers.length} أجر معانا موافق · المختار:{' '}
                  <span className="font-bold text-[#2B4521]">
                    {suppliers.find(s => s.id === selectedSupplierId)?.business_name}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleAdminConfirm}
                disabled={!selectedSupplierId}
                className="w-full bg-[#2B4521] text-white py-3.5 rounded-xl font-bold shadow-soft hover:shadow-elevated hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
              >
                ابدأ إنشاء المنتج
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ============================================================================
  // Ready: render the form
  // ============================================================================

  const isAdmin = mode === 'admin'
  const isStaff = mode === 'staff'
  const selectedSupplier = suppliers.find(s => s.id === supplierId)
  const showPendingNotice = !isAdmin && kycStatus === 'pending'

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href={isAdmin ? '/admin/listings' : '/supplier/marketplace'}
            className="p-1 hover:bg-gray-50 rounded-full"
          >
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">منتج جديد</h1>
            <p className="text-xs text-gray-500">املا الـ5 خطوات لنشر المنتج</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {isAdmin && selectedSupplier && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>وضع الإدارة:</strong> المنتج هيتسجل تحت{' '}
              <strong>{selectedSupplier.business_name}</strong>. بعد النشر، يظهر في خدمات مضمونة فوراً.
            </span>
          </div>
        )}
        {isStaff && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>إنت بتنشر بصفتك &ldquo;{roleLabel || 'موظف'}&rdquo; — المنتج هيتسجل باسم الـsupplier.</span>
          </div>
        )}
        {showPendingNotice && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-900 flex items-start gap-2">
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-700" />
            <span>
              <strong>حسابك تحت المراجعة:</strong> تقدر تضيف المنتج وتنشره عادي. الموافقة النهائية على الحساب بتيجي قبل أول حجز يقدر زبون يعمله عندك.
            </span>
          </div>
        )}
        {supplierId && userId && (
          <ListingForm
            supplierId={supplierId}
            userId={userId}
            redirectAfterSubmit={isAdmin ? '/admin/listings' : undefined}
          />
        )}
      </main>
    </div>
  )
}
