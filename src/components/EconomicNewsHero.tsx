'use client'

import { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, ExternalLink, Newspaper } from 'lucide-react'

// ============================================================================
// EconomicNewsHero
//
// Live rotating economic news ticker for the homepage hero.
// - Fetches news from /api/economic-news (8 Arabic/Egyptian sources via RSS)
// - Rotates every 10 seconds
// - Smooth fade transition between items
// - Falls back to static fallback image if API fails or returns empty
// - Each news item is clickable → opens source article in new tab
// ============================================================================

interface NewsItem {
  title: string
  link: string
  image: string
  source: string
  pubDate: string
}

interface Props {
  fallbackImage: string
}

const ROTATION_MS = 10000

export default function EconomicNewsHero({ fallbackImage }: Props) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [error, setError] = useState(false)

  // Fetch news on mount
  useEffect(() => {
    let cancelled = false

    fetch('/api/economic-news')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items)
        } else {
          setError(true)
        }
      })
      .catch(() => !cancelled && setError(true))

    return () => { cancelled = true }
  }, [])

  // Rotate every 10 seconds
  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(() => {
      setImgLoaded(false)
      setCurrentIndex(i => (i + 1) % items.length)
    }, ROTATION_MS)
    return () => clearInterval(timer)
  }, [items.length])

  const current = items[currentIndex]
  const hasNews = !error && current

  // ===========================================================================
  // No news yet (loading or failed) → show fallback image
  if (!hasNews) {
    return (
      <div className="relative aspect-[4/5] md:aspect-[3/4] rounded-3xl overflow-hidden shadow-luxe">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fallbackImage}
          alt="Madmona"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Loading badge if no error */}
        {!error && items.length === 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-card">
            <span className="w-2 h-2 rounded-full bg-[#1F5F3F] animate-pulse" />
            جاري تحميل الأخبار...
          </div>
        )}

        {/* Static badge */}
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

  // ===========================================================================
  // News loaded → show rotating ticker
  return (
    <a
      href={current.link}
      target="_blank"
      rel="noopener noreferrer"
      className="relative aspect-[4/5] md:aspect-[3/4] rounded-3xl overflow-hidden shadow-luxe block group no-underline"
    >
      {/* News image (key changes on rotation → forces re-render with fade) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current.image}
        src={current.image}
        alt={current.title}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
          imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
        loading="eager"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgLoaded(true)}
      />

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* LIVE badge — top right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white text-[11px] font-black tracking-wider uppercase px-3 py-1.5 rounded-full shadow-elevated z-10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span>LIVE</span>
        <span className="opacity-70">·</span>
        <span>أخبار اقتصادية</span>
      </div>

      {/* News count badge — top left */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-10">
        <Newspaper className="w-3 h-3" />
        {currentIndex + 1} / {items.length}
      </div>

      {/* News content — bottom */}
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 z-10">
        {/* Source badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#B8860B] text-white text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full mb-3 shadow-card">
          <TrendingUp className="w-3 h-3" />
          {current.source}
        </div>

        {/* Title */}
        <h3 className="text-base md:text-lg font-black text-white leading-snug line-clamp-3 mb-3 drop-shadow-lg" dir="rtl">
          {current.title}
        </h3>

        {/* Progress dots + external link */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 flex-1 max-w-[180px]">
            {items.slice(0, Math.min(8, items.length)).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                  i === currentIndex % 8 ? 'bg-white' : 'bg-white/30'
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
