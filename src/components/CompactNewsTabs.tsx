'use client'

import { useEffect, useState } from 'react'
import { Trophy, Sparkles, TrendingUp, ExternalLink, MapPin, RefreshCw, Newspaper } from 'lucide-react'

// ============================================================================
// CompactNewsTabs
//
// Compact version of news tabs to fit beside EconomicNewsHero in the hero area.
// Tabs at top, 4 small horizontal cards below.
// Auto-refreshes every 3 minutes.
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

const TABS: { id: Tab; label: string; icon: typeof Trophy }[] = [
  { id: 'sports', label: 'رياضة', icon: Trophy },
  { id: 'fashion', label: 'موضة', icon: Sparkles },
  { id: 'trending', label: 'ترند', icon: TrendingUp },
]

const REFRESH_INTERVAL = 3 * 60 * 1000

export default function CompactNewsTabs() {
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

  const fetchTab = async (tab: Tab) => {
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
    }
  }

  useEffect(() => {
    if (items[activeTab].length === 0) {
      fetchTab(activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    const timer = setInterval(() => {
      fetchTab(activeTab)
    }, REFRESH_INTERVAL)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const currentItems = items[activeTab].slice(0, 4)
  const isLoading = loading[activeTab]

  return (
    <div className="bg-white rounded-3xl shadow-luxe overflow-hidden border border-gray-100">
      {/* Header with live indicator */}
      <div className="bg-gradient-to-l from-[#1F5F3F] to-[#2d7a52] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-3.5 h-3.5 text-white" />
          <span className="text-[11px] font-black text-white tracking-widest">آخر الأخبار</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
          </span>
          <span className="text-[10px] font-bold">LIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-100">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-[#1F5F3F] shadow-soft'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* News list */}
      <div className="divide-y divide-gray-100">
        {isLoading && currentItems.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-5 h-5 mx-auto text-gray-300 animate-spin" />
          </div>
        ) : currentItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            مفيش أخبار دلوقتي
          </div>
        ) : (
          currentItems.map((item, i) => (
            <a
              key={`${activeTab}-${i}-${item.link}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors no-underline"
            >
              {/* Image */}
              <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                {item.isEgyptian && (
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/90 flex items-center justify-center shadow-card">
                    <MapPin className="w-2.5 h-2.5 text-[#B8860B]" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 mb-1 group-hover:text-[#1F5F3F] transition-colors">
                  {item.title}
                </h4>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-500 truncate">{item.source}</span>
                  <span className="text-[9px] text-gray-400 flex-shrink-0">{formatTime(item.pubDate)}</span>
                </div>
              </div>

              {/* Arrow */}
              <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-[#1F5F3F] flex-shrink-0 transition-colors" />
            </a>
          ))
        )}
      </div>
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
