'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, MapPin, Star, MessageCircle, Calendar,
  Loader2, Image as ImageIcon, Building2, Tag,
  ChevronRight, ChevronLeft, CheckCircle, AlertCircle, User, Heart, Share2,
  ExternalLink, Clock, Sparkles, ShieldCheck,
} from 'lucide-react'
import { isDemoListing, cleanListingTitle } from '@/lib/listingHelpers'
import { useT } from '@/lib/i18n/LanguageProvider'
import { RestaurantMenu, MartProductsCatalog, ProductBuyBox, CartCheckoutBar, type MenuItem, type MartProduct } from '@/components/OrderActions'
import CartButton from '@/components/CartButton'
import ListQuoteOrderBox from '@/components/ListQuoteOrderBox'

// ============================================================================
// /marketplace/[slug]
// Premium cinematic listing detail page
// ============================================================================

interface ListingDetail {
  id: string
  supplier_id: string
  category_id: string
  title: string
  slug: string
  description: string | null
  city: string | null
  district: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  min_booking_hours: number | null
  max_booking_hours: number | null
  rating: number | null
  reviews_count: number
  views_count: number
  status: string
  requires_id_verification: boolean | null
  is_directory: boolean | null
  directory_source: string | null
  contact_phone: string | null
  // Phase 4 product fields (May 29 2026)
  stock_quantity: number | null
  product_condition: string | null
  brand: string | null
  model_name: string | null
  shipping_available: boolean | null
  shipping_cost: number | string | null
  branches: { name?: string; city?: string; address?: string; phone?: string }[] | null
  category: { name_ar: string; name_en?: string | null; icon: string | null; track: string | null; order_mode?: string | null; slug?: string | null } | null
  supplier: {
    id: string
    business_name: string
    kyc_status?: string | null
    profile: { phone: string; full_name: string | null } | null
  } | null
}

interface Photo {
  id: string
  url: string
  caption: string | null
  is_primary: boolean
  display_order: number
}

interface AttributeWithValue {
  attribute: {
    id: string
    name_ar: string
    field_key: string
    field_type: string
    unit: string | null
    options: { key: string; label_ar: string }[] | null
    display_order: number
  }
  value: unknown
}

interface PricingRule {
  id: string
  period_type: string
  price: number | string
  min_periods: number | null
  is_active: boolean
}

interface Review {
  id: string
  rating: number
  comment: string | null
  supplier_response: string | null
  supplier_responded_at: string | null
  created_at: string
  customer: { full_name: string | null } | null
}

const PERIOD_LABELS: Record<string, string> = {
  hourly: 'listing.period_hourly',
  daily: 'listing.period_daily',
  weekly: 'listing.period_weekly',
  monthly: 'listing.period_monthly',
  per_event: 'listing.period_per_event',
}

