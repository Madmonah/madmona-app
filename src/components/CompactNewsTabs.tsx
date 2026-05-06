'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Trophy, Sparkles, TrendingUp, ExternalLink, MapPin, RefreshCw, Newspaper,
  DollarSign, Shield, Building2, ChevronLeft, ChevronRight, Pause, Play, Clock,
} from 'lucide-react'

// ============================================================================
// CompactNewsTabs (now: NewsHub)
//
// 7 tabs for different news categories. Active tab shows:
//   - 1 large featured news (auto-rotating every 5s, like EconomicNewsHero used to)
//   - 3 small horizontal cards below
// Auto-refreshes from /api/news-feed every 3 minutes per active tab.
// All tabs rotate items dynamically when user picks one.
// ============================================================================

type Tab = 'economy' | 'interior' | 'locals' | 'defense' | 'sports' | 'fashion' | 'trending'

interface NewsItem {
  title: string
  link: string
  image: string
  source: string
  pubDate: string
  isEgyptian: boolean
  category: string
}

interface ApiResponse {
  ok: boolean
  category: string
  items: NewsItem[]
  count: number
  pool_age_seconds?: number
}

const TABS: { id: Tab; label: string; icon: typeof Trophy; color: string }[] = [
  { id: 'economy',  label: 'اقتصاد',   icon: DollarSign, color: 'text-emerald-700' },
  { id: 'interior', label: 'داخلية',   icon: Shield,     color: 'text-blue-700' },
  { id: 'locals',   label: 'محليات',   icon: Building2,  color: 'text-amber-700' },
  { id: 'defense',  label: 'دفاع',     icon: Shield,     color: 'text-slate-700' },
  { id: 'sports',   label: 'رياضة',    icon: Trophy,     color: 'text-rose-700' },
  { id: 'fashion',  label: 'موضة',     icon: Sparkles,   color: 'text-pink-700' },
  { id: 'trending', label: 'ترند',     icon: TrendingUp, color: 'text-purple-700' },
]

const REFRESH_INTERVAL = 3 * 60 * 1000  // 3 minutes
const ROTATION_MS = 5000                 // 5s per featured news rotation

