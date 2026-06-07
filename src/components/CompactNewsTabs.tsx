'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Trophy, Sparkles, TrendingUp, ExternalLink, MapPin, RefreshCw, Newspaper,
  DollarSign, Home, Car, Briefcase, Plane, Camera, ChevronLeft, ChevronRight,
  Pause, Play, Clock, ShieldCheck,
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

type Tab = 'madmona' | 'economy' | 'real_estate' | 'automotive' | 'business' | 'tourism' | 'fashion' | 'tech'

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
  { id: 'madmona',     label: 'أخبار مضمونة', icon: ShieldCheck, accent: '#1F6F5F' },
  { id: 'economy',     label: 'اقتصاد',    icon: DollarSign, accent: '#10b981' },
  { id: 'real_estate', label: 'عقارات',    icon: Home,       accent: '#1F6F5F' },
  { id: 'automotive',  label: 'سيارات',    icon: Car,        accent: '#3b82f6' },
  { id: 'business',    label: 'أعمال',     icon: Briefcase,  accent: '#2FA084' },
  { id: 'tourism',     label: 'سياحة',     icon: Plane,      accent: '#06b6d4' },
  { id: 'fashion',     label: 'موضة وأعراس', icon: Sparkles,   accent: '#ec4899' },
  { id: 'tech',        label: 'تكنولوجيا', icon: Camera,     accent: '#a855f7' },
]

const REFRESH_INTERVAL = 3 * 60 * 1000   // 3 minutes
const ROTATION_MS = 5000                  // 5s per featured news

export default function CompactNewsTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('madmona')
  const [items, setItems] = useState<Record<Tab, NewsItem[]>>({
    madmona: [], economy: [], real_estate: [], automotive: [], business: [],
    tourism: [], fashion: [], tech: [],
  })
  const [loading, setLoading] = useState<Record<Tab, boolean>>({
    madmona: true, economy: false, real_estate: false, automotive: false, business: false,
    tourism: false, fashion: false, tech: false,
  })
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)

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

  // تبديل التابات أوتوماتيك (حركة) — يوقف لو المستخدم اختار تاب بنفسه
  useEffect(() => {
    if (!autoRotate) return
    const ids = TABS.map(tt => tt.id)
    const tt = setInterval(() => {
      setActiveTab(prev => ids[(ids.indexOf(prev) + 1) % ids.length])
    }, 8000)
    return () => clearInterval(tt)
  }, [autoRotate])

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
      <div className="bg-gradient-to-l from-[#1F6F5F] via-[#2d7a52] to-[#1F6F5F] px-5 py-3 flex items-center justify-between">
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
              onClick={() => { setAutoRotate(false); setActiveTab(tab.id) }}
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
            className="mt-4 text-xs font-bold text-[#1F6F5F] hover:underline flex items-center gap-1 mx-auto"
          >
            <RefreshCw className="w-3 h-3" /> حاول تاني
          </button>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {tabItems.slice(0, 4).map((item, i) => (
            <a
              key={`${activeTab}-${item.link}-${i}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block no-underline"
            >
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {item.isEgyptian && (
                  <div className="absolute top-1.5 right-1.5 text-[10px] leading-none bg-black/60 backdrop-blur-md text-white px-1.5 py-0.5 rounded">🇪🇬</div>
                )}
              </div>
              <h4 className="text-xs md:text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#1F6F5F] transition-colors">
                {item.title}
              </h4>
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="text-[10px] text-gray-500 truncate">{item.source}</span>
                <span className="text-[9px] text-gray-400 flex-shrink-0">{formatTime(item.pubDate)}</span>
              </div>
            </a>
          ))}
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
