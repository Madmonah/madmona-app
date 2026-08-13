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

    const check = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        if (!cancelled) setAccess(FALSE_ACCESS)
        return
      }

      const userId = session.user.id

      // Try owner path first
      let supplierData: { id: string; business_name: string } | null = null
      if (explicitSupplierId) {
        const { data } = await supabaseBrowser
          .from('marketplace_suppliers')
          .select('id, business_name, profile_id')
          .eq('id', explicitSupplierId)
          .maybeSingle()
        if (data) {
          supplierData = { id: data.id, business_name: data.business_name }
          if (data.profile_id === userId) {
            // owner of this specific supplier
            if (!cancelled) {
              setAccess(buildOwnerAccess(data.id, data.business_name))
            }
            return
          }
        }
      } else {
        const { data } = await supabaseBrowser
          .from('marketplace_suppliers')
          .select('id, business_name')
          .eq('profile_id', userId)
          .maybeSingle()
        if (data) {
          if (!cancelled) {
            setAccess(buildOwnerAccess(data.id, data.business_name))
          }
          return
        }
      }

      // Not the owner — check staff status
      const { data: staffRow } = await supabaseBrowser
        .from('supplier_staff')
        .select(`
          *,
          supplier:marketplace_suppliers(id, business_name)
        `)
        .eq('profile_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (staffRow && staffRow.supplier) {
        // Staff with permissions
        if (!cancelled) {
          setAccess({
            loading: false,
            authenticated: true,
            supplierId: staffRow.supplier.id,
            supplierName: staffRow.supplier.business_name,
            isOwner: false,
            isStaff: true,
            canView: !!staffRow.can_view,
            canManageListings: !!staffRow.can_manage_listings,
            canPublishListings: !!staffRow.can_publish_listings,
            canDeleteListings: !!staffRow.can_delete_listings,
            canManageBookings: !!staffRow.can_manage_bookings,
            canCompleteBookings: !!staffRow.can_complete_bookings,
            canRespondReviews: !!staffRow.can_respond_reviews,
            canViewAnalytics: !!staffRow.can_view_analytics,
            canManagePricing: !!staffRow.can_manage_pricing,
            canManageTeam: !!staffRow.can_manage_team,
            hasPermission: (perm) => !!(staffRow as Record<string, unknown>)[perm],
          })
        }
        return
      }

      // No access at all — but authenticated
      if (!cancelled) {
        setAccess({
          ...FALSE_ACCESS,
          authenticated: true,
          supplierId: supplierData?.id || null,
          supplierName: supplierData?.business_name || null,
        })
      }
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
