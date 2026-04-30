'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ListingForm, { type ListingFormData } from '@/components/marketplace/ListingForm'
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react'

// ============================================================================
// /supplier/marketplace/[id]/edit
// Edit an existing listing. Requires owner.
// ============================================================================

type Stage = 'loading' | 'unauthorized' | 'not-found' | 'ready'

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = params?.id as string

  const [stage, setStage] = useState<Stage>('loading')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthorized')
        return
      }
      setUserId(session.user.id)

      // Fetch supplier
      // @ts-expect-error
      const { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, kyc_status')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (!sup || sup.kyc_status !== 'approved') {
        setStage('unauthorized')
        return
      }
      setSupplierId(sup.id)

      // Fetch listing with photos, attribute values, pricing
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

      // Fetch photos
      // @ts-expect-error
      const { data: photos } = await supabaseBrowser
        .from('listing_photos')
        .select('*')
        .eq('listing_id', listingId)
        .order('display_order', { ascending: true })

      // Fetch pricing
      // @ts-expect-error
      const { data: pricing } = await supabaseBrowser
        .from('pricing_rules')
        .select('*')
        .eq('listing_id', listingId)
        .order('period_type', { ascending: true })

      // Fetch attribute values
      // @ts-expect-error
      const { data: values } = await supabaseBrowser
        .from('listing_values')
        .select('*')
        .eq('listing_id', listingId)

      setInitialData({
        category_id: listing.category_id,
        title_ar: listing.title_ar,
        title_en: listing.title_en || '',
        description_ar: listing.description_ar || '',
        description_en: listing.description_en || '',
        city: listing.city || '',
        district: listing.district || '',
        address_ar: listing.address_ar || '',
        min_capacity: listing.min_capacity,
        max_capacity: listing.max_capacity,
        status: listing.status,
        existingPhotos: (photos || []).map((p: any) => ({
          id: p.id,
          url: p.photo_url,
          caption_ar: p.caption_ar || '',
          is_primary: p.is_primary,
          display_order: p.display_order,
        })),
        existingPricing: (pricing || []).map((p: any) => ({
          id: p.id,
          period_type: p.period_type,
          price: String(p.price),
          min_quantity: p.min_quantity || 1,
          is_active: p.is_active,
        })),
        existingAttributes: (values || []).map((v: any) => ({
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
            <p className="text-xs text-gray-500">{initialData?.title_ar}</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
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
