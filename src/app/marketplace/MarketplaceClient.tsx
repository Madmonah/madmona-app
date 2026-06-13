'use client'

import { Suspense, useEffect, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Search, MapPin, Star, ImageIcon, Loader2, ArrowRight, User, LogIn, Heart,
  ChevronDown, X, SlidersHorizontal, Sparkles, ShieldCheck, CheckCircle, Clock,
} from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import CartButton from '@/components/CartButton'
import { isDemoListing, cleanListingTitle } from '@/lib/listingHelpers'
import { useT } from '@/lib/i18n/LanguageProvider'

interface Category {
  id: string
  parent_id: string | null
  name_ar: string
  name_en?: string | null
  slug: string
  icon: string | null
  track?: 'rentals' | 'services' | 'hybrid' | 'restaurants' | 'products' | null
  group_slug?: string | null
  group_name_ar?: string | null
  group_emoji?: string | null
  group_display_order?: number | null
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
  requires_id_verification: boolean | null
  category: { name_ar: string; name_en: string | null; icon: string | null; slug: string } | null
  supplier: { kyc_status: string | null } | null
  photos: { url: string; is_primary: boolean }[] | null
  pricing: { price: number | string; is_active: boolean }[] | null
}

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'rating'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'market.sort_newest',
  price_asc: 'market.sort_price_asc',
  price_desc: 'market.sort_price_desc',
  rating: 'market.sort_rating',
}

type TrackTab = 'all' | 'rentals' | 'services' | 'hybrid' | 'restaurants' | 'products'

const TRACK_LABELS: Record<TrackTab, string> = {
  all: 'market.track_all',
  rentals: 'market.track_rentals',
  services: 'market.track_services',
  hybrid: 'market.track_hybrid',
  restaurants: 'market.track_restaurants',
  products: 'market.track_products',
}

const TRACK_EMOJI: Record<TrackTab, string> = {
  all: '✨',
  rentals: '🔑',
  services: '🛠️',
  hybrid: '💒',
  restaurants: '🍽️',
  products: '🏷️',
}

// Per-vertical colours — same identity as the homepage hero/tabs.
const TRACK_ACCENT: Record<TrackTab, { accent: string; bg: string }> = {
  all:         { accent: '#1F6F5F', bg: '#E7F1ED' },
  products:    { accent: '#3D7BB6', bg: '#D9E7F4' },
  rentals:     { accent: '#1F6F5F', bg: '#E7F1ED' },
  services:    { accent: '#D4A017', bg: '#FAEFD1' },
  restaurants: { accent: '#E26D5C', bg: '#FAE1CB' },
  hybrid:      { accent: '#1F6F5F', bg: '#E7F1ED' },
}

// Tab order: الكل + بيع · إيجار · خدمات · مطاعم (مناسبات مدمجة في الإيجار)
const TRACK_TAB_ORDER: TrackTab[] = ['all', 'products', 'rentals', 'services', 'restaurants']

// Vertical names — identical to the homepage hero (الكل + بيع · إيجار · خدمات · مطاعم).
const TRACK_NAME: Record<TrackTab, { ar: string; en: string }> = {
  all:         { ar: 'الكل',    en: 'All' },
  products:    { ar: 'بيع',     en: 'Buy' },
  rentals:     { ar: 'إيجار',   en: 'Rent' },
  services:    { ar: 'خدمات',   en: 'Services' },
  restaurants: { ar: 'مطاعم',   en: 'Restaurants' },
  hybrid:      { ar: 'مناسبات', en: 'Events' },
}

