'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, TrendingUp, ExternalLink, Newspaper, MapPin } from 'lucide-react'

// ============================================================================
// EconomicNewsHero — TRULY fresh news ticker
//
// Strategy:
//   1. localStorage tracks every article URL the user has seen
//   2. API call passes the seen list → server returns only NEW articles
//   3. After each cycle ends → fetch fresh batch (excluding seen)
//   4. Result: user NEVER sees the same article twice (until pool exhausts)
//
// - Rotation: 5 seconds (faster than before)
// - 20+ RSS sources for maximum variety
// - Egyptian-first interleaving
// ============================================================================

interface NewsItem {
  title: string
  link: string
  image: string
  source: string
  pubDate: string
  isEgyptian?: boolean
  category?: string
}

interface Props {
  fallbackImage: string
}

const ROTATION_MS = 5000              // 5s per item (very lively)
const SEEN_STORAGE_KEY = 'madmona_seen_news_v1'
const SEEN_MAX_SIZE = 200             // keep last 200 seen URLs
const PREFETCH_AT_INDEX_RATIO = 0.5   // prefetch when 50% through cycle

export default function EconomicNewsHero({ fallbackImage }: Props) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [error, setError] = useState(false)

  const nextBufferRef = useRef<NewsItem[] | null>(null)
  const fetchingRef = useRef(false)
  const seenRef = useRef<Set<string>>(new Set())

  // ---- Seen-tracking helpers ---------------------------------------------

  const loadSeen = (): Set<string> => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(SEEN_STORAGE_KEY)
      if (!raw) return new Set()
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? new Set(arr) : new Set()
    } catch {
      return new Set()
    }
  }

  const saveSeen = (set: Set<string>) => {
    if (typeof window === 'undefined') return
    try {
      // Limit size — keep only most recent N
      const arr = Array.from(set).slice(-SEEN_MAX_SIZE)
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(arr))
    } catch {
      /* localStorage full or disabled — silent fail */
    }
  }

  const markBatchAsSeen = (batch: NewsItem[]) => {
    batch.forEach(item => seenRef.current.add(item.link))
    saveSeen(seenRef.current)
  }

  // ---- Fetch helper -------------------------------------------------------

  const fetchNews = async (): Promise<NewsItem[] | null> => {
    if (fetchingRef.current) return null
    fetchingRef.current = true
    try {
      const seenList = Array.from(seenRef.current).slice(-100) // pass last 100
      const seenParam = seenList.length > 0 ? `?seen=${encodeURIComponent(seenList.join(','))}` : ''
      const res = await fetch(`/api/economic-news${seenParam}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
        return data.items
      }
    } catch {
      /* silent */
    } finally {
      fetchingRef.current = false
    }
    return null
  }

  // ---- Initial load -------------------------------------------------------

  useEffect(() => {
    seenRef.current = loadSeen()

    let cancelled = false
    const init = async () => {
      const fresh = await fetchNews()
      if (cancelled) return
      if (fresh && fresh.length > 0) {
        setItems(fresh)
        setError(false)
      } else {
        setError(true)
      }
    }
    init()

    return () => { cancelled = true }
  }, [])

  // ---- Rotation logic with auto-refresh on cycle end ---------------------

  useEffect(() => {
    if (items.length <= 1) return

    const timer = setInterval(async () => {
      setImgLoaded(false)
      setCurrentIndex(prev => {
        const next = prev + 1

        // Prefetch fresh batch at 50% through cycle
        if (next === Math.floor(items.length * PREFETCH_AT_INDEX_RATIO) && !nextBufferRef.current) {
          fetchNews().then(fresh => {
            if (fresh && fresh.length > 0) nextBufferRef.current = fresh
          })
        }

        // End of cycle → swap to fresh batch
        if (next >= items.length) {
          // Mark current batch as seen
          markBatchAsSeen(items)

          if (nextBufferRef.current && nextBufferRef.current.length > 0) {
            const fresh = nextBufferRef.current
            nextBufferRef.current = null
            setItems(fresh)
            // Trigger another prefetch right away
            fetchNews().then(f => { if (f) nextBufferRef.current = f })
          } else {
            // Buffer not ready — fetch sync (may briefly show same)
            fetchNews().then(fresh => {
              if (fresh && fresh.length > 0) setItems(fresh)
            })
          }
          return 0
        }

        return next
      })
    }, ROTATION_MS)

    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const current = items[currentIndex]
  const hasNews = !error && current

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
        key={`${current.link}-${currentIndex}`}
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

      {/* Content */}
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
