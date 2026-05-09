'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Trophy, Sparkles, TrendingUp, ExternalLink, MapPin, RefreshCw, Newspaper,
  DollarSign, Home, Car, Briefcase, Plane, Camera, ChevronLeft, ChevronRight,
  Pause, Play, Clock,
} from 'lucide-react'

// ============================================================================
// CompactNewsTabs (Magazine-style News Hub)
//
// Layout: 1 large featured (rotating, 5s) + 4 smaller cards beside it.
// 7 tabs aligned to Madmona main categories:
//   - economy:     universal
//   - real_estate: matches "عقارات للإيجار"
//   - automotive:  matches "مركبات ونقل"
//   - business:    matches "مساحات عمل"
//   - tourism:     matches "ترفيه + مركبات بحرية"
//   - fashion:     matches "أعراس وتجهيزات"
//   - tech:        matches "معدات ميديا"
// Auto-refresh from API every 3 min. Auto-rotate within tab every 5s.
// ============================================================================

type Tab = 'economy' | 'real_estate' | 'automotive' | 'business' | 'tourism' | 'fashion' | 'tech'

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
}

const TABS: { id: Tab; label: string; icon: typeof Trophy; accent: string }[] = [
  { id: 'economy',     label: 'اقتصاد',    icon: DollarSign, accent: '#10b981' },
  { id: 'real_estate', label: 'عقارات',    icon: Home,       accent: '#1F5F3F' },
  { id: 'automotive',  label: 'سيارات',    icon: Car,        accent: '#3b82f6' },
  { id: 'business',    label: 'أعمال',     icon: Briefcase,  accent: '#B8860B' },
  { id: 'tourism',     label: 'سياحة',     icon: Plane,      accent: '#06b6d4' },
  { id: 'fashion',     label: 'موضة وأعراس', icon: Sparkles,   accent: '#ec4899' },
  { id: 'tech',        label: 'تكنولوجيا', icon: Camera,     accent: '#a855f7' },
]

const REFRESH_INTERVAL = 3 * 60 * 1000   // 3 minutes
const ROTATION_MS = 5000                  // 5s per featured news

