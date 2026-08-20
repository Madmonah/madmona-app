'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from './supabase-browser'

// ============================================================================
// useSupplierAccess — unified access check for supplier dashboard pages
//
// Returns ownership status + granular permissions for the current user
// against a specific supplier (or "their" supplier if not specified).
//
// Usage:
//   const access = useSupplierAccess()
//   if (access.loading) return <Loader />
//   if (!access.canView) return <NoAccess />
//   if (!access.canManageListings) <DisabledButton />
// ============================================================================

export type SupplierPermission =
  | 'can_view'
  | 'can_manage_listings'
  | 'can_publish_listings'
  | 'can_delete_listings'
  | 'can_manage_bookings'
  | 'can_complete_bookings'
  | 'can_respond_reviews'
  | 'can_view_analytics'
  | 'can_manage_pricing'
  | 'can_manage_team'

export interface SupplierAccess {
  loading: boolean
  authenticated: boolean
  supplierId: string | null
  supplierName: string | null
  isOwner: boolean
  isStaff: boolean
  canView: boolean
  canManageListings: boolean
  canPublishListings: boolean
  canDeleteListings: boolean
  canManageBookings: boolean
  canCompleteBookings: boolean
  canRespondReviews: boolean
  canViewAnalytics: boolean
  canManagePricing: boolean
  canManageTeam: boolean
  // Helper
  hasPermission: (perm: SupplierPermission) => boolean
}

const FALSE_ACCESS: SupplierAccess = {
  loading: false,
  authenticated: false,
  supplierId: null,
  supplierName: null,
  isOwner: false,
  isStaff: false,
  canView: false,
  canManageListings: false,
  canPublishListings: false,
  canDeleteListings: false,
  canManageBookings: false,
  canCompleteBookings: false,
  canRespondReviews: false,
  canViewAnalytics: false,
  canManagePricing: false,
  canManageTeam: false,
  hasPermission: () => false,
}

/**
 * Hook to determine the current user's access to a supplier.
 * @param explicitSupplierId — optional. If provided, checks access to that supplier.
 *                            If omitted, looks for the user's own supplier.
 */
export function useSupplierAccess(explicitSupplierId?: string): SupplierAccess {
  const [access, setAccess] = useState<SupplierAccess>({ ...FALSE_ACCESS, loading: true })

  useEffect(() => {
    let cancelled = false

    // ========================================================================
    // 🔐 (٢٠ أغسطس ٢٠٢٦) نداء **واحد** بيحسم الصلاحية — `my_supplier_access`.
    //
    // قبل كده الهوك ده كان بيسأل الجداول بنفسه واحد واحد:
    //   marketplace_suppliers (مالك؟) → supplier_staff (موظف؟)
    // والنتيجة غلط في حالتين حقيقيتين حصلوا:
    //   • موظف **مضمونة** مالوش صف في supplier_staff أصلًا (مضمونة شركة
    //     مش بايع في الماركتبليس) → كان بيتقفل في وشّه رغم إن صلاحياته
    //     متسجّلة في business_employees.
    //   • **أي** صف في platform_admins كان بياخد صلاحية كاملة على كل
    //     بيزنس — حتى بدور 'staff'. ده بيلغي معنى الصلاحيات.
    //     محمد: «كل واحد بصلاحياته زي ما هي متحدّدة بالضبط».
    //
    // دلوقتي المنطق كله في الداتابيز في مكان واحد: owner/admin بس هما اللي
    // بياخدوا التخطّي الكامل، وأي حد تاني بياخد صلاحياته المتخزّنة زي ما هي.
    // ========================================================================
    const check = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        if (!cancelled) setAccess(FALSE_ACCESS)
        return
      }

      type Rpc = {
        authenticated?: boolean
        supplier_id?: string | null
        supplier_name?: string | null
        source?: string
        is_owner?: boolean
        is_staff?: boolean
        full?: boolean
        access?: Record<string, boolean>
      }

      let res: Rpc | null = null
      try {
        const { data } = await (supabaseBrowser.rpc as unknown as (
          fn: string, args: Record<string, unknown>,
        ) => Promise<{ data: Rpc | null }>)('my_supplier_access', {
          p_supplier_id: explicitSupplierId ?? null,
        })
        res = data
      } catch (e) {
        console.error('[access] my_supplier_access failed:', e)
      }

      if (cancelled) return

      if (!res || res.authenticated !== true) {
        setAccess({ ...FALSE_ACCESS, authenticated: true })
        return
      }

      if (res.full === true) {
        setAccess(buildOwnerAccess(res.supplier_id || '', res.supplier_name || 'مضمونة'))
        return
      }

      if (res.is_staff !== true || !res.access) {
        setAccess({
          ...FALSE_ACCESS,
          authenticated: true,
          supplierId: res.supplier_id || null,
          supplierName: res.supplier_name || null,
        })
        return
      }

      const a = res.access
      setAccess({
        loading: false,
        authenticated: true,
        supplierId: res.supplier_id || null,
        supplierName: res.supplier_name || null,
        isOwner: false,
        isStaff: true,
        canView: !!a.can_view,
        canManageListings: !!a.can_manage_listings,
        canPublishListings: !!a.can_publish_listings,
        canDeleteListings: !!a.can_delete_listings,
        canManageBookings: !!a.can_manage_bookings,
        canCompleteBookings: !!a.can_complete_bookings,
        canRespondReviews: !!a.can_respond_reviews,
        canViewAnalytics: !!a.can_view_analytics,
        canManagePricing: !!a.can_manage_pricing,
        canManageTeam: !!a.can_manage_team,
        hasPermission: (perm) => !!a[perm],
      })
    }

    check()
    return () => { cancelled = true }
  }, [explicitSupplierId])

  return access
}

function buildOwnerAccess(supplierId: string, supplierName: string): SupplierAccess {
  return {
    loading: false,
    authenticated: true,
    supplierId,
    supplierName,
    isOwner: true,
    isStaff: false,
    canView: true,
    canManageListings: true,
    canPublishListings: true,
    canDeleteListings: true,
    canManageBookings: true,
    canCompleteBookings: true,
    canRespondReviews: true,
    canViewAnalytics: true,
    canManagePricing: true,
    canManageTeam: true,
    hasPermission: () => true,
  }
}

/**
 * Inline component shown when user lacks a specific permission.
 */
export function NoPermissionCard({
  reason = 'مفيش صلاحية للوصول للصفحة دي',
  hint = 'كلّم مدير الفريق لو محتاج تتفعّلك الصلاحية.',
}: {
  reason?: string
  hint?: string
}) {
  return (
    <div className="bg-white rounded-3xl shadow-luxe p-8 md:p-12 text-center max-w-md mx-auto">
      <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-black text-gray-900 mb-2">{reason}</h3>
      <p className="text-sm text-gray-500">{hint}</p>
    </div>
  )
}
