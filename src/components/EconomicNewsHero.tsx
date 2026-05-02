'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, TrendingUp, ExternalLink, Newspaper, MapPin, RefreshCw, Clock } from 'lucide-react'

// ============================================================================
// EconomicNewsHero — with VISIBLE refresh indicator
//
//   ⏱️ "آخر تحديث من 30 ثانية"
//   🔄 "التحديث الجديد في 4:30"
//   💫 Pulsing badge when refreshing
//   🆕 Auto-refresh every 5 minutes (matches API pool TTL)
// ============================================================================

interface NewsItem {
  title: string
  link: string
  image: string
  source: string
  pubDate: string
  isEgyptian?: boolean
}

interface ApiResponse {
  ok: boolean
  items: NewsItem[]
  pool_age_seconds?: number
  next_refresh_in_seconds?: number
  generated_at?: string
}

interface Props {
  fallbackImage: string
}

const ROTATION_MS = 5000                  // 5s per news item
const FORCE_REFRESH_MS = 5 * 60 * 1000   // 5 minutes — Mohamed's requirement
const TICK_MS = 1000                      // update countdown every 1 sec

export default function EconomicNewsHero({ fallbackImage }: Props) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(Date.now())
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(Date.now())

  const fetchingRef = useRef(false)

  // Fetch news (force=true tells server to refresh pool from RSS)
  const fetchNews = async (force = false): Promise<boolean> => {
    if (fetchingRef.current) return false
    fetchingRef.current = true
    setRefreshing(true)
    try {
      const cacheBust = `?t=${Date.now()}_${Math.random().toString(36).slice(2)}${force ? '&refresh=1' : ''}`
      const res = await fetch(`/api/economic-news${cacheBust}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      })
      const data: ApiResponse = await res.json()
      if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items)
        setLastFetchedAt(Date.now())
        setError(false)
        setCurrentIndex(0)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      fetchingRef.current = false
      // Brief delay so the user sees the refresh indicator
      setTimeout(() => setRefreshing(false), 800)
    }
  }

  // Initial load
  useEffect(() => {
    fetchNews(true).then(ok => {
      if (!ok) setError(true)
    })
  }, [])

  // FORCED 5-minute refresh — this is the heart of Mohamed's requirement
  useEffect(() => {
    const timer = setInterval(() => {
      fetchNews(true) // force = true → server refreshes pool from RSS
    }, FORCE_REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  // Tick — update the countdown display every second
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(t)
  }, [])

  // Rotation through items every 5 seconds
  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(() => {
      setImgLoaded(false)
      setCurrentIndex(prev => (prev + 1) % items.length)
    }, ROTATION_MS)
    return () => clearInterval(timer)
  }, [items])

  // Calculate display values
  const ageMs = now - lastFetchedAt
  const ageSeconds = Math.floor(ageMs / 1000)
  const nextRefreshIn = Math.max(0, Math.floor((FORCE_REFRESH_MS - ageMs) / 1000))
  const minutes = Math.floor(nextRefreshIn / 60)
  const seconds = nextRefreshIn % 60

  const formatAge = (s: number) => {
    if (s < 60) return `من ${s} ثانية`
    const m = Math.floor(s / 60)
    return `من ${m} دقيقة${s % 60 > 30 ? '+' : ''}`
  }

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
            <RefreshCw className="w-3 h-3 animate-spin text-[#1F5F3F]" />
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
    <div className="relative">
      {/* Refresh status bar — ABOVE the news image */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1 text-[11px] font-bold">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock className="w-3 h-3" />
          <span>آخر تحديث: {formatAge(ageSeconds)}</span>
        </div>
        <div className={`flex items-center gap-1.5 ${refreshing ? 'text-[#B8860B]' : 'text-gray-500'}`}>
          {refreshing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>جاري التحديث...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              <span>التحديث القادم: {minutes}:{seconds.toString().padStart(2, '0')}</span>
            </>
          )}
        </div>
      </div>

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

        {/* LIVE badge — pulses brighter when refreshing */}
        <div className={`absolute top-4 right-4 flex items-center gap-2 ${
          refreshing ? 'bg-[#B8860B]' : 'bg-red-600'
        } text-white text-[11px] font-black tracking-wider uppercase px-3 py-1.5 rounded-full shadow-elevated z-10 transition-colors`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span>{refreshing ? 'تحديث' : 'LIVE'}</span>
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
    </div>
  )
}
