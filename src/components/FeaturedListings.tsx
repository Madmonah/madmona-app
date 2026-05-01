'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { ArrowLeft, MapPin, Star, ImageIcon, Loader2 } from 'lucide-react'

// ============================================================
// FeaturedListings — promo strip on home page.
// Loads top 3 published marketplace listings sorted by rating + views.
// Empty state hides the section entirely (won't show empty placeholders).
// ============================================================

interface Listing {
  id: string
  title: string
  slug: string
  city: string | null
  district: string | null
  rating: number | null
  reviews_count: number
  category: { name_ar: string; icon: string | null } | null
  photos: { url: string; is_primary: boolean }[] | null
  pricing: { price: number | string; is_active: boolean }[] | null
}

export default function FeaturedListings() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // @ts-expect-error
      const { data } = await supabaseBrowser
        .from('listings')
        .select(`
          id, title, slug, city, district, rating, reviews_count,
          category:categories(name_ar, icon),
          photos:listing_photos(url, is_primary),
          pricing:pricing_rules(price, is_active)
        `)
        .eq('status', 'published')
        .order('views_count', { ascending: false })
        .limit(3)

      setListings((data || []) as Listing[])
      setLoading(false)
    }
    load()
  }, [])

  // Hide section entirely if empty (no listings yet)
  if (loading) {
    return (
      <section className="mb-12">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
        </div>
      </section>
    )
  }

  if (listings.length === 0) return null

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">معروض حالياً</h2>
          <p className="text-xs text-gray-500 mt-0.5">أحدث ما تم نشره على الـMarketplace</p>
        </div>
        <Link
          href="/marketplace"
          className="text-sm text-[#1F5F3F] font-semibold hover:underline no-underline flex items-center gap-1"
        >
          <span>الكل</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {listings.map(listing => {
          const photos = listing.photos || []
          const primary = photos.find(p => p.is_primary) || photos[0]
          const photoUrl = primary?.url
          const activePrices = (listing.pricing || [])
            .filter(p => p.is_active)
            .map(p => Number(p.price))
            .filter(p => p > 0)
          const startingPrice = activePrices.length > 0 ? Math.min(...activePrices) : null

          return (
            <Link
              key={listing.id}
              href={`/marketplace/${listing.slug}`}
              className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow no-underline"
            >
              <div className="aspect-[4/3] bg-gray-100">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                {listing.category && (
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <span>{listing.category.icon}</span> {listing.category.name_ar}
                  </p>
                )}
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 text-sm">{listing.title}</h3>
                {(listing.district || listing.city) && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />
                    {[listing.district, listing.city].filter(Boolean).join(', ')}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    {startingPrice !== null ? (
                      <>
                        <span className="text-[10px] text-gray-500">يبدأ من</span>
                        <p className="font-bold text-[#1F5F3F] text-sm">
                          {startingPrice.toLocaleString('ar-EG')} <span className="text-xs font-normal">ج.م</span>
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">السعر عند الطلب</span>
                    )}
                  </div>
                  {listing.rating && Number(listing.rating) > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3 fill-[#B8860B] text-[#B8860B]" />
                      <span className="font-semibold text-gray-900">{Number(listing.rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
