'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Search, MapPin, Star, ImageIcon, Loader2, ArrowRight,
} from 'lucide-react'

// ============================================================================
// /marketplace
// Public marketplace — browse all published listings.
// ============================================================================

interface Category {
  id: string
  parent_id: string | null
  name_ar: string
  slug: string
  icon: string | null
}

interface Listing {
  id: string
  title: string
  slug: string
  city: string | null
  district: string | null
  rating: number | null
  reviews_count: number
  status: string
  category: { name_ar: string; icon: string | null; slug: string } | null
  photos: { url: string; is_primary: boolean }[] | null
  pricing: { price: number | string; is_active: boolean }[] | null
}

function MarketplaceBrowseContent() {
  const searchParams = useSearchParams()
  const initialCategorySlug = searchParams.get('category')

  const [rootCategories, setRootCategories] = useState<Category[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(initialCategorySlug)

  useEffect(() => {
    const load = async () => {
      // @ts-expect-error
      const { data } = await supabaseBrowser
        .from('categories')
        .select('id, parent_id, name_ar, slug, icon')
        .eq('is_active', true)
        .is('parent_id', null)
        .order('display_order', { ascending: true })
      setRootCategories(data || [])
    }
    load()
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      let categoryIds: string[] | null = null
      if (selectedCategorySlug) {
        // @ts-expect-error
        const { data: rootCat } = await supabaseBrowser
          .from('categories')
          .select('id, parent_id')
          .eq('slug', selectedCategorySlug)
          .maybeSingle()

        if (rootCat) {
          if (rootCat.parent_id) {
            categoryIds = [rootCat.id]
          } else {
            // @ts-expect-error
            const { data: subs } = await supabaseBrowser
              .from('categories')
              .select('id')
              .eq('parent_id', rootCat.id)
            categoryIds = [rootCat.id, ...((subs || []).map((s: any) => s.id))]
          }
        }
      }

      // @ts-expect-error
      let query = supabaseBrowser
        .from('listings')
        .select(`
          id, title, slug, city, district, rating, reviews_count, status,
          category:categories(name_ar, icon, slug),
          photos:listing_photos(url, is_primary),
          pricing:pricing_rules(price, is_active)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(60)

      if (categoryIds && categoryIds.length > 0) {
        query = query.in('category_id', categoryIds)
      }
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`)
      }

      const { data } = await query
      setListings((data || []) as Listing[])
      setLoading(false)
    }
    load()
  }, [selectedCategorySlug, searchQuery])

  const selectedCategoryName = rootCategories.find(c => c.slug === selectedCategorySlug)?.name_ar

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Madmona Marketplace</h1>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الـlistings..."
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#1F5F3F]"
            />
          </div>

          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategorySlug(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !selectedCategorySlug
                  ? 'bg-[#1F5F3F] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل
            </button>
            {rootCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategorySlug(cat.slug)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedCategorySlug === cat.slug
                    ? 'bg-[#1F5F3F] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{cat.icon}</span> {cat.name_ar}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {!loading && (
          <p className="text-sm text-gray-500 mb-4">
            {listings.length} نتيجة
            {selectedCategoryName && <span> في <strong>{selectedCategoryName}</strong></span>}
            {searchQuery && <span> لـ "<strong>{searchQuery}</strong>"</span>}
          </p>
        )}

        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">مفيش نتائج</h3>
            <p className="text-sm text-gray-500">جرّب بحث مختلف أو فئة تانية</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
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
                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{listing.title}</h3>
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
                            <span className="text-xs text-gray-500">يبدأ من</span>
                            <p className="font-bold text-[#1F5F3F]">
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
                          <span className="text-gray-500">({listing.reviews_count})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function MarketplaceBrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    }>
      <MarketplaceBrowseContent />
    </Suspense>
  )
}
