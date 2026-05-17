'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Sparkles, TrendingUp, ExternalLink, Newspaper, MapPin,
  RefreshCw, Clock, ChevronRight, ChevronLeft, Pause, Play, X,
} from 'lucide-react'

// ============================================================================
// EconomicNewsHero — Live news ticker with FULL user control
//
// ⏱️ Auto-refresh from RSS sources every 2 minutes
// ⏭️ Manual skip (next item) — user can advance immediately
// ⏮️ Manual previous — go back to previous item
// 🔄 Manual refresh button — fetch new batch instantly
// ⏸️ Pause/Play — stop auto-rotation if user is reading
// ❌ Hide (escape) — dismiss the ticker entirely (session)
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

const ROTATION_MS = 5000                      // 5s per news item
const FORCE_REFRESH_MS = 2 * 60 * 1000        // 2 minutes — Mohamed's req
const TICK_MS = 1000

export default function EconomicNewsHero({ fallbackImage }: Props) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(Date.now())
  const [refreshing, setRefreshing] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [now, setNow] = useState(Date.now())

  const fetchingRef = useRef(false)

  // Fetch news (force=true → server refreshes pool from RSS)
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
      setTimeout(() => setRefreshing(false), 800)
    }
  }

  // Initial load
  useEffect(() => {
    fetchNews(true).then(ok => {
      if (!ok) setError(true)
    })
  }, [])

  // Auto-refresh from RSS every 2 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      fetchNews(true)
    }, FORCE_REFRESH_MS)
    return () => clearInterval(timer)
  }, [])

  // Tick — countdown updates every second
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(t)
  }, [])

  // Auto-rotation through items (only when not paused)
  useEffect(() => {
    if (items.length <= 1 || paused) return
    const timer = setInterval(() => {
      setImgLoaded(false)
      setCurrentIndex(prev => (prev + 1) % items.length)
    }, ROTATION_MS)
    return () => clearInterval(timer)
  }, [items, paused])

  // Manual controls
  const handleNext = () => {
    if (items.length <= 1) return
    setImgLoaded(false)
    setCurrentIndex(prev => (prev + 1) % items.length)
  }

  const handlePrevious = () => {
    if (items.length <= 1) return
    setImgLoaded(false)
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length)
  }

  const handleRefresh = () => {
    fetchNews(true)
  }

  const togglePause = () => setPaused(p => !p)

  // Display values
  const ageMs = now - lastFetchedAt
  const ageSeconds = Math.floor(ageMs / 1000)
  const nextRefreshIn = Math.max(0, Math.floor((FORCE_REFRESH_MS - ageMs) / 1000))
  const minutes = Math.floor(nextRefreshIn / 60)
  const seconds = nextRefreshIn % 60

  const formatAge = (s: number) => {
    if (s < 60) return `من ${s} ث`
    const m = Math.floor(s / 60)
    return `من ${m} د`
  }

  const current = items[currentIndex]
  const hasNews = !error && current

  // Hidden state — show a small "bring back" pill
  if (hidden) {
    return (
      <div className="relative aspect-[4/5] md:aspect-[3/4] rounded-3xl overflow-hidden shadow-luxe">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fallbackImage} alt="Madmona" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <button
          type="button"
          onClick={() => setHidden(false)}
          className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md hover:bg-white rounded-2xl px-4 py-3 shadow-card hover:shadow-elevated transition-all flex items-center gap-2"
        >
          <Newspaper className="w-4 h-4 text-[#1F6F5F]" />
          <span className="text-xs font-bold text-gray-900">عرض الأخبار</span>
        </button>
      </div>
    )
  }

  if (!hasNews) {
    return (
      <div className="relative aspect-[4/5] md:aspect-[3/4] rounded-3xl overflow-hidden shadow-luxe">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fallbackImage} alt="Madmona" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {!error && items.length === 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-card">
            <RefreshCw className="w-3 h-3 animate-spin text-[#1F6F5F]" />
            جاري تحميل الأخبار...
          </div>
        )}

        <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-card max-w-[220px]">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#2FA084]" />
            <p className="text-[10px] font-black tracking-widest uppercase text-[#1F6F5F]">جديد</p>
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
      {/* Status bar — above the news image */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1 text-[11px] font-bold flex-wrap">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock className="w-3 h-3" />
          <span>آخر تحديث: {formatAge(ageSeconds)}</span>
        </div>
        <div className={`flex items-center gap-1.5 ${refreshing ? 'text-[#2FA084]' : 'text-gray-500'}`}>
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

      {/* News image with overlays */}
      <div className="relative aspect-[4/5] md:aspect-[3/4] rounded-3xl overflow-hidden shadow-luxe group">
        {/* Clickable image (the news article link) */}
        <a
          href={current.link}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 block no-underline"
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
        </a>

        {/* Top-right: LIVE badge */}
        <div className={`absolute top-4 right-4 flex items-center gap-2 ${
          refreshing ? 'bg-[#2FA084]' : 'bg-red-600'
        } text-white text-[11px] font-black tracking-wider uppercase px-3 py-1.5 rounded-full shadow-elevated z-20 transition-colors pointer-events-none`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span>{refreshing ? 'تحديث' : 'LIVE'}</span>
        </div>

        {/* Top-left: Counter + Egypt flag + Hide button */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none">
            {current.isEgyptian && <span className="text-sm leading-none">🇪🇬</span>}
            <Newspaper className="w-3 h-3" />
            {currentIndex + 1} / {items.length}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setHidden(true)
            }}
            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            aria-label="إخفاء الأخبار"
            title="إخفاء"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Side controls — Previous/Next arrows */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handlePrevious() }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
          aria-label="الخبر السابق"
          title="السابق"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleNext() }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
          aria-label="الخبر التالي"
          title="التالي"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 z-10 pointer-events-none">
          <div className={`inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full mb-3 shadow-card ${
            current.isEgyptian
              ? 'bg-gradient-to-l from-[#2FA084] to-[#D4A12A] text-white'
              : 'bg-[#1F6F5F] text-white'
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

          <div className="flex items-center justify-between gap-3 mb-3">
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
            <a
              href={current.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-white/80 hover:text-white transition-colors no-underline pointer-events-auto"
            >
              <span>اقرأ المزيد</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Bottom-right: Action buttons (Pause + Refresh) */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
          <button
            type="button"
            onClick={togglePause}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all"
            aria-label={paused ? 'تشغيل' : 'إيقاف مؤقت'}
            title={paused ? 'تشغيل' : 'إيقاف مؤقت'}
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all disabled:opacity-50"
            aria-label="تحديث الآن"
            title="تحديث الآن"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Pause indicator overlay (subtle, when paused) */}
        {paused && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 z-10 pointer-events-none">
            <Pause className="w-3 h-3" />
            متوقف
          </div>
        )}
      </div>
    </div>
  )
}
