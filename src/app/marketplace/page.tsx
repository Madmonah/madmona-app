'use client'

import { Suspense, useEffect, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Search, MapPin, Star, ImageIcon, Loader2, ArrowRight, User, LogIn, Heart,
  ChevronDown, X,
} from 'lucide-react'

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
  created_at: string
  category: { name_ar: string; icon: string | null; slug: string } | null
  photos: { url: string; is_primary: boolean }[] | null
  pricing: { price: number | string; is_active: boolean }[] | null
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'rating'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'الأحدث',
  price_asc: 'السعر: من الأقل',
  price_desc: 'السعر: من الأعلى',
  rating: 'الأعلى تقييماً',
}

function MarketplaceBrowseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCategorySlug = searchParams.get('category')

  const [rootCategories, setRootCategories] = useState<Category[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(initialCategorySlug)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [cityFilter, setCityFilter] = useState<string | null>(null)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [cityMenuOpen, setCityMenuOpen] = useState(false)
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [togglingFav, setTogglingFav] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      setIsAuthed(!!session?.user)
      if (session?.user) {
        setUserId(session.user.id)
        // @ts-expect-error
        const { data: favs } = await supabaseBrowser
          .from('favorites')
          .select('listing_id')
          .eq('customer_id', session.user.id)
        setFavorites(new Set((favs || []).map((f: { listing_id: string }) => f.listing_id)))
      }
    }
    checkAuth()

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
            categoryIds = [rootCat.id, ...((subs || []).map((s: { id: string }) => s.id))]
          }
        }
      }

      // @ts-expect-error
      let query = supabaseBrowser
        .from('listings')
        .select(`
          id, title, slug, city, district, rating, reviews_count, status, created_at,
          category:categories(name_ar, icon, slug),
          photos:listing_photos(url, is_primary),
          pricing:pricing_rules(price, is_active)
        `)
        .eq('status', 'published')
        .limit(60)

      // Server-side ordering for non-price sorts
      if (sortBy === 'rating') {
        query = query.order('rating', { ascending: false, nullsFirst: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

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
  }, [selectedCategorySlug, searchQuery, sortBy])

  const toggleFavorite = async (e: MouseEvent, listingId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      router.push(`/auth/login?redirect=${encodeURIComponent('/marketplace')}`)
      return
    }

    setTogglingFav(listingId)
    const isFav = favorites.has(listingId)

    if (isFav) {
      // @ts-expect-error
      const { error } = await supabaseBrowser
        .from('favorites')
        .delete()
        .eq('customer_id', userId)
        .eq('listing_id', listingId)
      if (!error) {
        const newFavs = new Set(favorites)
        newFavs.delete(listingId)
        setFavorites(newFavs)
      }
    } else {
      // @ts-expect-error
      const { error } = await supabaseBrowser
        .from('favorites')
        .insert({ customer_id: userId, listing_id: listingId })
      if (!error) {
        setFavorites(new Set([...favorites, listingId]))
      }
    }
    setTogglingFav(null)
  }

  // Helper: calculate min price for a listing
  const getMinPrice = (listing: Listing): number => {
    const activePrices = (listing.pricing || [])
      .filter(p => p.is_active)
      .map(p => Number(p.price))
      .filter(p => p > 0)
    return activePrices.length > 0 ? Math.min(...activePrices) : Infinity
  }

  // Apply client-side filters & sort
  const cities = Array.from(
    new Set(
      listings
        .map(l => l.city)
        .filter((c): c is string => Boolean(c?.trim()))
    )
  ).sort()

  let filteredListings = cityFilter
    ? listings.filter(l => l.city === cityFilter)
    : [...listings]

  if (sortBy === 'price_asc') {
    filteredListings = filteredListings.sort((a, b) => getMinPrice(a) - getMinPrice(b))
  } else if (sortBy === 'price_desc') {
    filteredListings = filteredListings.sort((a, b) => getMinPrice(b) - getMinPrice(a))
  }
  // For 'newest' and 'rating', server-side ordering is preserved

  const selectedCategoryName = rootCategories.find(c => c.slug === selectedCategorySlug)?.name_ar
  const hasFilters = selectedCategorySlug || searchQuery || cityFilter || sortBy !== 'newest'

  const clearAllFilters = () => {
    setSelectedCategorySlug(null)
    setSearchQuery('')
    setCityFilter(null)
    setSortBy('newest')
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="p-1 hover:bg-gray-50 rounded-full flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-gray-600" />
              </Link>
              <h1 className="text-lg font-bold text-gray-900 truncate">Madmona Marketplace</h1>
            </div>

            {isAuthed === true ? (
              <Link
                href="/account"
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-full flex-shrink-0"
                title="حسابي"
              >
                <User className="w-5 h-5" />
              </Link>
            ) : isAuthed === false ? (
              <Link
                href="/auth/login?redirect=/marketplace"
                className="flex items-center gap-1 px-3 py-1.5 bg-[#1F5F3F] text-white rounded-full text-xs font-medium flex-shrink-0"
              >
                <LogIn className="w-3 h-3" /> دخول
              </Link>
            ) : null}
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

          {/* Category pills */}
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

          {/* Sort + City filter dropdowns */}
          <div className="flex gap-2 mt-2">
            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => { setSortMenuOpen(o => !o); setCityMenuOpen(false) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sortBy !== 'newest'
                    ? 'bg-[#1F5F3F]/10 border-[#1F5F3F]/30 text-[#1F5F3F]'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>الترتيب: {SORT_LABELS[sortBy]}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map(option => (
                    <button
                      key={option}
                      onClick={() => { setSortBy(option); setSortMenuOpen(false) }}
                      className={`w-full text-right px-3 py-2 text-xs hover:bg-gray-50 ${
                        sortBy === option ? 'bg-[#1F5F3F]/5 text-[#1F5F3F] font-semibold' : 'text-gray-700'
                      }`}
                    >
                      {SORT_LABELS[option]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* City filter — only show if there are cities */}
            {cities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setCityMenuOpen(o => !o); setSortMenuOpen(false) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    cityFilter
                      ? 'bg-[#1F5F3F]/10 border-[#1F5F3F]/30 text-[#1F5F3F]'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{cityFilter || 'كل المدن'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${cityMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {cityMenuOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
                    <button
                      onClick={() => { setCityFilter(null); setCityMenuOpen(false) }}
                      className={`w-full text-right px-3 py-2 text-xs hover:bg-gray-50 ${
                        !cityFilter ? 'bg-[#1F5F3F]/5 text-[#1F5F3F] font-semibold' : 'text-gray-700'
                      }`}
                    >
                      كل المدن
                    </button>
                    {cities.map(city => (
                      <button
                        key={city}
                        onClick={() => { setCityFilter(city); setCityMenuOpen(false) }}
                        className={`w-full text-right px-3 py-2 text-xs hover:bg-gray-50 ${
                          cityFilter === city ? 'bg-[#1F5F3F]/5 text-[#1F5F3F] font-semibold' : 'text-gray-700'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600"
              >
                <X className="w-3 h-3" /> مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {!loading && (
          <p className="text-sm text-gray-500 mb-4">
            {filteredListings.length} نتيجة
            {selectedCategoryName && <span> في <strong>{selectedCategoryName}</strong></span>}
            {cityFilter && <span> · <strong>{cityFilter}</strong></span>}
            {searchQuery && <span> لـ &quot;<strong>{searchQuery}</strong>&quot;</span>}
          </p>
        )}

        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">مفيش نتائج</h3>
            <p className="text-sm text-gray-500">جرّب بحث مختلف أو فلتر تاني</p>
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 mt-4 px-4 py-2 bg-[#1F5F3F] text-white rounded-lg text-xs font-semibold"
              >
                مسح كل الفلاتر
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map(listing => {
              const photos = listing.photos || []
              const primary = photos.find(p => p.is_primary) || photos[0]
              const photoUrl = primary?.url
              const minPrice = getMinPrice(listing)
              const startingPrice = minPrice !== Infinity ? minPrice : null
              const isFav = favorites.has(listing.id)

              return (
                <Link
                  key={listing.id}
                  href={`/marketplace/${listing.slug}`}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] bg-gray-100 relative">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    <button
                      onClick={(e) => toggleFavorite(e, listing.id)}
                      disabled={togglingFav === listing.id}
                      className="absolute top-2 left-2 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white shadow-sm disabled:opacity-50"
                      title={isFav ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
                    >
                      {togglingFav === listing.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                      )}
                    </button>
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
