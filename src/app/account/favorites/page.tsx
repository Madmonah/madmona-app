'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Heart, MapPin, Star, ImageIcon, Loader2, ArrowRight, Lock, Search,
} from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'

// ============================================================================
// /account/favorites
// Customer's saved/favorited listings.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'ready'

interface FavoriteListing {
  listing_id: string
  created_at: string
  listing: {
    id: string
    title: string
    slug: string
    city: string | null
    district: string | null
    rating: number | null
    reviews_count: number
    status: string
    category: { name_ar: string; name_en?: string | null; icon: string | null } | null
    photos: { url: string; is_primary: boolean }[] | null
    pricing: { price: number | string; is_active: boolean }[] | null
  } | null
}

export default function FavoritesPage() {
  const { t, lang, dir } = useT()
  const [stage, setStage] = useState<Stage>('loading')
  const [favorites, setFavorites] = useState<FavoriteListing[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }
      setUserId(session.user.id)

      const { data } = await supabaseBrowser
        .from('favorites')
        .select(`
          listing_id, created_at,
          listing:listings(
            id, title, slug, city, district, rating, reviews_count, status,
            category:categories(name_ar, name_en, icon),
            photos:listing_photos(url, is_primary),
            pricing:pricing_rules(price, is_active)
          )
        `)
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })

      // Filter out favorites pointing to deleted/unpublished listings
      const valid = (data || []).filter((f: any) => f.listing && f.listing.status === 'published')
      setFavorites(valid as FavoriteListing[])
      setStage('ready')
    }
    init()
  }, [])

  const removeFavorite = async (e: MouseEvent, listingId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) return
    setRemovingId(listingId)
    const { error } = await supabaseBrowser
      .from('favorites')
      .delete()
      .eq('customer_id', userId)
      .eq('listing_id', listingId)
    if (!error) {
      setFavorites(favorites.filter(f => f.listing_id !== listingId))
    }
    setRemovingId(null)
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir={dir}>
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir={dir}>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#059669] mx-auto mb-3" />
          <h1 className="font-bold mb-4">{t('booking.login_first')}</h1>
          <Link
            href="/auth/login?redirect=/account/favorites"
            className="block bg-[#34D399] text-[#04352A] py-3 rounded-xl font-semibold"
          >
            {t('auth.login.title')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir={dir}>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/account" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{t('nav.favorites')}</h1>
            <p className="text-xs text-gray-500">{t('account.n_favorites', { n: favorites.length })}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">{t('account.favorites_empty_title')}</h3>
            <p className="text-sm text-gray-500 mb-6">
              {t('account.favorites_empty_sub')}
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#34D399]/90"
            >
              <Search className="w-4 h-4" />
              {t('listing.browse_marketplace')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {favorites.map(fav => {
              if (!fav.listing) return null
              const listing = fav.listing
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
                      onClick={(e) => removeFavorite(e, listing.id)}
                      disabled={removingId === listing.id}
                      className="absolute top-2 left-2 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white shadow-sm disabled:opacity-50"
                      title={t('market.remove_fav')}
                    >
                      {removingId === listing.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    {listing.category && (
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <span>{listing.category.icon}</span> {lang === 'en' && listing.category.name_en ? listing.category.name_en : listing.category.name_ar}
                      </p>
                    )}
                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{listing.title}</h3>
                    {(listing.district || listing.city) && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        {[listing.district, listing.city].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        {startingPrice !== null ? (
                          <>
                            <span className="text-xs text-gray-500">{t('market.starts_from')}</span>
                            <p className="font-bold text-[#059669]">
                              {startingPrice.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} <span className="text-xs font-normal">{t('common.egp')}</span>
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">{t('market.price_on_request')}</span>
                        )}
                      </div>
                      {listing.rating && Number(listing.rating) > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="w-3 h-3 fill-[#2FA084] text-[#2FA084]" />
                          <span className="font-semibold text-gray-900">{Number(listing.rating).toFixed(1)}</span>
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
