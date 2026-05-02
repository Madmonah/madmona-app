'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, TrendingUp, ExternalLink, Newspaper, MapPin } from 'lucide-react'

// ============================================================================
// EconomicNewsHero
//
// Live economic news ticker — ALWAYS FRESH:
//   - Rotates every 6 seconds
//   - When user finishes the cycle → fetches fresh news (forced bypass cache)
//   - Background refresh every 90 seconds (catches new news)
//   - Never repeats the same loop with stale items
// ============================================================================

interface NewsItem {
  title: string
  link: string
  image: string
  source: string
  pubDate: string
  isEgyptian?: boolean
}

interface Props {
  fallbackImage: string
}

const ROTATION_MS = 6000              // 6s per item (faster)
const BG_REFETCH_MS = 90 * 1000       // background refresh every 90s
const ITEMS_TO_REPLACE_AT = 0.7       // when 70% through cycle, prefetch new

export default function EconomicNewsHero({ fallbackImage }: Props) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [error, setError] = useState(false)

  // Buffer for prefetched fresh items (loaded when near end of cycle)
  const nextBufferRef = useRef<NewsItem[] | null>(null)
  const fetchInFlightRef = useRef(false)

  // Fetch news from API
  const fetchNews = async (forceFresh = false): Promise<NewsItem[] | null> => {
    if (fetchInFlightRef.current) return null
    fetchInFlightRef.current = true
    try {
      const url = forceFresh ? '/api/economic-news?fresh=1' : '/api/economic-news'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
        return data.items as NewsItem[]
      }
    } catch {
      /* silent */
    } finally {
      fetchInFlightRef.current = false
    }
    return null
  }

  // Initial load + periodic background refresh
  useEffect(() => {
    let cancelled = false

    const initialLoad = async () => {
      const fresh = await fetchNews(false)
      if (cancelled) return
      if (fresh && fresh.length > 0) {
        setItems(fresh)
        setError(false)
      } else {
        setError(true)
      }
    }
    initialLoad()

    // Background refresh — keeps the buffer warm for seamless transitions
    const bgTimer = setInterval(async () => {
      if (cancelled) return
      const fresh = await fetchNews(false)
      if (fresh && fresh.length > 0 && !cancelled) {
        nextBufferRef.current = fresh
      }
    }, BG_REFETCH_MS)

    return () => {
      cancelled = true
      clearInterval(bgTimer)
    }
  }, [])

  // Rotation logic — when reaching end of cycle, swap in fresh items
  useEffect(() => {
    if (items.length <= 1) return

    const timer = setInterval(async () => {
      setImgLoaded(false)
      setCurrentIndex(prev => {
        const next = prev + 1

        // If we're about to wrap around (finished current cycle)
        if (next >= items.length) {
          // Use buffer if available, otherwise fetch fresh sync
          if (nextBufferRef.current && nextBufferRef.current.length > 0) {
            setItems(nextBufferRef.current)
            nextBufferRef.current = null
            // Trigger another background fetch for the next cycle
            fetchNews(true).then(fresh => {
              if (fresh) nextBufferRef.current = fresh
            })
          } else {
            // No buffer ready — trigger fetch in background, loop existing
            fetchNews(true).then(fresh => {
              if (fresh) {
                setItems(fresh)
                nextBufferRef.current = null
              }
            })
          }
          return 0 // start from beginning
        }

        // Prefetch when at 70% of cycle so transition is seamless
        if (next === Math.floor(items.length * ITEMS_TO_REPLACE_AT) && !nextBufferRef.current) {
          fetchNews(true).then(fresh => {
            if (fresh) nextBufferRef.current = fresh
          })
        }

        return next
      })
    }, ROTATION_MS)

    return () => clearInterval(timer)
  }, [items.length])

  const current = items[currentIndex]
  const hasNews = !error && current

  // Loading / error → fallback image
  if (!hasNews) {
    return (
      <div className="relative aspect-[4/5] md:aspect-[3/4] rounded-3xl overflow-hidden shadow-luxe">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fallbackImage} alt="Madmona" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {!error && items.length === 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-card">
            <span className="w-2 h-2 rounded-full bg-[#1F5F3F] animate-pulse" />
            جاري تحميل الأخبار...
          </div>
        )}

        <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-card max-w-[220px]">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
            <p className="text-[10px] font-black tracking-widest uppercase text-[#1F5F3F]">جديد</p>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            أكتر من <span className="font-black text-gray-900">٨ فئات</span> من الخدمات والمنتجات
          </p>
        </div>
      </div>
    )
  }

  return (
    <a
      href={current.link}
      target="_blank"
      rel="noopener noreferrer"
      className="relative aspect-[4/5] md:aspect-[3/4] rounded-3xl overflow-hidden shadow-luxe block group no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${current.image}-${currentIndex}`}
        src={current.image}
        alt={current.title}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
          imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
        loading="eager"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgLoaded(true)}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* LIVE badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white text-[11px] font-black tracking-wider uppercase px-3 py-1.5 rounded-full shadow-elevated z-10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span>LIVE</span>
        <span className="opacity-70">·</span>
        <span>أخبار اقتصادية</span>
      </div>

      {/* Counter + Egypt flag */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-10">
        {current.isEgyptian && <span className="text-sm leading-none">🇪🇬</span>}
        <Newspaper className="w-3 h-3" />
        {currentIndex + 1} / {items.length}
      </div>

      {/* Content overlay */}
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 z-10">
        <div className={`inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full mb-3 shadow-card ${
          current.isEgyptian
            ? 'bg-gradient-to-l from-[#B8860B] to-[#D4A12A] text-white'
            : 'bg-[#1F5F3F] text-white'
        }`}>
          {current.isEgyptian ? (
            <>
              <MapPin className="w-3 h-3" />
              <span>مصر</span>
              <span className="opacity-70 mx-0.5">·</span>
            </>
          ) : (
            <TrendingUp className="w-3 h-3" />
          )}
          {current.source}
        </div>

        <h3 className="text-base md:text-lg font-black text-white leading-snug line-clamp-3 mb-3 drop-shadow-lg" dir="rtl">
          {current.title}
        </h3>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 flex-1 max-w-[200px]">
            {Array.from({ length: Math.min(items.length, 10) }).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                  i === Math.min(currentIndex, 9) ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/80 group-hover:text-white transition-colors">
            <span>اقرأ المزيد</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>
      </div>
    </a>
  )
}
