'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ListingForm from '@/components/marketplace/ListingForm'
import { ArrowRight, Loader2, AlertCircle, Lock, Users } from 'lucide-react'

// ============================================================================
// /supplier/marketplace/[id]/edit
// Allows owners + staff with can_manage_listings.
// ============================================================================

type Stage = 'loading' | 'unauthorized' | 'no-permission' | 'not-found' | 'ready'

interface ListingPhotoRow {
  id: string
  url: string
  caption: string | null
  is_primary: boolean
  display_order: number
  storage_path: string | null
}

interface PricingRuleRow {
  id: string
  period_type: string
  price: number | string
  min_periods: number
  is_active: boolean
}

interface ListingValueRow {
  attribute_id: string
  value: string | null
}

interface InitialData {
  category_id: string
  title: string
  description: string
  city: string
  district: string
  address: string
  min_booking_hours: number
  max_booking_hours: number
  status: string
  existingPhotos: Array<{
    id: string
    url: string
    caption: string
    is_primary: boolean
    display_order: number
    storage_path: string | null
  }>
  existingPricing: Array<{
    id: string
    period_type: string
    price: string
    min_periods: number
    is_active: boolean
  }>
  existingAttributes: Array<{ attribute_id: string; value: string | null }>
}

export default function EditListingPage() {
  const params = useParams()
  const listingId = params?.id as string

  const [stage, setStage] = useState<Stage>('loading')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<InitialData | null>(null)
  const [isStaff, setIsStaff] = useState(false)
  const [roleLabel, setRoleLabel] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthorized')
        return
      }
      setUserId(session.user.id)

      // Check ownership first
      // @ts-expect-error
      let { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, kyc_status')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      // If not owner, check staff with can_manage_listings
      if (!sup) {
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
          setIsStaff(true)
          setRoleLabel(staff.role_label)
        }
      }

      if (!sup || sup.kyc_status !== 'approved') {
        setStage('unauthorized')
        return
      }
      setSupplierId(sup.id)

      // Fetch listing
      // @ts-expect-error
      const { data: listing, error: listingErr } = await supabaseBrowser
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .eq('supplier_id', sup.id)
        .maybeSingle()

      if (listingErr || !listing) {
        setStage('not-found')
        return
      }

      // Photos
      // @ts-expect-error
      const { data: photos } = await supabaseBrowser
        .from('listing_photos')
        .select('*')
        .eq('listing_id', listingId)
        .order('display_order', { ascending: true })

      // Pricing
      // @ts-expect-error
      const { data: pricing } = await supabaseBrowser
        .from('pricing_rules')
        .select('*')
        .eq('listing_id', listingId)
        .order('display_order', { ascending: true })

      // Attribute values
      // @ts-expect-error
      const { data: values } = await supabaseBrowser
        .from('listing_values')
        .select('*')
        .eq('listing_id', listingId)

      setInitialData({
        category_id: listing.category_id,
        title: listing.title,
        description: listing.description || '',
        city: listing.city || '',
        district: listing.district || '',
        address: listing.address || '',
        min_booking_hours: listing.min_booking_hours,
        max_booking_hours: listing.max_booking_hours,
        status: listing.status,
        existingPhotos: ((photos || []) as ListingPhotoRow[]).map((p) => ({
          id: p.id,
          url: p.url,
          caption: p.caption || '',
          is_primary: p.is_primary,
          display_order: p.display_order,
          storage_path: p.storage_path,
        })),
        existingPricing: ((pricing || []) as PricingRuleRow[]).map((p) => ({
          id: p.id,
          period_type: p.period_type,
          price: String(p.price),
          min_periods: p.min_periods,
          is_active: p.is_active,
        })),
        existingAttributes: ((values || []) as ListingValueRow[]).map((v) => ({
          attribute_id: v.attribute_id,
          value: v.value,
        })),
      })

      setStage('ready')
    }
    init()
  }, [listingId])

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (stage === 'no-permission') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-md">
          <Lock className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مفيش صلاحية لتعديل listings</h1>
          <p className="text-sm text-gray-600 mb-6">
            صلاحية &ldquo;إدارة الـlistings&rdquo; مش مفعّلة. كلّم مدير الفريق.
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

  if (stage === 'unauthorized' || stage === 'not-found') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h1 className="font-bold mb-4">
            {stage === 'not-found' ? 'الـlisting ده مش موجود' : 'مش مصرحلك'}
          </h1>
          <Link
            href="/supplier/marketplace"
            className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            ارجع
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/supplier/marketplace" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">تعديل listing</h1>
            <p className="text-xs text-gray-500">{initialData?.title}</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {isStaff && (
          <div className="max-w-2xl mx-auto mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>إنت بتعدّل بصفتك &ldquo;{roleLabel || 'موظف'}&rdquo;</span>
          </div>
        )}
        {supplierId && userId && initialData && (
          <ListingForm
            supplierId={supplierId}
            userId={userId}
            existingId={listingId}
            initialData={initialData}
          />
        )}
      </main>
    </div>
  )
}
