'use client'

import { useEffect, useState } from 'react'
import { Trophy, Sparkles, TrendingUp, Newspaper, ExternalLink, Clock, RefreshCw, MapPin } from 'lucide-react'

// ============================================================================
// NewsTabsSection
//
// Displays news in 3 separate tabs (Sports, Fashion, Trending) on the homepage.
// Each tab fetches from /api/news-feed?category=<tab>
// Auto-refreshes every 3 minutes per active tab.
// ============================================================================

type Tab = 'sports' | 'fashion' | 'trending'

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

const TABS: { id: Tab; label: string; icon: typeof Trophy; color: string; bg: string }[] = [
  { id: 'sports', label: 'رياضة', icon: Trophy, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { id: 'fashion', label: 'موضة', icon: Sparkles, color: 'text-pink-700', bg: 'bg-pink-50' },
  { id: 'trending', label: 'ترند', icon: TrendingUp, color: 'text-amber-700', bg: 'bg-amber-50' },
]

const REFRESH_INTERVAL = 3 * 60 * 1000  // 3 minutes

export default function NewsTabsSection() {
  const [activeTab, setActiveTab] = useState<Tab>('sports')
  const [items, setItems] = useState<Record<Tab, NewsItem[]>>({
    sports: [],
    fashion: [],
    trending: [],
  })
  const [loading, setLoading] = useState<Record<Tab, boolean>>({
    sports: true,
    fashion: false,
    trending: false,
  })
  const [errors, setErrors] = useState<Record<Tab, boolean>>({
    sports: false,
    fashion: false,
    trending: false,
  })

  const fetchTab = async (tab: Tab) => {
    setLoading(prev => ({ ...prev, [tab]: true }))
    setErrors(prev => ({ ...prev, [tab]: false }))
    try {
      const cacheBust = `?t=${Date.now()}`
      const res = await fetch(`/api/news-feed?category=${tab}&_=${cacheBust}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      })
      const data: ApiResponse = await res.json()
      if (data.ok && data.items.length > 0) {
        setItems(prev => ({ ...prev, [tab]: data.items }))
      } else {
        setErrors(prev => ({ ...prev, [tab]: true }))
      }
    } catch {
      setErrors(prev => ({ ...prev, [tab]: true }))
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }))
    }
  }

  // Load active tab on mount + when changed
  useEffect(() => {
    if (items[activeTab].length === 0) {
      fetchTab(activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Auto-refresh active tab every 3 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      fetchTab(activeTab)
    }, REFRESH_INTERVAL)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const currentItems = items[activeTab]
  const isLoading = loading[activeTab]
  const hasError = errors[activeTab]
  const activeTabConfig = TABS.find(t => t.id === activeTab)!

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-white to-[#FAFAF7]" dir="rtl">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 md:mb-10 flex-wrap gap-4">
          <div>
            <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#2FA084] mb-3">LIVE NEWS</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-[0.95]">
              <span className="block">آخر</span>
              <span className="block italic font-light gradient-text-green">الأخبار</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="font-bold">يتحدث كل 3 دقائق</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-[#1F6F5F] text-white shadow-elevated scale-105'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:shadow-card'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {items[tab.id].length > 0 && !isActive && (
                  <span className="text-[10px] bg-[#1F6F5F]/10 text-[#1F6F5F] px-1.5 py-0.5 rounded-full font-black">
                    {items[tab.id].length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Loading state */}
        {isLoading && currentItems.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-soft animate-pulse">
                <div className="aspect-[16/10] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {hasError && currentItems.length === 0 && (
          <div className="bg-white rounded-3xl shadow-soft p-12 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-black text-gray-900 mb-2">مش قادرين نجيب الأخبار دلوقتي</h3>
            <p className="text-sm text-gray-500 mb-4">جرّب تاني بعد شوية</p>
            <button
              onClick={() => fetchTab(activeTab)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1F6F5F] text-white rounded-full text-sm font-bold hover:shadow-elevated"
            >
              <RefreshCw className="w-4 h-4" />
              حاول تاني
            </button>
          </div>
        )}

        {/* News grid */}
        {currentItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentItems.slice(0, 6).map((item, i) => (
              <a
                key={`${activeTab}-${i}-${item.link}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-luxe hover:-translate-y-1 transition-all duration-500 no-underline animate-slide-up"
                style={{ animationDelay: `${Math.min(i * 60, 360)}ms` }}
              >
                {/* Image */}
                <div className="aspect-[16/10] bg-gray-100 relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Source badge */}
                  <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md shadow-card ${
                    item.isEgyptian
                      ? 'bg-gradient-to-l from-[#2FA084] to-[#D4A12A] text-white'
                      : 'bg-white/90 text-gray-800'
                  }`}>
                    {item.isEgyptian && <MapPin className="w-2.5 h-2.5" />}
                    <span>{item.source}</span>
                  </div>

                  {/* Category icon */}
                  <div className={`absolute bottom-3 left-3 w-8 h-8 rounded-full ${activeTabConfig.bg} backdrop-blur-md flex items-center justify-center shadow-card`}>
                    <activeTabConfig.icon className={`w-4 h-4 ${activeTabConfig.color}`} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 md:p-5">
                  <h3 className="font-black text-sm md:text-base text-gray-900 leading-snug line-clamp-3 mb-3 group-hover:text-[#1F6F5F] transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(item.pubDate)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#1F6F5F] font-bold group-hover:gap-2 transition-all">
                      اقرأ
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Refresh indicator (small) */}
        {isLoading && currentItems.length > 0 && (
          <div className="flex justify-center mt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-[11px] text-gray-500 shadow-soft">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>جاري التحديث...</span>
            </div>
          </div>
        )}
      </div>
    </section>
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
    if (diffMin < 60) return `من ${diffMin} د`
    if (diffHr < 24) return `من ${diffHr} س`
    if (diffDay < 7) return `من ${diffDay} يوم`
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}
