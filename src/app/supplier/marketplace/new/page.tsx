'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ListingForm from '@/components/marketplace/ListingForm'
import {
  ArrowRight, Loader2, AlertCircle, Lock, Users, ShieldCheck, Building2, ChevronDown,
} from 'lucide-react'

// ============================================================================
// /supplier/marketplace/new
//
// Auth modes (priority order):
//   1. ADMIN MODE — `madmona_admin_pw` in sessionStorage → can create under
//      ANY supplier (picks from a dropdown). Default: Madmona.
//   2. OWNER MODE — user owns an approved supplier → uses their supplier_id.
//   3. STAFF MODE — user is staff with can_manage_listings → uses employer's id.
// ============================================================================

type Stage =
  | 'loading'
  | 'unauthenticated'
  | 'no-supplier'
  | 'not-approved'
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

        // Load all approved suppliers for the picker
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
      if (sup.kyc_status !== 'approved') {
        setStage('not-approved')
        return
      }

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
          <Lock className="w-8 h-8 text-[#1F5F3F] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent('/supplier/marketplace/new')}`}
            className="block bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold"
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
          <h1 className="font-bold mb-2">مفيش صلاحية لإضافة listings</h1>
          <p className="text-sm text-gray-600 mb-6">
            صلاحية &ldquo;إدارة الـlistings&rdquo; مش مفعّلة في حسابك. كلّم مدير الفريق لو محتاج تتفعّلك.
          </p>
          <Link
            href="/supplier/marketplace"
            className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            ارجع للوحة
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'no-supplier' || stage === 'not-approved') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">
            {stage === 'no-supplier' ? 'لازم تسجل كمورد الأول' : 'حسابك لسه قيد المراجعة'}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {stage === 'no-supplier'
              ? 'عشان تضيف listings، لازم تكون مورد موثّق على Madmona.'
              : 'لما الإدارة توافق على حسابك، هتقدر تبدأ تضيف listings.'}
          </p>
          <Link
            href={stage === 'no-supplier' ? '/supplier/register' : '/supplier/marketplace'}
            className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            {stage === 'no-supplier' ? 'سجّل دلوقتي' : 'العودة'}
          </Link>
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
              <h1 className="text-lg font-bold text-gray-900">listing جديد</h1>
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
                إنت بتنشر listing بصلاحيات admin. اختار المورد اللي هيتسجل تحته الـlisting.
                الـlisting هيظهر في خدمات مضمونة (/marketplace) فوراً بعد النشر.
              </p>
            </div>
          </div>

          {suppliers.length === 0 ? (
            <div className="bg-white rounded-2xl border p-6 text-center">
              <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
              <h2 className="font-bold mb-2">مفيش موردين موافق عليهم</h2>
              <p className="text-sm text-gray-600 mb-4">
                لازم يكون فيه مورد واحد على الأقل بـkyc_status = approved عشان تنشر listing.
              </p>
              <Link
                href="/admin/marketplace-suppliers"
                className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold"
              >
                ادارة الموردين
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-[#1F5F3F]" />
                  المورد
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
                    className="w-full appearance-none px-4 py-3 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10"
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
                  {suppliers.length} مورد موافق · المختار:{' '}
                  <span className="font-bold text-[#1F5F3F]">
                    {suppliers.find(s => s.id === selectedSupplierId)?.business_name}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleAdminConfirm}
                disabled={!selectedSupplierId}
                className="w-full bg-[#1F5F3F] text-white py-3.5 rounded-xl font-bold shadow-soft hover:shadow-elevated hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
              >
                ابدأ إنشاء الـlisting
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
            <h1 className="text-lg font-bold text-gray-900">listing جديد</h1>
            <p className="text-xs text-gray-500">املا الـ5 خطوات لنشر الـlisting</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {isAdmin && selectedSupplier && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>وضع الإدارة:</strong> الـlisting هيتسجل تحت{' '}
              <strong>{selectedSupplier.business_name}</strong>. بعد النشر، يظهر في خدمات مضمونة فوراً.
            </span>
          </div>
        )}
        {isStaff && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>إنت بتنشر بصفتك &ldquo;{roleLabel || 'موظف'}&rdquo; — الـlisting هيتسجل باسم الـsupplier.</span>
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
