'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, MapPin, Star, Users, MessageCircle, Calendar,
  Loader2, Image as ImageIcon, Building2, Tag,
  ChevronRight, ChevronLeft, CheckCircle, AlertCircle, User,
} from 'lucide-react'

// ============================================================================
// /marketplace/[slug]
// Public listing detail page with booking CTA + WhatsApp fallback.
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
  min_booking_hours: number | null
  max_booking_hours: number | null
  rating: number | null
  reviews_count: number
  views_count: number
  status: string
  category: { name_ar: string; icon: string | null } | null
  supplier: {
    id: string
    business_name: string
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
    options: any
    display_order: number
  }
  value: any
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

  useEffect(() => {
    let resolvedListingId: string | null = null

    const load = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        setIsAuthed(!!session?.user)

        // @ts-expect-error
        const { data: l, error } = await supabaseBrowser
          .from('listings')
          .select(`
            *,
            category:categories(name_ar, icon),
            supplier:marketplace_suppliers(
              id, business_name,
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

        const [photosResult, valsResult, prResult, revResult] = await Promise.all([
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
              id, rating, comment, created_at,
              customer:profiles!reviews_customer_id_fkey(full_name)
            `)
            .eq('listing_id', l.id)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(20),
        ])

        setPhotos(photosResult.data || [])
        const sorted = (valsResult.data || []).sort((a: any, b: any) =>
          (a.attribute?.display_order || 0) - (b.attribute?.display_order || 0)
        )
        setAttributes(sorted as AttributeWithValue[])
        setPricing(prResult.data || [])
        setReviews((revResult.data || []) as Review[])
      } catch (e) {
        console.error('[listing/detail] load error:', e)
      } finally {
        setLoading(false)
      }

      // Fire-and-forget view increment with the actual listing UUID
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h1 className="font-bold mb-2">الـlisting ده مش موجود</h1>
          <Link href="/marketplace" className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold mt-4">
            تصفح الـmarketplace
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

  const whatsappMessage = encodeURIComponent(
    `مرحباً، أنا مهتم بـ "${listing.title}" على Madmona Marketplace.\nاللينك: https://madmonacairo.com/marketplace/${listing.slug}`
  )

  const formatAttrValue = (av: AttributeWithValue): string => {
    const v = av.value
    const attr = av.attribute
    if (v === null || v === undefined) return '-'
    if (attr.field_type === 'boolean') return v ? '✓ نعم' : '✗ لا'
    if (attr.field_type === 'select') {
      const opt = (attr.options || []).find((o: any) => o.key === v)
      return opt?.label_ar || String(v)
    }
    if (attr.field_type === 'multi_select' && Array.isArray(v)) {
      return v.map(key => {
        const opt = (attr.options || []).find((o: any) => o.key === key)
        return opt?.label_ar || key
      }).join('، ')
    }
    if (attr.field_type === 'number' && attr.unit) {
      return `${v} ${attr.unit}`
    }
    return String(v)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link href="/marketplace" className="p-1 hover:bg-gray-50 rounded-full flex-shrink-0">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-sm font-semibold text-gray-700 truncate flex-1 text-center">{listing.title}</h1>
          {isAuthed ? (
            <Link
              href="/account"
              className="p-1 text-gray-600 hover:bg-gray-50 rounded-full flex-shrink-0"
              title="حسابي"
            >
              <User className="w-5 h-5" />
            </Link>
          ) : (
            <div className="w-7" />
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto pb-32">
        <div className="bg-white">
          <div className="aspect-[16/10] bg-gray-100 relative">
            {currentPhoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.caption || listing.title}
                  className="w-full h-full object-cover"
                />
                {sortedPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIndex(i => (i === 0 ? sortedPhotos.length - 1 : i - 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPhotoIndex(i => (i === sortedPhotos.length - 1 ? 0 : i + 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {photoIndex + 1} / {sortedPhotos.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-gray-300" />
              </div>
            )}
          </div>
          {sortedPhotos.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {sortedPhotos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setPhotoIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                    i === photoIndex ? 'border-[#1F5F3F]' : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 sm:p-6 border-t border-gray-100">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              {listing.category && (
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <span>{listing.category.icon}</span> {listing.category.name_ar}
                </p>
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{listing.title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-3">
            {(listing.district || listing.city) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-400" />
                {[listing.district, listing.city].filter(Boolean).join(', ')}
              </span>
            )}
            {listing.rating && Number(listing.rating) > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[#B8860B] text-[#B8860B]" />
                <strong>{Number(listing.rating).toFixed(1)}</strong>
                <span className="text-gray-500">({listing.reviews_count} تقييم)</span>
              </span>
            )}
            {listing.min_booking_hours && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4 text-gray-400" />
                حد أدنى {listing.min_booking_hours} ساعة
              </span>
            )}
          </div>
        </div>

        {listing.description && (
          <div className="bg-white p-4 sm:p-6 mt-2 border-t border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-2">الوصف</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>
        )}

        {attributes.length > 0 && (
          <div className="bg-white p-4 sm:p-6 mt-2 border-t border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#1F5F3F]" /> التفاصيل
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {attributes.map(av => (
                <div key={av.attribute.id} className="flex flex-col">
                  <span className="text-xs text-gray-500">{av.attribute.name_ar}</span>
                  <span className="text-sm font-medium text-gray-900 mt-0.5">
                    {formatAttrValue(av)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pricing.length > 0 && (
          <div className="bg-white p-4 sm:p-6 mt-2 border-t border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-3">الأسعار</h2>
            <div className="space-y-2">
              {pricing.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{PERIOD_LABELS[rule.period_type] || rule.period_type}</span>
                  <span className="text-sm font-bold text-[#1F5F3F]">
                    {Number(rule.price).toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {listing.address && (
          <div className="bg-white p-4 sm:p-6 mt-2 border-t border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#1F5F3F]" /> الموقع
            </h2>
            <p className="text-sm text-gray-700">{listing.address}</p>
          </div>
        )}

        {listing.supplier && (
          <div className="bg-white p-4 sm:p-6 mt-2 border-t border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-3">المورد</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1F5F3F]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#1F5F3F]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{listing.supplier.business_name}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> مورد موثّق على Madmona
                </p>
              </div>
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="bg-white p-4 sm:p-6 mt-2 border-t border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 fill-[#B8860B] text-[#B8860B]" /> التقييمات ({reviews.length})
            </h2>
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {r.customer?.full_name || 'عميل'}
                    </p>
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
                    <p className="text-sm text-gray-700 mt-1">{r.comment}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-50">
        <div className="max-w-4xl mx-auto p-4 flex items-center gap-2">
          <div className="flex-1">
            {startingPrice !== null ? (
              <>
                <p className="text-xs text-gray-500">يبدأ من</p>
                <p className="text-lg font-bold text-[#1F5F3F]">
                  {startingPrice.toLocaleString('ar-EG')} <span className="text-sm font-normal">ج.م</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">السعر عند الطلب</p>
            )}
          </div>

          {phoneClean && (
            <a
              href={`https://wa.me/${phoneClean}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-12 h-12 bg-[#25D366] text-white rounded-xl hover:bg-[#1da851] flex-shrink-0"
              title="واتساب"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          )}

          {canBook ? (
            <Link
              href={`/marketplace/${listing.slug}/book`}
              className="flex items-center gap-2 bg-[#1F5F3F] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 flex-shrink-0"
            >
              <Calendar className="w-5 h-5" />
              احجز دلوقتي
            </Link>
          ) : (
            <a
              href={phoneClean ? `https://wa.me/${phoneClean}?text=${whatsappMessage}` : 'https://wa.me/201002229982'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#1F5F3F] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 flex-shrink-0"
            >
              <MessageCircle className="w-5 h-5" />
              تواصل
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
