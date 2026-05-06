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
  category: { name_ar: string; icon: string | null } | null
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
  hourly: 'الساعة',
  daily: 'اليوم',
  weekly: 'الأسبوع',
  monthly: 'الشهر',
  per_event: 'مرة واحدة',
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

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
            category:categories(name_ar, icon),
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
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#1F5F3F] animate-spin" />
      </div>
    )
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-card p-10 text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="font-black text-xl mb-2">الـlisting ده مش موجود</h1>
          <p className="text-sm text-gray-500 mb-5">يمكن يكون اتمسح أو غير منشور</p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            تصفح الـMarketplace
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

  const currentPhoto = sortedPhotos[photoIndex]
  const phone = listing.supplier?.profile?.phone || ''
  const phoneClean = phone.replace(/\D/g, '')
  const startingPrice = pricing.length > 0 ? Number(pricing[0].price) : null
  const canBook = pricing.length > 0
  const hasMap = listing.latitude !== null && listing.longitude !== null

  const whatsappMessage = encodeURIComponent(
    `مرحباً، أنا مهتم بـ "${listing.title}" على Madmona Marketplace.\nاللينك: https://madmonacairo.com/marketplace/${listing.slug}`
  )

  const formatAttrValue = (av: AttributeWithValue): string => {
    const v = av.value
    const attr = av.attribute
    if (v === null || v === undefined) return '-'
    if (attr.field_type === 'boolean') return v ? '✓ نعم' : '✗ لا'
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
    <div className="min-h-screen gradient-mesh" dir="rtl">
      {/* Premium glass header */}
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/marketplace"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <h1 className="text-sm font-bold text-gray-700 truncate flex-1 hidden sm:block">{listing.title}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleShare}
              className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all relative"
              title="مشاركة"
            >
              <Share2 className="w-4 h-4 text-gray-700" />
              {shareSuccess && (
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-full whitespace-nowrap shadow-card animate-scale-in">
                  تم النسخ ✓
                </span>
              )}
            </button>
            <button
              onClick={toggleFavorite}
              disabled={togglingFav}
              className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
              title={isFavorite ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
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
                title="حسابي"
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
                      ? 'ring-2 ring-[#1F5F3F] ring-offset-2 scale-105'
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1F5F3F]/10 rounded-full mb-4">
                  <span className="text-sm">{listing.category.icon}</span>
                  <span className="text-xs font-bold text-[#1F5F3F]">{listing.category.name_ar}</span>
                </div>
              )}
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight mb-4 tracking-tight">
                {listing.title}
              </h1>

              {/* Trust badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {listing.supplier?.kyc_status === 'approved' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
                    <CheckCircle className="w-3.5 h-3.5" />
                    أجر معانا موثّق
                  </span>
                )}
                {listing.requires_id_verification && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#B8860B]/10 border border-[#B8860B]/30 rounded-full text-xs font-bold text-[#B8860B]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    بطاقة مطلوبة للحجز
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {(listing.district || listing.city) && (
                  <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                    <MapPin className="w-4 h-4 text-[#1F5F3F]" />
                    {[listing.district, listing.city].filter(Boolean).join('، ')}
                  </span>
                )}
                {listing.rating && Number(listing.rating) > 0 && (
                  <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                    <Star className="w-4 h-4 fill-[#B8860B] text-[#B8860B]" />
                    <strong className="text-gray-900">{Number(listing.rating).toFixed(1)}</strong>
                    <span className="text-gray-500">({listing.reviews_count})</span>
                  </span>
                )}
                {listing.min_booking_hours && (
                  <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                    <Clock className="w-4 h-4 text-[#1F5F3F]" />
                    حد أدنى {listing.min_booking_hours} ساعة
                  </span>
                )}
              </div>
            </section>

            {/* Tabs */}
            <section className="bg-white rounded-3xl shadow-soft overflow-hidden animate-slide-up delay-100">
              <div className="flex border-b border-gray-100 px-2 pt-2">
                <TabButton
                  active={activeTab === 'details'}
                  onClick={() => setActiveTab('details')}
                  label="التفاصيل"
                />
                {(listing.address || hasMap) && (
                  <TabButton
                    active={activeTab === 'location'}
                    onClick={() => setActiveTab('location')}
                    label="الموقع"
                  />
                )}
                <TabButton
                  active={activeTab === 'reviews'}
                  onClick={() => setActiveTab('reviews')}
                  label={`التقييمات${reviews.length > 0 ? ` (${reviews.length})` : ''}`}
                />
              </div>

              <div className="p-6 md:p-8 animate-fade-in" key={activeTab}>
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {listing.description && (
                      <div>
                        <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#B8860B]" />
                          الوصف
                        </h3>
                        <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {listing.description}
                        </p>
                      </div>
                    )}

                    {attributes.length > 0 && (
                      <div>
                        <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-[#1F5F3F]" />
                          المواصفات
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
                        <h3 className="text-sm font-black text-gray-900 mb-3">الأسعار</h3>
                        <div className="space-y-2">
                          {pricing.map(rule => (
                            <div
                              key={rule.id}
                              className="flex items-center justify-between p-4 bg-gradient-to-l from-[#1F5F3F]/5 to-transparent rounded-xl border border-[#1F5F3F]/10"
                            >
                              <span className="text-sm font-bold text-gray-700">
                                {PERIOD_LABELS[rule.period_type] || rule.period_type}
                              </span>
                              <span className="text-lg font-black text-[#1F5F3F] tabular">
                                {Number(rule.price).toLocaleString('ar-EG')}
                                <span className="text-xs font-normal text-gray-500 mr-1">ج.م</span>
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
                        <MapPin className="w-5 h-5 text-[#1F5F3F] flex-shrink-0 mt-0.5" />
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
                            title={`موقع ${listing.title}`}
                          />
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#1F5F3F] text-white rounded-xl font-bold text-sm hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          افتح الاتجاهات في Google Maps
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
                        <p className="text-sm text-gray-500">مفيش تقييمات لسه. كن أول واحد يقيّم!</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {reviews.map(r => (
                          <div key={r.id} className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-9 h-9 bg-[#1F5F3F]/10 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-[#1F5F3F]" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">
                                    {r.customer?.full_name || 'أجر مننا'}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {new Date(r.created_at).toLocaleDateString('ar-EG', {
                                      day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-[#B8860B] text-[#B8860B]' : 'text-gray-200'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            {r.comment && (
                              <p className="text-sm text-gray-700 leading-relaxed pr-11">{r.comment}</p>
                            )}

                            {r.supplier_response && (
                              <div className="mt-3 mr-11 bg-gradient-to-l from-[#1F5F3F]/5 to-transparent border border-[#1F5F3F]/10 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Building2 className="w-3.5 h-3.5 text-[#1F5F3F]" />
                                  <span className="text-xs font-bold text-[#1F5F3F]">
                                    رد {listing.supplier?.business_name || 'أجر معانا'}
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
              {/* Booking widget */}
              <div className="bg-white rounded-3xl shadow-card p-6">
                {startingPrice !== null ? (
                  <>
                    <p className="text-xs font-bold text-[#B8860B] uppercase tracking-widest mb-1">يبدأ من</p>
                    <p className="text-3xl font-black text-[#1F5F3F] tabular mb-1">
                      {startingPrice.toLocaleString('ar-EG')}
                      <span className="text-base font-medium text-gray-500 mr-1">ج.م</span>
                    </p>
                    <p className="text-xs text-gray-500 mb-5">
                      السعر النهائي يحتسب حسب المدة
                    </p>
                  </>
                ) : (
                  <p className="text-base font-bold text-gray-900 mb-5">السعر عند الطلب</p>
                )}

                <div className="space-y-2">
                  {canBook && (
                    <Link
                      href={`/marketplace/${listing.slug}/book`}
                      className="flex items-center justify-center gap-2 bg-[#1F5F3F] text-white py-3.5 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline w-full"
                    >
                      <Calendar className="w-4 h-4" />
                      احجز دلوقتي
                    </Link>
                  )}

                  {phoneClean && (
                    <a
                      href={`https://wa.me/${phoneClean}?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3.5 rounded-2xl font-bold text-sm shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all no-underline w-full"
                    >
                      <MessageCircle className="w-4 h-4" />
                      تواصل واتساب
                    </a>
                  )}
                </div>

                <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span>حجز مضمون · بدون رسوم خفية</span>
                </div>
              </div>

              {/* Supplier card */}
              {listing.supplier && (
                <div className="bg-white rounded-3xl shadow-soft p-6">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">أجر معانا</p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1F5F3F] to-[#2d7a52] flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{listing.supplier.business_name}</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> أجر معانا موثّق
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Sticky bottom CTA (mobile only) */}
      <div className="fixed bottom-0 inset-x-0 glass border-t border-white/40 z-50 lg:hidden shadow-luxe">
        <div className="max-w-6xl mx-auto p-3 flex items-center gap-2">
          <div className="flex-1">
            {startingPrice !== null ? (
              <>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">يبدأ من</p>
                <p className="text-xl font-black text-[#1F5F3F] tabular leading-tight">
                  {startingPrice.toLocaleString('ar-EG')}
                  <span className="text-xs font-medium text-gray-500 mr-1">ج.م</span>
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-gray-900">السعر عند الطلب</p>
            )}
          </div>

          {phoneClean && (
            <a
              href={`https://wa.me/${phoneClean}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-12 h-12 bg-[#25D366] text-white rounded-2xl shadow-card hover:scale-105 transition-all flex-shrink-0"
              title="واتساب"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          )}

          {canBook ? (
            <Link
              href={`/marketplace/${listing.slug}/book`}
              className="flex items-center gap-1.5 bg-[#1F5F3F] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all flex-shrink-0"
            >
              <Calendar className="w-4 h-4" />
              احجز
            </Link>
          ) : (
            <a
              href={phoneClean ? `https://wa.me/${phoneClean}?text=${whatsappMessage}` : 'https://wa.me/201002229982'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#1F5F3F] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-elevated flex-shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              تواصل
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-3 text-sm font-bold transition-colors ${
        active ? 'text-[#1F5F3F]' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1F5F3F] rounded-full" />
      )}
    </button>
  )
}
