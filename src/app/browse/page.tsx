'use client'

import { Suspense, useEffect, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Search, MapPin, Star, ImageIcon, Loader2, ArrowRight, User, LogIn, Heart,
  Sparkles, Building2, MessageCircle, Clock, ShieldCheck, CheckCircle, Crown,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'

// ============================================================================
// /browse — Madmona-branded landing for مضمونة supplier's listings.
// Reads from the same `listings` table as /marketplace, filtered by
// supplier_id where business_name = 'مضمونة'.
// ============================================================================

interface Listing {
  id: string
  title: string
  slug: string
  description: string | null
  city: string | null
  district: string | null
  rating: number | null
  reviews_count: number
  status: string
  category: { name_ar: string; icon: string | null; slug: string } | null
  photos: { url: string; is_primary: boolean }[] | null
  pricing: { price: number | string; period_type: string; is_active: boolean }[] | null
}

const PERIOD_LABELS: Record<string, string> = {
  hourly: 'الساعة',
  daily: 'اليوم',
  weekly: 'الأسبوع',
  monthly: 'الشهر',
  per_event: 'مرة',
}

function MadmonaSpacesContent() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [togglingFav, setTogglingFav] = useState<string | null>(null)
  const [supplierExists, setSupplierExists] = useState<boolean | null>(null)

  useEffect(() => {
    const init = async () => {
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

      // Find Madmona supplier
      // @ts-expect-error
      const { data: madmonaSup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id')
        .eq('business_name', 'مضمونة')
        .maybeSingle()

      if (!madmonaSup) {
        setSupplierExists(false)
        setLoading(false)
        return
      }
      setSupplierExists(true)

      // @ts-expect-error
      const { data } = await supabaseBrowser
        .from('listings')
        .select(`
          id, title, slug, description, city, district, rating, reviews_count, status,
          category:categories(name_ar, icon, slug),
          photos:listing_photos(url, is_primary),
          pricing:pricing_rules(price, period_type, is_active)
        `)
        .eq('supplier_id', madmonaSup.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      setListings((data || []) as Listing[])
      setLoading(false)
    }
    init()
  }, [])

  const toggleFavorite = async (e: MouseEvent, listingId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      router.push(`/auth/login?redirect=${encodeURIComponent('/browse')}`)
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

  const getMinPrice = (listing: Listing): { price: number; period: string } | null => {
    const activeRules = (listing.pricing || []).filter(p => p.is_active && Number(p.price) > 0)
    if (activeRules.length === 0) return null
    const cheapest = activeRules.reduce((min, p) =>
      Number(p.price) < Number(min.price) ? p : min
    )
    return { price: Number(cheapest.price), period: cheapest.period_type }
  }

  const filtered = searchQuery.trim()
    ? listings.filter(l =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : listings

  return (
    <div className="min-h-screen gradient-mesh pb-20 md:pb-0" dir="rtl">
      <TopNav />

      {/* Floating gradient blobs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#1F5F3F]/10 rounded-full blur-3xl -z-10 pointer-events-none animate-float" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#B8860B]/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <main className="relative">
        {/* Madmona Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-12 pb-10 md:pt-20 md:pb-14 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full mb-6 shadow-soft animate-slide-down">
            <Crown className="w-4 h-4 text-[#B8860B]" />
            <span className="text-xs font-bold text-gray-700 tracking-wide">المساحات الأصلية لمضمونة</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-[0.95] mb-5 tracking-tight animate-slide-up">
            مساحات
            <br />
            <span className="gradient-text-green">مضمونة</span>
          </h1>

          <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto mb-8 animate-slide-up delay-200">
            مكاتب فردية، غرف اجتماعات، وجاردن في قلب مصر الجديدة.
            <br className="hidden sm:block" />
            مساحات بنبنيها بعناية، يومك الأول مجاناً.
          </p>

          {/* Trust ribbon */}
          <div className="flex items-center justify-center gap-6 md:gap-8 flex-wrap animate-fade-in delay-300">
            <TrustBadge icon={<MapPin className="w-3.5 h-3.5" />} label="٧ سليمان عَزْمي" />
            <TrustBadge icon={<Clock className="w-3.5 h-3.5" />} label="٩ ص → ١١ م يومياً" />
            <TrustBadge icon={<ShieldCheck className="w-3.5 h-3.5" />} label="حجز مضمون" />
          </div>
        </section>

        {/* Search bar */}
        <section className="max-w-3xl mx-auto px-4 mb-8 animate-slide-up delay-400">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المساحات..."
              className="w-full pr-12 pl-4 py-4 bg-white/90 backdrop-blur border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all shadow-soft"
            />
          </div>
        </section>

        {/* Listings */}
        <section className="max-w-6xl mx-auto px-4 mb-12">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-soft">
                  <div className="aspect-[4/3] animate-shimmer" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-16 animate-shimmer rounded-full" />
                    <div className="h-5 w-3/4 animate-shimmer rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !supplierExists ? (
            <EmptyState
              title="مضمونة لسه ما اتسجلتش كمورد"
              description="فيه خطأ تقني — الـsupplier لازم يتعمل في الـDB."
              cta="تواصل معانا"
              ctaHref="https://wa.me/201002229982"
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={searchQuery ? 'مفيش نتائج للبحث' : 'مفيش مساحات منشورة لسه'}
              description={searchQuery ? 'جرّب كلمات تانية أو شاف اللي عرضنا.' : 'بنحضّر مساحاتنا للنشر. تواصل معانا للحجز المباشر.'}
              cta="تواصل عبر واتساب"
              ctaHref="https://wa.me/201002229982"
            />
          ) : (
            <>
              <div className="mb-6 flex items-end justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900">
                    <span className="tabular">{filtered.length}</span>{' '}
                    <span className="font-semibold text-gray-500">
                      {filtered.length === 1 ? 'مساحة' : 'مساحة'}
                    </span>
                  </h2>
                </div>
                <Link
                  href="/marketplace"
                  className="text-xs font-semibold text-[#1F5F3F] hover:gap-2 inline-flex items-center gap-1 transition-all no-underline"
                >
                  شوف المزيد على Marketplace
                  <ArrowRight className="w-3 h-3 rotate-180" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((listing, i) => {
                  const photos = listing.photos || []
                  const primary = photos.find(p => p.is_primary) || photos[0]
                  const photoUrl = primary?.url
                  const minPrice = getMinPrice(listing)
                  const isFav = favorites.has(listing.id)

                  return (
                    <Link
                      key={listing.id}
                      href={`/marketplace/${listing.slug}`}
                      className="group block bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-500 no-underline animate-slide-up"
                      style={{ animationDelay: `${Math.min(i * 80, 400)}ms` }}
                    >
                      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                        {photoUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-gray-300" />
                          </div>
                        )}

                        <button
                          onClick={(e) => toggleFavorite(e, listing.id)}
                          disabled={togglingFav === listing.id}
                          className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white shadow-card disabled:opacity-50 hover:scale-105 transition-all"
                          title={isFav ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
                        >
                          {togglingFav === listing.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : (
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                          )}
                        </button>

                        {/* Madmona badge */}
                        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-[#1F5F3F] text-white rounded-full text-[10px] font-bold shadow-soft">
                          <Crown className="w-3 h-3" />
                          مضمونة
                        </div>

                        {listing.rating && Number(listing.rating) > 0 && (
                          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 bg-black/60 backdrop-blur rounded-full text-[10px] font-bold text-white">
                            <Star className="w-3 h-3 fill-[#B8860B] text-[#B8860B]" />
                            <span>{Number(listing.rating).toFixed(1)}</span>
                            <span className="opacity-60">({listing.reviews_count})</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        {listing.category && (
                          <p className="text-[10px] font-bold text-[#B8860B] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <span>{listing.category.icon}</span>
                            <span>{listing.category.name_ar}</span>
                          </p>
                        )}
                        <h3 className="font-black text-base md:text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-[#1F5F3F] transition-colors">
                          {listing.title}
                        </h3>

                        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                          <div>
                            {minPrice ? (
                              <>
                                <p className="text-[10px] text-gray-500 font-medium">يبدأ من</p>
                                <p className="text-xl font-black text-[#1F5F3F] leading-none mt-0.5 tabular">
                                  {minPrice.price.toLocaleString('ar-EG')}
                                  <span className="text-xs font-medium text-gray-500 mr-1">
                                    ج.م/{PERIOD_LABELS[minPrice.period] || minPrice.period}
                                  </span>
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-gray-400 font-medium">السعر عند الطلب</p>
                            )}
                          </div>
                          <div className="inline-flex items-center gap-1 text-[#1F5F3F] font-bold text-xs group-hover:gap-2 transition-all">
                            <span>تفاصيل</span>
                            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {/* WhatsApp CTA */}
        <section className="max-w-3xl mx-auto px-4 mb-12">
          <div className="bg-gradient-to-l from-[#1F5F3F] to-[#2d7a52] text-white rounded-3xl p-6 md:p-8 shadow-luxe relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#B8860B]/20 rounded-full blur-2xl" />
            <div className="relative">
              <h3 className="text-xl md:text-2xl font-black mb-2">عاوز تتأكد من الحجز؟</h3>
              <p className="text-sm text-white/80 mb-5 max-w-md">
                تواصل معانا على واتساب — رد فوري ٢٤/٧.
              </p>
              <a
                href="https://wa.me/201002229982"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-[#1F5F3F] px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all hover:-translate-y-0.5 no-underline"
              >
                <MessageCircle className="w-4 h-4" />
                اتصل واتساب
              </a>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className="text-[#1F5F3F]">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  )
}

function EmptyState({
  title, description, cta, ctaHref,
}: { title: string; description: string; cta: string; ctaHref: string }) {
  return (
    <div className="bg-white rounded-3xl shadow-soft p-12 md:p-16 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#1F5F3F]/10 to-[#B8860B]/10 rounded-2xl flex items-center justify-center">
        <Building2 className="w-8 h-8 text-[#1F5F3F]" />
      </div>
      <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      <a
        href={ctaHref}
        target={ctaHref.startsWith('http') ? '_blank' : undefined}
        rel={ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1F5F3F] text-white rounded-2xl text-sm font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all no-underline"
      >
        <Sparkles className="w-4 h-4" />
        {cta}
      </a>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function MadmonaSpacesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F5F3F] animate-spin" />
      </div>
    }>
      <MadmonaSpacesContent />
    </Suspense>
  )
}