function MarketplaceBrowseContent() {
  const { t, lang, dir } = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCategorySlug = searchParams.get('category')
  const initialTrack = searchParams.get('track')
  const initialQuery = searchParams.get('q') || ''

  const [allCategories, setAllCategories] = useState<Category[]>([])
  const allRootCategories = allCategories.filter(c => c.parent_id === null)
  const [activeTrack, setActiveTrack] = useState<TrackTab>(
    (initialTrack === 'hybrid'
      ? 'rentals'
      : (['rentals', 'services', 'restaurants', 'products'].includes(initialTrack || '')
          ? initialTrack
          : 'all')) as TrackTab
  )
  const rootCategories = activeTrack === 'all'
    ? allRootCategories
    : allRootCategories.filter(c => c.track === activeTrack || (activeTrack === 'rentals' && c.track === 'hybrid'))

  // Group the visible root categories by their DB group_* metadata (Jun 2026).
  // Every track now carries group_slug/group_name_ar/group_emoji so the strip
  // renders tidy labeled clusters (e.g. خدمات → طبية وتجميل · منزلية · …)
  // instead of one flat wall of pills. Falls back to a single unnamed bucket.
  const rootGroups = (() => {
    const map = new Map<string, { slug: string; name_ar: string; emoji: string; order: number; cats: Category[] }>()
    for (const c of rootCategories) {
      const key = c.group_slug || '__ungrouped'
      if (!map.has(key)) {
        map.set(key, {
          slug: key,
          name_ar: c.group_name_ar || '',
          emoji: c.group_emoji || '',
          order: c.group_display_order ?? 999,
          cats: [],
        })
      }
      map.get(key)!.cats.push(c)
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order)
  })()
  // Group headings show only inside a specific track that has >1 group.
  // The "الكل" view stays a flat strip (groups would collide across tracks).
  const showGroupHeadings = activeTrack !== 'all' && rootGroups.length > 1
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
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
        .select('id, parent_id, name_ar, name_en, slug, icon, track, also_show_in, group_slug, group_name_ar, group_emoji, group_display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      setAllCategories(data || [])
      // Auto-activate the track tab matching an incoming ?category= slug
      // (so clicking a homepage category opens its specific track tab, not 'all')
      if (initialCategorySlug && data) {
        const cat = (data as Category[]).find(c => c.slug === initialCategorySlug)
        const root = cat?.parent_id ? (data as Category[]).find(c => c.id === cat.parent_id) : cat
        if (root?.track) setActiveTrack(root.track as TrackTab)
      }
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
            // Sub-category clicked: just show that one
            categoryIds = [rootCat.id]
          } else {
            // Root tab clicked: show all subcategories + cross-listed categories
            const [subsRes, crossRes] = await Promise.all([
              // @ts-expect-error
              supabaseBrowser
                .from('categories')
                .select('id')
                .eq('parent_id', rootCat.id),
              // @ts-expect-error
              supabaseBrowser
                .from('categories')
                .select('id')
                .contains('also_show_in', [rootCat.id]),
            ])
            const subs = (subsRes.data || []) as { id: string }[]
            const cross = (crossRes.data || []) as { id: string }[]
            categoryIds = [
              rootCat.id,
              ...subs.map(s => s.id),
              ...cross.map(c => c.id),
            ]
          }
        }
      } else if (activeTrack !== 'all') {
        // Vertical/track selected (e.g. from a homepage chip) with no specific
        // category — filter listings to every category in that track.
        // Mohamed (Jun 12 2026): المناسبات (hybrid) اتحطت جوه الإيجار (rentals)،
        // فتصفح الإيجار بيورّي المناسبات كمان.
        const tracksToMatch = activeTrack === 'rentals' ? ['rentals', 'hybrid'] : [activeTrack];
        // @ts-expect-error
        const { data: trackRoots } = await supabaseBrowser
          .from('categories')
          .select('id')
          .in('track', tracksToMatch)
        const rootIds = (trackRoots || []).map((c: { id: string }) => c.id)
        if (rootIds.length > 0) {
          // @ts-expect-error
          const { data: childCats } = await supabaseBrowser
            .from('categories')
            .select('id')
            .in('parent_id', rootIds)
          const childIds = (childCats || []).map((c: { id: string }) => c.id)
          categoryIds = [...rootIds, ...childIds]
        }
      }

      // @ts-expect-error
      let query = supabaseBrowser
        .from('listings')
        .select(`
          id, title, slug, city, district, rating, reviews_count, status, created_at, requires_id_verification,
          category:categories(name_ar, name_en, icon, slug),
          supplier:marketplace_suppliers(kyc_status),
          photos:listing_photos(url, is_primary),
          pricing:pricing_rules(price, is_active)
        `)
        .eq('status', 'published')
        .limit(60)

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
  }, [selectedCategorySlug, searchQuery, sortBy, activeTrack])

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

  const getMinPrice = (listing: Listing): number => {
    const activePrices = (listing.pricing || [])
      .filter(p => p.is_active)
      .map(p => Number(p.price))
      .filter(p => p > 0)
    return activePrices.length > 0 ? Math.min(...activePrices) : Infinity
  }

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

  const selectedCategory = allCategories.find(c => c.slug === selectedCategorySlug)
  const selectedRootSlug = selectedCategory?.parent_id
    ? allCategories.find(c => c.id === selectedCategory.parent_id)?.slug || selectedCategorySlug
    : selectedCategorySlug
  const selectedRoot = allCategories.find(rc => rc.slug === selectedRootSlug)
  // Subcategories = direct children + cross-listed (also_show_in includes this root)
  type CategoryWithCross = Category & { also_show_in?: string[] | null }
  const subCategories = selectedRoot
    ? allCategories.filter(c => {
        if (c.parent_id === selectedRoot.id) return true
        const alsoIn = (c as CategoryWithCross).also_show_in
        if (Array.isArray(alsoIn) && alsoIn.includes(selectedRoot.id)) return true
        return false
      })
    : []
  const selectedCategoryNameRaw = allCategories.find(c => c.slug === selectedCategorySlug)
  const selectedCategoryName = selectedCategoryNameRaw
    ? (lang === 'en' && selectedCategoryNameRaw.name_en ? selectedCategoryNameRaw.name_en : selectedCategoryNameRaw.name_ar)
    : undefined
  const catName = (c: { name_ar: string; name_en?: string | null }) =>
    lang === 'en' && c.name_en ? c.name_en : c.name_ar
  const hasFilters = selectedCategorySlug || searchQuery || cityFilter || sortBy !== 'newest'

  const clearAllFilters = () => {
    setSelectedCategorySlug(null)
    setSearchQuery('')
    setCityFilter(null)
    setSortBy('newest')
  }

  return (
    <div className="min-h-screen gradient-mesh pb-20 md:pb-0" dir={dir}>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#1F6F5F]/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="fixed top-40 left-20 w-[300px] h-[300px] bg-[#2FA084]/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <header className="relative z-40 glass border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all flex-shrink-0"
              >
                <ArrowRight className="w-4 h-4 text-gray-700" />
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#2FA084] uppercase tracking-widest">Madmona</p>
                <h1 className="text-lg md:text-xl font-black text-gray-900 truncate">Marketplace</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
            <CartButton className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full" iconClass="w-4 h-4" />
            {isAuthed === true ? (
              <Link
                href="/account"
                className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                title={t('nav.account')}
              >
                <User className="w-4 h-4 text-gray-700" />
              </Link>
            ) : isAuthed === false ? (
              <Link
                href="/auth/login?redirect=/marketplace"
                className="inline-flex items-center gap-1 px-4 py-2 bg-[#1F6F5F] text-white rounded-full text-xs font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all flex-shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                {t('market.login')}
              </Link>
            ) : null}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('market.search_placeholder')}
              className="w-full pr-12 pl-4 py-3.5 bg-white/80 backdrop-blur border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all shadow-soft"
            />
          </div>

          {/* Track tabs — الكل + بيع · إيجار · خدمات · مطاعم (colour per vertical, matching the hero) */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-4 px-4">
            {TRACK_TAB_ORDER.map(tab => {
              const count = tab === 'all'
                ? allRootCategories.length
                : allRootCategories.filter(c => c.track === tab || (tab === 'rentals' && c.track === 'hybrid')).length
              const isActive = activeTrack === tab || (tab === 'rentals' && activeTrack === 'hybrid')
              const col = TRACK_ACCENT[tab]
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTrack(tab)
                    if (selectedRootSlug) {
                      const stillVisible = allRootCategories.some(
                        c => c.slug === selectedRootSlug && (tab === 'all' || c.track === tab || (tab === 'rentals' && c.track === 'hybrid'))
                      )
                      if (!stillVisible) setSelectedCategorySlug(null)
                    }
                  }}
                  style={{
                    background: isActive ? col.accent : '#fff',
                    borderColor: isActive ? col.accent : '#F0ECE3',
                    color: isActive ? '#fff' : '#374151',
                    boxShadow: isActive ? `0 8px 20px -6px ${col.accent}` : undefined,
                  }}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all shadow-soft flex items-center gap-1.5 hover:-translate-y-0.5"
                >
                  <span>{TRACK_EMOJI[tab]}</span>
                  <span>{lang === 'en' ? TRACK_NAME[tab].en : TRACK_NAME[tab].ar}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                    style={{ background: isActive ? 'rgba(255,255,255,.22)' : col.bg, color: isActive ? '#fff' : col.accent }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {showGroupHeadings ? (
            <div className="mt-2 space-y-2">
              {/* reset pill: show everything in the active track */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                <CategoryPill
                  active={!selectedCategorySlug}
                  onClick={() => setSelectedCategorySlug(null)}
                  label={t('market.track_all')}
                  icon="✨"
                />
              </div>
              {rootGroups.map(g => (
                <div key={g.slug}>
                  {g.name_ar && (
                    <div className="flex items-center gap-1.5 px-0.5 mb-1 text-[11px] font-bold text-gray-500">
                      {g.emoji && <span>{g.emoji}</span>}
                      <span>{g.name_ar}</span>
                    </div>
                  )}
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                    {g.cats.map(cat => (
                      <CategoryPill
                        key={cat.id}
                        active={selectedRootSlug === cat.slug}
                        onClick={() => setSelectedCategorySlug(cat.slug)}
                        label={catName(cat)}
                        icon={cat.icon || ''}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-4 px-4">
              <CategoryPill
                active={!selectedCategorySlug}
                onClick={() => setSelectedCategorySlug(null)}
                label={t('market.track_all')}
                icon="✨"
              />
              {rootCategories.map(cat => (
                <CategoryPill
                  key={cat.id}
                  active={selectedRootSlug === cat.slug}
                  onClick={() => setSelectedCategorySlug(cat.slug)}
                  label={catName(cat)}
                  icon={cat.icon || ''}
                />
              ))}
            </div>
          )}

          {/* Subcategory pills (visible when a root category is selected) */}
          {subCategories.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-4 px-4 animate-slide-down">
              <button
                onClick={() => setSelectedCategorySlug(selectedRootSlug || null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  selectedCategorySlug === selectedRootSlug
                    ? 'bg-[#2FA084] text-white shadow-soft'
                    : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-100'
                }`}
              >
                {t('market.all_sections')}
              </button>
              {subCategories.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedCategorySlug(sub.slug)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${
                    selectedCategorySlug === sub.slug
                      ? 'bg-[#2FA084] text-white shadow-soft'
                      : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-100'
                  }`}
                >
                  {sub.icon && <span>{sub.icon}</span>}
                  <span>{catName(sub)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-3 flex-wrap">
            <div className="relative">
              <button
                onClick={() => { setSortMenuOpen(o => !o); setCityMenuOpen(false) }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all shadow-soft hover:shadow-card ${
                  sortBy !== 'newest'
                    ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                    : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{t(SORT_LABELS[sortBy])}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-luxe border border-gray-100 z-50 overflow-hidden animate-scale-in">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map(option => (
                    <button
                      key={option}
                      onClick={() => { setSortBy(option); setSortMenuOpen(false) }}
                      className={`w-full text-start px-4 py-2.5 text-xs hover:bg-[#1F6F5F]/5 font-medium transition-colors ${
                        sortBy === option ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'text-gray-700'
                      }`}
                    >
                      {t(SORT_LABELS[option])}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {cities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setCityMenuOpen(o => !o); setSortMenuOpen(false) }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all shadow-soft hover:shadow-card ${
                    cityFilter
                      ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
                      : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{cityFilter || t('market.all_cities')}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${cityMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {cityMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-luxe border border-gray-100 z-50 overflow-hidden max-h-72 overflow-y-auto animate-scale-in">
                    <button
                      onClick={() => { setCityFilter(null); setCityMenuOpen(false) }}
                      className={`w-full text-start px-4 py-2.5 text-xs hover:bg-[#1F6F5F]/5 font-medium transition-colors ${
                        !cityFilter ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'text-gray-700'
                      }`}
                    >
                      {t('market.all_cities')}
                    </button>
                    {cities.map(city => (
                      <button
                        key={city}
                        onClick={() => { setCityFilter(city); setCityMenuOpen(false) }}
                        className={`w-full text-start px-4 py-2.5 text-xs hover:bg-[#1F6F5F]/5 font-medium transition-colors ${
                          cityFilter === city ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'text-gray-700'
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
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <X className="w-3 h-3" />
                {t('market.clear_filters')}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative">
        {!loading && (
          <div className="mb-6 flex items-end justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                <span className="tabular">{filteredListings.length}</span>{' '}
                <span className="font-semibold text-gray-500">
                  {selectedCategoryName ? t('market.in_category', { cat: selectedCategoryName }) : t('market.results_word')}
                </span>
              </h2>
              {(searchQuery || cityFilter) && (
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery && <span>{t('market.for_query')} &quot;<strong className="text-gray-700">{searchQuery}</strong>&quot;</span>}
                  {searchQuery && cityFilter && <span> · </span>}
                  {cityFilter && <span>{t('market.in_city')} <strong className="text-gray-700">{cityFilter}</strong></span>}
                </p>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-soft">
                <div className="aspect-[4/3] animate-shimmer" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-16 animate-shimmer rounded-full" />
                  <div className="h-5 w-3/4 animate-shimmer rounded-full" />
                  <div className="h-3 w-1/2 animate-shimmer rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-soft p-12 md:p-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">{t('market.no_results_title')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('market.no_results_sub')}</p>
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1F6F5F] text-white rounded-2xl text-sm font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                {t('market.clear_all_filters')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing, i) => {
              const photos = listing.photos || []
              const primary = photos.find(p => p.is_primary) || photos[0]
              const photoUrl = primary?.url
              const minPrice = getMinPrice(listing)
              const startingPrice = minPrice !== Infinity ? minPrice : null
              const isFav = favorites.has(listing.id)
              const isDemo = isDemoListing(listing.title)
              const displayTitle = cleanListingTitle(listing.title)

              return (
                <Link
                  key={listing.id}
                  href={`/marketplace/${listing.slug}`}
                  className="group block bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-500 no-underline animate-slide-up"
                  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                >
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    {photoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl}
                          alt={displayTitle}
                          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out ${isDemo ? 'opacity-90' : ''}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-300" />
                      </div>
                    )}

                    {/* Coming Soon badge (DEMO listings) */}
                    {isDemo && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-l from-amber-400 to-amber-300 text-amber-900 rounded-full text-[10px] font-black shadow-card border border-amber-500/30">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{t('market.demo_badge')}</span>
                      </div>
                    )}

                    <button
                      onClick={(e) => toggleFavorite(e, listing.id)}
                      disabled={togglingFav === listing.id}
                      className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white shadow-card disabled:opacity-50 hover:scale-105 transition-all"
                      title={isFav ? t('market.remove_fav') : t('market.save_fav')}
                    >
                      {togglingFav === listing.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                      )}
                    </button>

                    {listing.category && (
                      <div className={`absolute ${isDemo ? 'bottom-12' : 'top-3'} right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-gray-800`}>
                        <span>{listing.category.icon}</span>
                        <span>{catName(listing.category)}</span>
                      </div>
                    )}

                    {listing.rating && Number(listing.rating) > 0 && (
                      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 bg-black/60 backdrop-blur rounded-full text-[10px] font-bold text-white">
                        <Star className="w-3 h-3 fill-[#2FA084] text-[#2FA084]" />
                        <span>{Number(listing.rating).toFixed(1)}</span>
                        <span className="opacity-60">({listing.reviews_count})</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-black text-base md:text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-[#1F6F5F] transition-colors">
                      {displayTitle}
                    </h3>

                    {/* Trust badges */}
                    {(listing.supplier?.kyc_status === 'approved' || listing.requires_id_verification) && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {listing.supplier?.kyc_status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-[10px] font-bold text-green-700">
                            <CheckCircle className="w-2.5 h-2.5" />
                            {t('market.verified')}
                          </span>
                        )}
                        {listing.requires_id_verification && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#2FA084]/10 border border-[#2FA084]/30 rounded-full text-[10px] font-bold text-[#2FA084]">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            {t('market.id_required')}
                          </span>
                        )}
                      </div>
                    )}

                    {(listing.district || listing.city) && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                        <MapPin className="w-3 h-3" />
                        {[listing.district, listing.city].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}
                      </p>
                    )}

                    <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                      <div>
                        {isDemo ? (
                          <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t('market.coming_soon')}
                          </p>
                        ) : startingPrice !== null ? (
                          <>
                            <p className="text-[10px] text-gray-500 font-medium">{t('market.starts_from')}</p>
                            <p className="text-xl font-black text-[#1F6F5F] leading-none mt-0.5 tabular">
                              {startingPrice.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                              <span className="text-xs font-medium text-gray-500 ms-1">{t('common.egp')}</span>
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 font-medium">{t('market.price_on_request')}</p>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[#1F6F5F] font-bold text-xs group-hover:gap-2 transition-all">
                        <span>{isDemo ? t('market.view_short') : t('market.details')}</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function CategoryPill({
  active, onClick, label, icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-soft ${
        active
          ? 'bg-[#1F6F5F] text-white shadow-elevated'
          : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-card border border-gray-100'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  )
}



export default function MarketplaceClient() {
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