export default function CompactNewsTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('economy')
  const [items, setItems] = useState<Record<Tab, NewsItem[]>>({
    economy: [], interior: [], locals: [], defense: [],
    sports: [], fashion: [], trending: [],
  })
  const [loading, setLoading] = useState<Record<Tab, boolean>>({
    economy: true, interior: false, locals: false, defense: false,
    sports: false, fashion: false, trending: false,
  })
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const fetchingRef = useRef<Set<Tab>>(new Set())

  const fetchTab = async (tab: Tab) => {
    if (fetchingRef.current.has(tab)) return
    fetchingRef.current.add(tab)
    setLoading(prev => ({ ...prev, [tab]: true }))
    try {
      const cacheBust = `?t=${Date.now()}`
      const res = await fetch(`/api/news-feed?category=${tab}&_=${cacheBust}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      })
      const data: ApiResponse = await res.json()
      if (data.ok && data.items.length > 0) {
        setItems(prev => ({ ...prev, [tab]: data.items }))
      }
    } catch {
      // silent
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }))
      fetchingRef.current.delete(tab)
    }
  }

  // Fetch when tab changes (and reset rotation)
  useEffect(() => {
    if (items[activeTab].length === 0) {
      fetchTab(activeTab)
    }
    setFeaturedIndex(0)
    setImgLoaded(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Auto-refresh every 3 min for active tab
  useEffect(() => {
    const timer = setInterval(() => {
      fetchTab(activeTab)
    }, REFRESH_INTERVAL)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Auto-rotate featured news every 5s within active tab
  useEffect(() => {
    const tabItems = items[activeTab]
    if (tabItems.length <= 1 || paused) return
    const t = setInterval(() => {
      setImgLoaded(false)
      setFeaturedIndex(prev => (prev + 1) % tabItems.length)
    }, ROTATION_MS)
    return () => clearInterval(t)
  }, [items, activeTab, paused])

  const tabItems = items[activeTab]
  const featured = tabItems[featuredIndex]
  const sideItems = tabItems.filter((_, i) => i !== featuredIndex).slice(0, 3)
  const isLoading = loading[activeTab] && tabItems.length === 0
  const activeTabConfig = TABS.find(t => t.id === activeTab)!

  const handleNext = () => {
    if (tabItems.length <= 1) return
    setImgLoaded(false)
    setFeaturedIndex(prev => (prev + 1) % tabItems.length)
  }

  const handlePrevious = () => {
    if (tabItems.length <= 1) return
    setImgLoaded(false)
    setFeaturedIndex(prev => (prev - 1 + tabItems.length) % tabItems.length)
  }

  return (
    <div className="bg-white rounded-3xl shadow-luxe overflow-hidden border border-gray-100">
      {/* Header with live indicator */}
      <div className="bg-gradient-to-l from-[#1F5F3F] to-[#2d7a52] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-white" />
          <span className="text-sm font-black text-white tracking-wider">آخر الأخبار</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/90">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
          </span>
          <span className="text-[10px] font-bold tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Tabs - horizontally scrollable */}
      <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-[#1F5F3F] shadow-soft'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : ''}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content area */}
      {isLoading ? (
        <div className="p-12 text-center">
          <RefreshCw className="w-6 h-6 mx-auto text-gray-300 animate-spin" />
          <p className="text-xs text-gray-400 mt-3">جاري التحميل...</p>
        </div>
      ) : !featured ? (
        <div className="p-12 text-center text-xs text-gray-400">
          مفيش أخبار دلوقتي في {activeTabConfig.label}
        </div>
      ) : (
        <>
          {/* Featured news (large with rotation) */}
          <a
            href={featured.link}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block aspect-[16/9] overflow-hidden no-underline group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${featured.link}-${featuredIndex}`}
              src={featured.image}
              alt={featured.title}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              } group-hover:scale-110`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Rotation controls */}
            {tabItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handlePrevious() }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleNext() }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setPaused(p => !p) }}
                  className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  title={paused ? 'تشغيل' : 'إيقاف'}
                >
                  {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
              </>
            )}

            {/* Counter + Egypt flag */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">
              {featured.isEgyptian && <span className="leading-none">🇪🇬</span>}
              <span>{featuredIndex + 1} / {tabItems.length}</span>
            </div>

            {/* Title + source */}
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className={`inline-flex items-center gap-1 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full mb-2 ${
                featured.isEgyptian
                  ? 'bg-[#B8860B] text-white'
                  : 'bg-white/90 text-gray-900'
              }`}>
                {featured.isEgyptian && <MapPin className="w-2.5 h-2.5" />}
                {featured.source}
              </div>
              <h3 className="text-sm font-black text-white leading-snug line-clamp-2 drop-shadow-lg" dir="rtl">
                {featured.title}
              </h3>
            </div>

            {/* Progress dots */}
            <div className="absolute top-3 right-3 flex gap-0.5">
              {Array.from({ length: Math.min(tabItems.length, 8) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 w-3 rounded-full transition-all duration-500 ${
                    i === Math.min(featuredIndex, 7) ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </a>

          {/* Side items (smaller cards) */}
          {sideItems.length > 0 && (
            <div className="divide-y divide-gray-100">
              {sideItems.map((item, i) => (
                <a
                  key={`${activeTab}-${item.link}-${i}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors no-underline"
                >
                  <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    {item.isEgyptian && (
                      <div className="absolute top-0.5 right-0.5 text-[10px] leading-none">🇪🇬</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 mb-1 group-hover:text-[#1F5F3F] transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-gray-500 truncate">{item.source}</span>
                      <span className="text-[9px] text-gray-400 flex-shrink-0">{formatTime(item.pubDate)}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-[#1F5F3F] flex-shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          )}

          {/* Footer with refresh time */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              يتجدد كل ٣ دقايق
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {tabItems.length} خبر
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function formatTime(pubDate: string): string {
  try {
    const date = new Date(pubDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'دلوقتي'
    if (diffMin < 60) return `${diffMin}د`
    if (diffHr < 24) return `${diffHr}س`
    if (diffDay < 7) return `${diffDay}ي`
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}
