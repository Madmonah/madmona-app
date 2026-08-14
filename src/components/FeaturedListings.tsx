'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { ArrowLeft, MapPin, Star, ImageIcon, Clock } from 'lucide-react'
import { isDemoListing, cleanListingTitle } from '@/lib/listingHelpers'
import { useT } from '@/lib/i18n/LanguageProvider'

// ============================================================
// FeaturedListings — "المختار بعناية"
// يختار منتجات من فئات مختلفة (round-robin) وبس اللي عندهم صورة،
// ويلفّ بينهم أوتوماتيك كل ٥ ثواني (٣ في المرة).
// ============================================================

interface Listing {
  id: string
  title: string
  slug: string
  city: string | null
  district: string | null
  rating: number | null
  reviews_count: number
  category: { name_ar: string; name_en?: string | null; icon: string | null } | null
  photos: { url: string; is_primary: boolean; quality_flag?: string | null; is_placeholder?: boolean | null }[] | null
  pricing: { price: number | string; is_active: boolean }[] | null
}

// 31 يوليو: صور المنتج اللي عليها كتابة أو لوجو بقت تتعرض — graphic بس هو المستبعد
const SHOWABLE_FLAGS = ['clean', 'has_text', 'logo']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function FeaturedListings() {
  const { t, lang } = useT()
  const [items, setItems] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const poolRef = useRef<Listing[]>([])
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabaseBrowser
        .from('listings')
        .select(`
          id, title, slug, city, district, rating, reviews_count,
          category:categories(name_ar, name_en, icon),
          photos:listing_photos(url, is_primary, quality_flag, is_placeholder),
          pricing:pricing_rules(price, is_active)
        `)
        .eq('status', 'published')
        // استبعاد إعلانات الدليل الغير مستلمة (directory) — تظهر فقط في البحث/التصفح
        .not('is_directory', 'is', true)
        .not('title', 'ilike', 'DEMO%')
        .order('views_count', { ascending: false })
        .limit(48)

      const rows = ((data || []) as Listing[])
        // بس اللي عندهم صورة فعلاً (ومش معلّمة graphic)
        .filter(l => (l.photos || []).some(p => p?.url && !p.is_placeholder && (!p.quality_flag || SHOWABLE_FLAGS.includes(p.quality_flag))))

      // round-robin بين الفئات + عشوائية كل ريفريش (shuffle للفئات وجوّاها)
      const byCat = new Map<string, Listing[]>()
      for (const l of rows) {
        const key = l.category?.name_ar || 'أخرى'
        if (!byCat.has(key)) byCat.set(key, [])
        byCat.get(key)!.push(l)
      }
      const buckets = shuffle(Array.from(byCat.values()).map((b) => shuffle(b)))
      const diverse: Listing[] = []
      let added = true
      while (added) {
        added = false
        for (const b of buckets) {
          const next = b.shift()
          if (next) { diverse.push(next); added = true }
        }
      }

      // dedup بصورة العرض: مايكررش نفس الصورة (وحدات العقار نفس المبنى)، ومن غير بلاسهولدر
      const seen = new Set<string>()
      const deduped = diverse.filter((l) => {
        const real = (l.photos || []).filter(
          (p) => p?.url && !p.is_placeholder && (!p.quality_flag || SHOWABLE_FLAGS.includes(p.quality_flag))
        )
        const url = (real.find((p) => p.is_primary) || real[0])?.url
        if (!url || seen.has(url)) return false
        seen.add(url)
        return true
      })

      poolRef.current = deduped
      setItems(deduped)
      setLoading(false)
    }
    load()
  }, [])

  // feed لا نهائي رأسي — ترتيب عشوائي لكل مستخدم؛ أول ما نقرب من الآخر نضيف دفعة جديدة shuffled
  useEffect(() => {
    if (loading) return
    const sentinel = sentinelRef.current
    if (!sentinel || poolRef.current.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setItems((prev) => (prev.length > 300 ? prev : [...prev, ...shuffle(poolRef.current)]))
        }
      },
      { rootMargin: '0px 0px 800px 0px' }
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [loading])

  if (loading) {
    return (
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-bold text-[#2FA084] uppercase tracking-widest mb-2">{t('comp.fl.eyebrow')}</p>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">
            {t('comp.fl.title_pre')}
            <br />
            <span className="gradient-text-green">{t('comp.fl.title_emph')}</span>
          </h2>
        </div>
        <Link
          href="/marketplace"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm text-[#059669] font-bold hover:gap-2.5 transition-all no-underline"
        >
          <span>{t('comp.fl.browse_all')}</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((listing, i) => {
          const photos = (listing.photos || []).filter(p => (!p.quality_flag || SHOWABLE_FLAGS.includes(p.quality_flag)) && !p.is_placeholder)
          const primary = photos.find(p => p.is_primary) || photos[0]
          const photoUrl = primary?.url
          const activePrices = (listing.pricing || [])
            .filter(p => p.is_active)
            .map(p => Number(p.price))
            .filter(p => p > 0)
          const startingPrice = activePrices.length > 0 ? Math.min(...activePrices) : null
          const isDemo = isDemoListing(listing.title)
          const displayTitle = cleanListingTitle(listing.title)

          return (
            <Link
              key={`${listing.id}-${i}`}
              href={`/marketplace/${listing.slug}`}
              className="group block bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-500 no-underline"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-300" />
                  </div>
                )}

                {isDemo && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-l from-amber-400 to-amber-300 text-amber-900 rounded-full text-[10px] font-black shadow-card border border-amber-500/30">
                    <Clock className="w-2.5 h-2.5" />
                    {t('comp.fl.coming_soon')}
                  </div>
                )}

                {listing.category && (
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-gray-800">
                    <span>{listing.category.icon}</span>
                    <span>{lang === 'en' && listing.category.name_en ? listing.category.name_en : listing.category.name_ar}</span>
                  </div>
                )}

                {listing.rating && Number(listing.rating) > 0 && (
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-gray-800">
                    <Star className="w-3 h-3 fill-[#2FA084] text-[#2FA084]" />
                    <span>{Number(listing.rating).toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="font-black text-base md:text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-[#059669] transition-colors">
                  {displayTitle}
                </h3>

                {(listing.district || listing.city) && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3" />
                    {[listing.district, listing.city].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}
                  </p>
                )}

                <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                  <div>
                    {startingPrice !== null ? (
                      <>
                        <p className="text-[10px] text-gray-500 font-medium">{t('market.starts_from')}</p>
                        <p className="text-xl font-black text-[#059669] leading-none mt-0.5 tabular">
                          {startingPrice.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                          <span className="text-xs font-medium text-gray-500 ms-1">{t('common.egp')}</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 font-medium">{t('market.price_on_request')}</p>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[#059669] font-bold text-xs group-hover:gap-2 transition-all">
                    <span>{t('comp.fl.learn_more')}</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* حارس التحميل اللا نهائي (feed) */}
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />

      <Link
        href="/marketplace"
        className="sm:hidden mt-6 flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-[#059669] no-underline"
      >
        <span>{t('comp.fl.browse_all')}</span>
        <ArrowLeft className="w-4 h-4" />
      </Link>
    </section>
  )
}