export default function ListingDetailPage() {
  const { t, lang, dir } = useT()
  const params = useParams()
  const router = useRouter()
  // FIX (Jul 17 2026): السلجات العربية بتوصل مشفّرة من useParams — لازم فك تشفير
  const rawSlug = params?.slug as string
  const slug = (() => { try { return decodeURIComponent(rawSlug) } catch { return rawSlug } })()

  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [attributes, setAttributes] = useState<AttributeWithValue[]>([])
  const [pricing, setPricing] = useState<PricingRule[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [notFound, setNotFound] = useState(false)
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [togglingFav, setTogglingFav] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'location' | 'reviews'>('details')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [martProducts, setMartProducts] = useState<MartProduct[]>([])

  useEffect(() => {
    let resolvedListingId: string | null = null

    const load = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        setIsAuthed(!!session?.user)
        if (session?.user) setUserId(session.user.id)

        // @ts-expect-error
        const { data: l, error } = await supabaseBrowser
          .from('listings')
          .select(`
            *,
            category:categories(name_ar, name_en, icon, track, order_mode, slug),
            supplier:marketplace_suppliers(
              id, business_name, kyc_status,
              profile:profiles!marketplace_suppliers_profile_id_fkey(phone, full_name)
            )
          `)
          .eq('slug', slug)
          .eq('status', 'published')
          .maybeSingle()

        if (error || !l) {
          setNotFound(true)
          setLoading(false)
          return
        }

        resolvedListingId = l.id
        setListing(l as ListingDetail)

        const fetches: Promise<{ data: unknown }>[] = [
          // @ts-expect-error
          supabaseBrowser
            .from('listing_photos')
            .select('*')
            .eq('listing_id', l.id)
            .order('display_order', { ascending: true }),
          // @ts-expect-error
          supabaseBrowser
            .from('listing_values')
            .select(`
              value,
              attribute:attributes(id, name_ar, field_key, field_type, unit, options, display_order)
            `)
            .eq('listing_id', l.id),
          // @ts-expect-error
          supabaseBrowser
            .from('pricing_rules')
            .select('*')
            .eq('listing_id', l.id)
            .eq('is_active', true)
            .order('price', { ascending: true }),
          // @ts-expect-error
          supabaseBrowser
            .from('reviews')
            .select(`
              id, rating, comment, supplier_response, supplier_responded_at, created_at,
              customer:profiles!reviews_customer_id_fkey(full_name)
            `)
            .eq('listing_id', l.id)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(20),
        ]

        if (session?.user) {
          fetches.push(
            // @ts-expect-error
            supabaseBrowser
              .from('favorites')
              .select('listing_id')
              .eq('customer_id', session.user.id)
              .eq('listing_id', l.id)
              .maybeSingle()
          )
        }

        const results = await Promise.all(fetches) as { data: unknown }[]

        setPhotos((results[0].data || []) as Photo[])
        const attrsData = (results[1].data || []) as AttributeWithValue[]
        const sorted = attrsData.sort((a, b) =>
          (a.attribute?.display_order || 0) - (b.attribute?.display_order || 0)
        )
        setAttributes(sorted)
        setPricing((results[2].data || []) as PricingRule[])
        setReviews((results[3].data || []) as Review[])

        if (results[4]) {
          setIsFavorite(!!results[4].data)
        }

        // Restaurant menu items (only when track === 'restaurants') + sizes
        const trackForMenu = (l as { category?: { track?: string | null } | null }).category?.track
        if (trackForMenu === 'restaurants') {
          // @ts-expect-error
          const { data: mi } = await supabaseBrowser
            .from('restaurant_menu_items')
            .select('*')
            .eq('listing_id', l.id)
            .eq('is_available', true)
            .order('display_order', { ascending: true })
          const itemsArr = (mi || []) as MenuItem[]
          if (itemsArr.length > 0) {
            // @ts-expect-error
            const { data: szs } = await supabaseBrowser
              .from('restaurant_menu_item_sizes')
              .select('id, menu_item_id, name_ar, price, display_order, is_available')
              .in('menu_item_id', itemsArr.map((x) => x.id))
              .eq('is_available', true)
              .order('display_order', { ascending: true })
            const szMap = new Map<string, { id: string; name_ar: string; price: number; display_order: number; is_available: boolean }[]>()
            for (const s of (szs || []) as { id: string; menu_item_id: string; name_ar: string; price: number; display_order: number; is_available: boolean }[]) {
              const arr = szMap.get(s.menu_item_id) || []
              arr.push(s)
              szMap.set(s.menu_item_id, arr)
            }
            setMenuItems(itemsArr.map((x) => ({ ...x, price: Number(x.price), sizes: (szMap.get(x.id) || []).map((s) => ({ ...s, price: Number(s.price) })) })))
          } else {
            setMenuItems(itemsArr)
          }
        }

        // Supplier products catalog (mart_products) — any non-restaurant listing
        if (trackForMenu !== 'restaurants') {
          // @ts-expect-error
          const { data: mp } = await supabaseBrowser
            .from('mart_products')
            .select('id, name_ar, name_en, description_ar, price, compare_at_price, unit, brand, category, photo_url, in_stock, is_available, display_order')
            .eq('listing_id', l.id)
            .eq('is_available', true)
            .order('display_order', { ascending: true })
          setMartProducts(((mp || []) as MartProduct[]).map((p) => ({ ...p, price: Number(p.price), compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null })))
        }
      } catch (e) {
        console.error('[listing/detail] load error:', e)
      } finally {
        setLoading(false)
      }

      if (resolvedListingId) {
        const lid = resolvedListingId
        setTimeout(() => {
          try {
            // @ts-expect-error
            supabaseBrowser.rpc('increment_view_count', { listing_id: lid })
              .then(() => {}, () => {})
          } catch {}
        }, 200)
      }
    }
    load()
  }, [slug])

  const toggleFavorite = async () => {
    if (!userId || !listing) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/marketplace/${slug}`)}`)
      return
    }
    setTogglingFav(true)
    if (isFavorite) {
      // @ts-expect-error
      const { error } = await supabaseBrowser
        .from('favorites')
        .delete()
        .eq('customer_id', userId)
        .eq('listing_id', listing.id)
      if (!error) setIsFavorite(false)
    } else {
      // @ts-expect-error
      const { error } = await supabaseBrowser
        .from('favorites')
        .insert({ customer_id: userId, listing_id: listing.id })
      if (!error) setIsFavorite(true)
    }
    setTogglingFav(false)
  }

  const handleShare = async () => {
    if (!listing) return
    const url = `https://madmonacairo.com/marketplace/${listing.slug}`
    const text = `شوف "${listing.title}" على Madmona Marketplace`

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: listing.title, text, url })
        return
      } catch {}
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
        return
      } catch {}
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir={dir}>
        <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir={dir}>
        <div className="bg-white rounded-3xl shadow-card p-10 text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="font-black text-xl mb-2">{t('listing.not_found_title')}</h1>
          <p className="text-sm text-gray-500 mb-5">{t('listing.not_found_sub')}</p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 bg-[#1F6F5F] text-white px-5 py-2.5 rounded-xl font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            {t('listing.browse_marketplace')}
          </Link>
        </div>
      </div>
    )
  }

  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.is_primary) return -1
    if (b.is_primary) return 1
    return a.display_order - b.display_order
  })

  const isDemo = isDemoListing(listing.title)
  const isDirectory = !!listing.is_directory
  const displayTitle = cleanListingTitle(listing.title)
  const track = listing.category?.track ?? null
  const isRestaurant = track === 'restaurants'
  const isProduct = track === 'products'
  const isListQuote = (listing.category?.order_mode === 'list_quote') && !isDirectory
  // Real estate for sale (17 Jul 2026): properties are NOT cart products —
  // no add-to-cart; instead favorites + real-estate platform CTA
  const catSlug = listing.category?.slug ?? ''
  const isRealEstate = isProduct && (catSlug.startsWith('sale-properties') || catSlug.startsWith('sale-tourism'))
  // 18 Jul 2026 (Mohamed): لا معنى «للتوصيل» في العقارات والعربيات والمراكب
  const noDelivery = isRealEstate || catSlug.startsWith('sale-vehicles') || catSlug.startsWith('sale-marine')
  // directory listings are reference-only: no buy / cart / booking / menu
  const isOrderable = (isRestaurant || isProduct) && !isDirectory && !isRealEstate
  const currentPhoto = sortedPhotos[photoIndex]
  const phone = isDirectory
    ? (listing.contact_phone || '')
    : (listing.supplier?.profile?.phone || '')
  const phoneClean = phone.replace(/\D/g, '')
  const claimMessage = encodeURIComponent(
    `عايز أستلم نشاطي "${displayTitle}" على Madmona.\nاللينك: https://madmonacairo.com/marketplace/${listing.slug}`
  )
  const startingPrice = pricing.length > 0 ? Number(pricing[0].price) : null
  const canBook = pricing.length > 0 && !isDemo && !isDirectory && !isRealEstate  // DEMOs, directory & sale-property entries can NOT be booked
  const hasMap = listing.latitude !== null && listing.longitude !== null

  const whatsappMessage = encodeURIComponent(
    isDemo
      ? `مرحباً، شفت "${displayTitle}" على Madmona وعايز أعرف إمتى هيبقى متاح. اللينك: https://madmonacairo.com/marketplace/${listing.slug}`
      : `مرحباً، أنا مهتم بـ "${displayTitle}" على Madmona Marketplace.\nاللينك: https://madmonacairo.com/marketplace/${listing.slug}`
  )

  const formatAttrValue = (av: AttributeWithValue): string => {
    const v = av.value
    const attr = av.attribute
    if (v === null || v === undefined) return '-'
    if (attr.field_type === 'boolean') return v ? t('listing.val_yes') : t('listing.val_no')
    if (attr.field_type === 'select') {
      const opt = (attr.options || []).find(o => o.key === v)
      return opt?.label_ar || String(v)
    }
    if (attr.field_type === 'multi_select' && Array.isArray(v)) {
      return v.map(key => {
        const opt = (attr.options || []).find(o => o.key === key)
        return opt?.label_ar || String(key)
      }).join('، ')
    }
    if (attr.field_type === 'number' && attr.unit) {
      return `${v} ${attr.unit}`
    }
    return String(v)
  }

  return (
    <div className="min-h-screen gradient-mesh" dir={dir}>
      {/* Premium glass header */}
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/marketplace"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <h1 className="text-sm font-bold text-gray-700 truncate flex-1 hidden sm:block">{displayTitle}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <CartButton className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full" iconClass="w-4 h-4" />
            <button
              onClick={handleShare}
              className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all relative"
              title={t('listing.share')}
            >
              <Share2 className="w-4 h-4 text-gray-700" />
              {shareSuccess && (
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-full whitespace-nowrap shadow-card animate-scale-in">
                  {t('listing.copied')}
                </span>
              )}
            </button>
            <button
              onClick={toggleFavorite}
              disabled={togglingFav}
              className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
              title={isFavorite ? t('market.remove_fav') : t('market.save_fav')}
            >
              {togglingFav ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
              )}
            </button>
            {isAuthed && (
              <Link
                href="/account"
                className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all"
                title={t('nav.account')}
              >
                <User className="w-4 h-4 text-gray-700" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto pb-32 md:pb-12 relative">
        {/* Cinematic photo hero */}
        <div className="relative bg-white">
          <div className="aspect-[16/9] md:aspect-[16/7] bg-gray-100 relative overflow-hidden md:rounded-b-3xl">
            {currentPhoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.caption || listing.title}
                  className="w-full h-full object-cover animate-fade-in"
                  key={currentPhoto.id}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

                {sortedPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIndex(i => (i === 0 ? sortedPhotos.length - 1 : i - 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 backdrop-blur rounded-full flex items-center justify-center hover:bg-white shadow-card hover:scale-105 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPhotoIndex(i => (i === sortedPhotos.length - 1 ? 0 : i + 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 backdrop-blur rounded-full flex items-center justify-center hover:bg-white shadow-card hover:scale-105 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full tabular" dir="ltr">
                      {photoIndex + 1} / {sortedPhotos.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {sortedPhotos.length > 1 && (
            <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white">
              {sortedPhotos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setPhotoIndex(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all ${
                    i === photoIndex
                      ? 'ring-2 ring-[#1F6F5F] ring-offset-2 scale-105'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content grid: main + sidebar (desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 py-6 md:py-10">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title section */}
            <section className="bg-white rounded-3xl shadow-soft p-6 md:p-8 animate-slide-up">
              {listing.category && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1F6F5F]/10 rounded-full mb-4">
                  <span className="text-sm">{listing.category.icon}</span>
                  <span className="text-xs font-bold text-[#1F6F5F]">{lang === 'en' && listing.category.name_en ? listing.category.name_en : listing.category.name_ar}</span>
                </div>
              )}
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight mb-4 tracking-tight">
                {displayTitle}
              </h1>

              {/* Coming Soon banner for DEMO listings */}
              {isDemo && (
                <div className="mb-4 p-4 bg-gradient-to-l from-amber-50 to-amber-100/50 border-2 border-amber-400 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-amber-900" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-amber-900 mb-1">{t('listing.demo_title')}</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        {t('listing.demo_desc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trust badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {isDirectory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-full text-xs font-bold text-gray-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    غير موثّق · من دليل مصر
                  </span>
                )}
                {!isDirectory && listing.supplier?.kyc_status === 'approved' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {t('listing.supplier_verified')}
                  </span>
                )}
                {listing.requires_id_verification && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2FA084]/10 border border-[#2FA084]/30 rounded-full text-xs font-bold text-[#2FA084]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t('listing.id_required_book')}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {(listing.district || listing.city) && (
                  <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                    <MapPin className="w-4 h-4 text-[#1F6F5F]" />
                    {[listing.district, listing.city].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}
                  </span>
                )}
                {listing.rating && Number(listing.rating) > 0 && (
                  <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                    <Star className="w-4 h-4 fill-[#2FA084] text-[#2FA084]" />
                    <strong className="text-gray-900">{Number(listing.rating).toFixed(1)}</strong>
                    <span className="text-gray-500">({listing.reviews_count})</span>
                  </span>
                )}
                {listing.min_booking_hours && (
                  <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                    <Clock className="w-4 h-4 text-[#1F6F5F]" />
                    {t('listing.min_hours', { n: listing.min_booking_hours })}
                  </span>
                )}
              </div>
            </section>

            {/* Phase 4 (May 29 2026): product specs block — condition, brand, model, stock, shipping */}
            {isProduct && !isDirectory && (
              <section className="bg-white rounded-3xl shadow-soft p-6 md:p-8 animate-slide-up delay-50">
                <h2 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#2FA084]" />
                  تفاصيل المنتج
                </h2>

                {listing.product_condition && (() => {
                  const conditionMap: Record<string, { label: string; bg: string; text: string }> = {
                    new: { label: 'جديد بالكرتونة', bg: 'bg-green-50 border-green-300', text: 'text-green-800' },
                    used_like_new: { label: 'مستعمل (مثل الجديد)', bg: 'bg-blue-50 border-blue-300', text: 'text-blue-800' },
                    used_good: { label: 'مستعمل (حالة جيدة)', bg: 'bg-amber-50 border-amber-300', text: 'text-amber-800' },
                    refurbished: { label: 'Refurbished', bg: 'bg-purple-50 border-purple-300', text: 'text-purple-800' },
                  }
                  const c = conditionMap[listing.product_condition!] || { label: listing.product_condition, bg: 'bg-gray-50 border-gray-300', text: 'text-gray-800' }
                  return (
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-bold ${c.bg} ${c.text}`}>
                        {c.label}
                      </span>
                    </div>
                  )
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {listing.brand && (
                    <div className="flex items-center justify-between p-3 bg-[#FAFAF7] rounded-xl">
                      <span className="text-xs font-medium text-gray-500">الماركة</span>
                      <span className="text-sm font-bold text-gray-900">{listing.brand}</span>
                    </div>
                  )}
                  {listing.model_name && (
                    <div className="flex items-center justify-between p-3 bg-[#FAFAF7] rounded-xl">
                      <span className="text-xs font-medium text-gray-500">الموديل</span>
                      <span className="text-sm font-bold text-gray-900">{listing.model_name}</span>
                    </div>
                  )}
                  {listing.stock_quantity !== null && listing.stock_quantity !== undefined && !noDelivery && (
                    <div className="flex items-center justify-between p-3 bg-[#FAFAF7] rounded-xl">
                      <span className="text-xs font-medium text-gray-500">المتاح</span>
                      <span className={`text-sm font-bold ${listing.stock_quantity > 0 ? 'text-[#1F6F5F]' : 'text-red-600'}`}>
                        {listing.stock_quantity > 0 ? `${listing.stock_quantity} قطعة` : 'نفد المخزون'}
                      </span>
                    </div>
                  )}
                  {listing.shipping_available !== null && !noDelivery && (
                    <div className="flex items-center justify-between p-3 bg-[#FAFAF7] rounded-xl">
                      <span className="text-xs font-medium text-gray-500">التوصيل</span>
                      <span className="text-sm font-bold text-gray-900">
                        {listing.shipping_available
                          ? (listing.shipping_cost ? `متاح · ${Number(listing.shipping_cost)} ج` : 'متاح')
                          : 'استلام من المحل فقط'}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {Array.isArray(listing.branches) && listing.branches.length > 0 && (
              <section className="bg-white rounded-3xl shadow-soft p-6 md:p-8 animate-slide-up delay-50">
                <h2 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#2FA084]" />
                  فروعنا
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {listing.branches.map((b, i) => (
                    <div key={i} className="p-4 bg-[#FAFAF7] rounded-2xl border border-[#EFEEE9]">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-[#1F6F5F] flex-shrink-0" />
                        <span className="text-sm font-bold text-gray-900">{b.name || `فرع ${i + 1}`}</span>
                      </div>
                      {(b.address || b.city) && (
                        <div className="text-xs text-gray-500 leading-relaxed pr-5">
                          {[b.address, b.city].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {b.phone && (
                        <a href={`tel:${b.phone}`} className="inline-block mt-2 pr-5 text-xs font-semibold text-[#1F6F5F] hover:underline" dir="ltr">
                          {b.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {isRestaurant && !isDirectory && listing.supplier && (
              <RestaurantMenu
                listing={{ id: listing.id, title: displayTitle }}
                supplier={{ id: listing.supplier.id, business_name: listing.supplier.business_name }}
                menuItems={menuItems}
              />
            )}

            {!isRestaurant && !isDirectory && listing.supplier && martProducts.length > 0 && (
              <MartProductsCatalog
                listing={{ id: listing.id, title: displayTitle }}
                supplier={{ id: listing.supplier.id, business_name: listing.supplier.business_name }}
                products={martProducts}
              />
            )}

            {isRealEstate && !isDirectory && (
              <div className="lg:hidden bg-white rounded-3xl shadow-card p-5 space-y-2.5">
                <p className="text-xs font-bold text-gray-500">عقار للبيع — احفظه في مفضلتك أو شوف كل تفاصيل السوق العقاري</p>
                <button
                  onClick={toggleFavorite}
                  disabled={togglingFav}
                  className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${isFavorite ? 'bg-rose-50 text-rose-600 border-2 border-rose-200' : 'bg-[#1F6F5F] text-white shadow-elevated'}`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  {isFavorite ? 'محفوظ في المفضلة' : 'أضف للمفضلة'}
                </button>
                <Link
                  href="/real-estate"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm bg-white text-[#1F6F5F] border-2 border-[#1F6F5F] no-underline"
                >
                  <Building2 className="w-4 h-4" />
                  المنصة العقارية — قارن وشوف كل المشاريع
                </Link>
              </div>
            )}

            {isProduct && !isRealEstate && !isDirectory && !isListQuote && listing.supplier && (
              <div className="lg:hidden">
                <ProductBuyBox
                  listing={{ id: listing.id, title: displayTitle }}
                  supplier={{ id: listing.supplier.id, business_name: listing.supplier.business_name }}
                  price={pricing[0]?.price ? Number(pricing[0].price) : 0}
                />
              </div>
            )}

            {isListQuote && listing.supplier && (
              <div className="lg:hidden">
                <ListQuoteOrderBox supplierId={listing.supplier.id} listingId={listing.id} listingTitle={displayTitle} />
              </div>
            )}

            {/* Tabs */}
            <section className="bg-white rounded-3xl shadow-soft overflow-hidden animate-slide-up delay-100">
              <div className="flex border-b border-gray-100 px-2 pt-2">
                <TabButton
                  active={activeTab === 'details'}
                  onClick={() => setActiveTab('details')}
                  label={t('listing.tab_details')}
                />
                {(listing.address || hasMap) && (
                  <TabButton
                    active={activeTab === 'location'}
                    onClick={() => setActiveTab('location')}
                    label={t('listing.tab_location')}
                  />
                )}
                <TabButton
                  active={activeTab === 'reviews'}
                  onClick={() => setActiveTab('reviews')}
                  label={`${t('listing.tab_reviews')}${reviews.length > 0 ? ` (${reviews.length})` : ''}`}
                />
              </div>

              <div className="p-6 md:p-8 animate-fade-in" key={activeTab}>
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {listing.description && (
                      <div>
                        <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#2FA084]" />
                          {t('listing.desc_title')}
                        </h3>
                        <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {listing.description}
                        </p>
                      </div>
                    )}

                    {attributes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-[#1F6F5F]" />
                          {t('listing.specs_title')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {attributes.map(av => (
                            <div key={av.attribute.id} className="flex items-center justify-between p-3 bg-[#FAFAF7] rounded-xl">
                              <span className="text-xs font-medium text-gray-500">{av.attribute.name_ar}</span>
                              <span className="text-sm font-bold text-gray-900">
                                {formatAttrValue(av)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pricing.length > 0 && (
                      <div>
                        <h3 className="text-sm font-black text-gray-900 mb-3">{t('listing.prices_title')}</h3>
                        <div className="space-y-2">
                          {pricing.map(rule => (
                            <div
                              key={rule.id}
                              className="flex items-center justify-between p-4 bg-gradient-to-l from-[#1F6F5F]/5 to-transparent rounded-xl border border-[#1F6F5F]/10"
                            >
                              <span className="text-sm font-bold text-gray-700">
                                {PERIOD_LABELS[rule.period_type] ? t(PERIOD_LABELS[rule.period_type]) : rule.period_type}
                              </span>
                              <span className="text-lg font-black text-[#1F6F5F] tabular">
                                {Number(rule.price).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                                <span className="text-xs font-normal text-gray-500 ms-1">{t('common.egp')}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'location' && (
                  <div>
                    {listing.address && (
                      <p className="text-sm md:text-base text-gray-700 mb-4 flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
                        <span>{listing.address}</span>
                      </p>
                    )}
                    {hasMap && (
                      <>
                        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-soft">
                          <iframe
                            src={`https://maps.google.com/maps?q=${listing.latitude},${listing.longitude}&z=16&output=embed`}
                            width="100%"
                            height="320"
                            style={{ border: 0 }}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title={`${t('listing.map_of')} ${listing.title}`}
                          />
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#1F6F5F] text-white rounded-xl font-bold text-sm hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {t('listing.open_directions')}
                        </a>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <>
                    {reviews.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-2xl flex items-center justify-center">
                          <Star className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">{t('listing.no_reviews')}</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {reviews.map(r => (
                          <div key={r.id} className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-9 h-9 bg-[#1F6F5F]/10 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-[#1F6F5F]" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">
                                    {r.customer?.full_name || t('listing.guest')}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                                      day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-[#2FA084] text-[#2FA084]' : 'text-gray-200'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            {r.comment && (
                              <p className="text-sm text-gray-700 leading-relaxed pr-11">{r.comment}</p>
                            )}

                            {r.supplier_response && (
                              <div className="mt-3 mr-11 bg-gradient-to-l from-[#1F6F5F]/5 to-transparent border border-[#1F6F5F]/10 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Building2 className="w-3.5 h-3.5 text-[#1F6F5F]" />
                                  <span className="text-xs font-bold text-[#1F6F5F]">
                                    {t('listing.reply_by')} {listing.supplier?.business_name || t('listing.owner_label')}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{r.supplier_response}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Sticky sidebar (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4 animate-slide-up delay-200">
              {/* Booking widget (rentals/services/hybrid only) */}
              {!isOrderable && (
              <div className="bg-white rounded-3xl shadow-card p-6">
                {startingPrice !== null ? (
                  <>
                    <p className="text-xs font-bold text-[#2FA084] uppercase tracking-widest mb-1">{t('market.starts_from')}</p>
                    <p className="text-3xl font-black text-[#1F6F5F] tabular mb-1">
                      {startingPrice.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                      <span className="text-base font-medium text-gray-500 ms-1">{t('common.egp')}</span>
                    </p>
                    <p className="text-xs text-gray-500 mb-5">
                      {t('listing.price_calc_note')}
                    </p>
                  </>
                ) : (
                  <p className="text-base font-bold text-gray-900 mb-5">{t('market.price_on_request')}</p>
                )}

                <div className="space-y-2">
                  {canBook && (
                    <Link
                      href={`/marketplace/${listing.slug}/book`}
                      className="flex items-center justify-center gap-2 bg-[#1F6F5F] text-white py-3.5 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline w-full"
                    >
                      <Calendar className="w-4 h-4" />
                      {t('market.book_now')}
                    </Link>
                  )}

                  {isDemo && (
                    <div className="flex items-center justify-center gap-2 bg-amber-100 text-amber-900 py-3.5 rounded-2xl font-bold text-sm border-2 border-amber-400 cursor-not-allowed">
                      <Clock className="w-4 h-4" />
                      {t('listing.booking_disabled_demo')}
                    </div>
                  )}

                  {phoneClean && (
                    <a
                      href={`https://wa.me/${phoneClean}?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3.5 rounded-2xl font-bold text-sm shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all no-underline w-full"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {isDemo ? t('listing.notify_available') : t('listing.contact_whatsapp')}
                    </a>
                  )}
                </div>

                {!isDirectory ? (
                  <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span>{t('listing.guaranteed_note')}</span>
                  </div>
                ) : (
                  <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                    <a
                      href={`https://wa.me/201002229982?text=${claimMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-[#1F6F5F] text-white py-2.5 rounded-2xl font-bold text-xs no-underline w-full"
                    >
                      هو ده نشاطك؟ استلمه
                    </a>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      بيانات أولية من مصدر عام — لسه مش موثّقة من Madmona.<br />© OpenStreetMap contributors
                    </p>
                  </div>
                )}
              </div>
              )}

              {isRealEstate && !isDirectory && (
                <div className="bg-white rounded-3xl shadow-card p-6 space-y-2.5">
                  <p className="text-xs font-bold text-gray-500">عقار للبيع — احفظه في مفضلتك أو شوف كل تفاصيل السوق العقاري</p>
                  <button
                    onClick={toggleFavorite}
                    disabled={togglingFav}
                    className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${isFavorite ? 'bg-rose-50 text-rose-600 border-2 border-rose-200' : 'bg-[#1F6F5F] text-white shadow-elevated hover:shadow-luxe hover:-translate-y-0.5'}`}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                    {isFavorite ? 'محفوظ في المفضلة' : 'أضف للمفضلة'}
                  </button>
                  <Link
                    href="/real-estate"
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm bg-white text-[#1F6F5F] border-2 border-[#1F6F5F] no-underline hover:bg-[#1F6F5F]/5"
                  >
                    <Building2 className="w-4 h-4" />
                    المنصة العقارية — قارن وشوف كل المشاريع
                  </Link>
                </div>
              )}

              {isProduct && !isRealEstate && !isDirectory && !isListQuote && listing.supplier && (
                <ProductBuyBox
                  listing={{ id: listing.id, title: displayTitle }}
                  supplier={{ id: listing.supplier.id, business_name: listing.supplier.business_name }}
                  price={pricing[0]?.price ? Number(pricing[0].price) : 0}
                />
              )}

              {isListQuote && listing.supplier && (
                <ListQuoteOrderBox supplierId={listing.supplier.id} listingId={listing.id} listingTitle={displayTitle} />
              )}

              {/* Supplier card */}
              {!isDirectory && listing.supplier && (
                <div className="bg-white rounded-3xl shadow-soft p-6">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">{t('listing.owner_label')}</p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1F6F5F] to-[#2d7a52] flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{listing.supplier.business_name}</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> {t('listing.supplier_verified')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Sticky bottom CTA (mobile only) - rentals/services/hybrid */}
      {!isOrderable && (
      <div className="fixed bottom-0 inset-x-0 glass border-t border-white/40 z-50 lg:hidden shadow-luxe">
        <div className="max-w-6xl mx-auto p-3 flex items-center gap-2">
          <div className="flex-1">
            {startingPrice !== null ? (
              <>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('market.starts_from')}</p>
                <p className="text-xl font-black text-[#1F6F5F] tabular leading-tight">
                  {startingPrice.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                  <span className="text-xs font-medium text-gray-500 ms-1">{t('common.egp')}</span>
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-gray-900">{t('market.price_on_request')}</p>
            )}
          </div>

          {phoneClean && (
            <a
              href={`https://wa.me/${phoneClean}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-12 h-12 bg-[#25D366] text-white rounded-2xl shadow-card hover:scale-105 transition-all flex-shrink-0"
              title={t('home.contact.whatsapp')}
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          )}

          {canBook ? (
            <Link
              href={`/marketplace/${listing.slug}/book`}
              className="flex items-center gap-1.5 bg-[#1F6F5F] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all flex-shrink-0"
            >
              <Calendar className="w-4 h-4" />
              {t('listing.book_short')}
            </Link>
          ) : isDemo ? (
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-900 border-2 border-amber-400 px-4 py-3 rounded-2xl font-bold text-xs flex-shrink-0">
              <Clock className="w-4 h-4" />
              {t('listing.soon')}
            </div>
          ) : (
            <a
              href={phoneClean ? `https://wa.me/${phoneClean}?text=${whatsappMessage}` : 'https://wa.me/201002229982'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#1F6F5F] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-elevated flex-shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              {t('listing.contact_short')}
            </a>
          )}
        </div>
      </div>
      )}

      {isOrderable && !isListQuote && listing.supplier && (
        <CartCheckoutBar supplierId={listing.supplier.id} />
      )}
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-3 text-sm font-bold transition-colors ${
        active ? 'text-[#1F6F5F]' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1F6F5F] rounded-full" />
      )}
    </button>
  )
}