export default function CompactNewsTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('economy')
  const [items, setItems] = useState<Record<Tab, NewsItem[]>>({
    economy: [], real_estate: [], automotive: [], business: [],
    tourism: [], fashion: [], tech: [],
  })
  const [loading, setLoading] = useState<Record<Tab, boolean>>({
    economy: true, real_estate: false, automotive: false, business: false,
    tourism: false, fashion: false, tech: false,
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

  useEffect(() => {
    if (items[activeTab].length === 0) {
      fetchTab(activeTab)
    }
    setFeaturedIndex(0)
    setImgLoaded(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    const timer = setInterval(() => {
      fetchTab(activeTab)
    }, REFRESH_INTERVAL)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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
  // Side cards: next 4 items after featured (wrapping around)
  const sideItems = tabItems.length > 1
    ? Array.from({ length: Math.min(4, tabItems.length - 1) }).map((_, i) => {
        const idx = (featuredIndex + i + 1) % tabItems.length
        return tabItems[idx]
      })
    : []
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
    <div className="bg-white rounded-3xl shadow-elevated overflow-hidden border border-gray-100">
      {/* Header strip */}
      <div className="bg-gradient-to-l from-[#1F5F3F] via-[#2d7a52] to-[#1F5F3F] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Newspaper className="w-4 h-4 text-white" />
          <span className="text-sm font-black text-white tracking-wider">آخر الأخبار</span>
          <span className="text-[10px] font-bold text-white/70 hidden sm:inline">· يتجدد كل ٣ دقايق</span>
        </div>
        <div className="flex items-center gap-1.5 bg-red-600/90 backdrop-blur px-2.5 py-1 rounded-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          <span className="text-[10px] font-black text-white tracking-wider">LIVE</span>
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
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-gray-900 shadow-card'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
              }`}
              style={isActive ? { borderBottom: `2px solid ${tab.accent}` } : undefined}
            >
              <Icon
                className="w-3.5 h-3.5"
                style={{ color: isActive ? tab.accent : undefined }}
              />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-16 text-center">
          <RefreshCw className="w-8 h-8 mx-auto text-gray-300 animate-spin" />
          <p className="text-sm text-gray-400 mt-4">جاري التحميل...</p>
        </div>
      ) : !featured ? (
        <div className="p-16 text-center">
          <Newspaper className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">مفيش أخبار دلوقتي في {activeTabConfig.label}</p>
          <button
            onClick={() => fetchTab(activeTab)}
            className="mt-4 text-xs font-bold text-[#1F5F3F] hover:underline flex items-center gap-1 mx-auto"
          >
            <RefreshCw className="w-3 h-3" /> حاول تاني
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* LEFT: Big featured news (rotating) */}
          <a
            href={featured.link}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block aspect-[16/10] lg:aspect-auto lg:min-h-[400px] overflow-hidden no-underline group"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

            {/* Top: counter + Egypt flag */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                {featured.isEgyptian && <span className="leading-none">🇪🇬</span>}
                <span>{featuredIndex + 1} / {tabItems.length}</span>
              </div>
            </div>

            {/* Top: Active category badge */}
            <div
              className="absolute top-4 right-4 flex items-center gap-1.5 backdrop-blur-md text-white text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{ backgroundColor: `${activeTabConfig.accent}cc` }}
            >
              <activeTabConfig.icon className="w-3 h-3" />
              {activeTabConfig.label}
            </div>

            {/* Side controls */}
            {tabItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handlePrevious() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 hover:bg-white/35 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  aria-label="السابق"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleNext() }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 hover:bg-white/35 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  aria-label="التالي"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setPaused(p => !p) }}
                  className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/35 backdrop-blur-md text-white flex items-center justify-center transition-all"
                  aria-label={paused ? 'تشغيل' : 'إيقاف'}
                >
                  {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </>
            )}

            {/* Bottom: title + source */}
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
              <div className={`inline-flex items-center gap-1 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full mb-3 ${
                featured.isEgyptian
                  ? 'bg-[#B8860B] text-white'
                  : 'bg-white/95 text-gray-900'
              }`}>
                {featured.isEgyptian && <MapPin className="w-2.5 h-2.5" />}
                {featured.source}
              </div>
              <h3 className="text-base md:text-xl font-black text-white leading-snug line-clamp-3 drop-shadow-lg mb-3" dir="rtl">
                {featured.title}
              </h3>

              {/* Progress dots */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(tabItems.length, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-0.5 w-6 rounded-full transition-all duration-500 ${
                      i === Math.min(featuredIndex, 7) ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </a>

          {/* RIGHT: 4 smaller cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-4 divide-y divide-gray-100 lg:divide-y border-t lg:border-t-0 lg:border-r border-gray-100">
            {sideItems.map((item, i) => (
              <a
                key={`${activeTab}-${item.link}-${i}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-stretch gap-3 p-3 hover:bg-gray-50 transition-colors no-underline border-b lg:border-b-0 sm:border-b-0 sm:[&:nth-child(1)]:border-r sm:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(1)]:border-r-0 lg:[&:nth-child(2)]:border-r-0"
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  {item.isEgyptian && (
                    <div className="absolute top-1 right-1 text-xs leading-none bg-black/40 px-1 rounded">🇪🇬</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#1F5F3F] transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <span className="text-[10px] text-gray-500 truncate">{item.source}</span>
                    <span className="text-[9px] text-gray-400 flex-shrink-0">{formatTime(item.pubDate)}</span>
                  </div>
                </div>
              </a>
            ))}
            {/* Fill empty space if fewer than 4 side items */}
            {Array.from({ length: Math.max(0, 4 - sideItems.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="hidden lg:block" />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {featured && (
        <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            يتجدد كل ٣ دقايق
          </span>
          <span className="flex items-center gap-1.5">
            <span>{tabItems.length} خبر</span>
            <span className="opacity-50">·</span>
            <span>{TABS.length} تصنيف</span>
          </span>
        </div>
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
