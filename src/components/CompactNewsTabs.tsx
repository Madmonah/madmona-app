'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Newspaper, RefreshCw, ShieldCheck, DollarSign, Home, Car,
  Briefcase, Plane, Sparkles, Camera, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react'

// ============================================================================
// CompactNewsTabs — Magazine News Hub (redesigned 27 Jul 2026)
//
// Display: 1 large featured story (rotating) + a side column of headlines.
// 8 tabs aligned to Madmona verticals. Auto-refresh every 3 min, auto-rotate
// featured every 6s, auto-switch tabs every 9s (stops once user picks a tab).
// Broken/missing images fall back to a branded placeholder (never a blank box).
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

const TABS: { id: Tab; label: string; icon: typeof Newspaper; accent: string }[] = [
  { id: 'madmona',     label: 'أخبار مضمونة', icon: ShieldCheck, accent: '#1F6F5F' },
  { id: 'economy',     label: 'اقتصاد',       icon: DollarSign,  accent: '#10b981' },
  { id: 'real_estate', label: 'عقارات',       icon: Home,        accent: '#1F6F5F' },
  { id: 'automotive',  label: 'سيارات',       icon: Car,         accent: '#3b82f6' },
  { id: 'business',    label: 'أعمال',        icon: Briefcase,   accent: '#2FA084' },
  { id: 'tourism',     label: 'سياحة',        icon: Plane,       accent: '#06b6d4' },
  { id: 'fashion',     label: 'موضة وأعراس',  icon: Sparkles,    accent: '#ec4899' },
  { id: 'tech',        label: 'تكنولوجيا',    icon: Camera,      accent: '#a855f7' },
]

const REFRESH_INTERVAL = 3 * 60 * 1000   // 3 minutes
const ROTATION_MS = 6000                  // featured story rotation
const TAB_ROTATE_MS = 9000                // auto tab switch

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
  const [autoRotate, setAutoRotate] = useState(true)
  const fetchingRef = useRef<Set<Tab>>(new Set())

  const fetchTab = async (tab: Tab) => {
    if (fetchingRef.current.has(tab)) return
    fetchingRef.current.add(tab)
    setLoading(prev => ({ ...prev, [tab]: true }))
    try {
      const res = await fetch(`/api/news-feed?category=${tab}&_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      })
      const data: ApiResponse = await res.json()
      if (data.ok && data.items.length > 0) {
        setItems(prev => ({ ...prev, [tab]: data.items }))
      }
    } catch {
      /* silent */
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }))
      fetchingRef.current.delete(tab)
    }
  }

  useEffect(() => {
    if (items[activeTab].length === 0) fetchTab(activeTab)
    setFeaturedIndex(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    const timer = setInterval(() => fetchTab(activeTab), REFRESH_INTERVAL)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Rotate featured story within the active tab
  useEffect(() => {
    const tabItems = items[activeTab]
    if (tabItems.length <= 1 || paused) return
    const t = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % tabItems.length)
    }, ROTATION_MS)
    return () => clearInterval(t)
  }, [items, activeTab, paused])

  // Auto-switch tabs for movement — stops once the user picks a tab
  useEffect(() => {
    if (!autoRotate || paused) return
    const ids = TABS.map(tt => tt.id)
    const tt = setInterval(() => {
      setActiveTab(prev => ids[(ids.indexOf(prev) + 1) % ids.length])
    }, TAB_ROTATE_MS)
    return () => clearInterval(tt)
  }, [autoRotate, paused])

  const tabItems = items[activeTab]
  const isLoading = loading[activeTab] && tabItems.length === 0
  const activeCfg = TABS.find(t => t.id === activeTab)!
  const featured = tabItems[featuredIndex]
  // كل الأخبار تنزل ورا بعض (29 Jul 2026): نعرض كل الأخبار المتبقية مش 5 بس
  const sideItems = tabItems.length > 1
    ? Array.from({ length: tabItems.length - 1 }).map(
        (_, i) => tabItems[(featuredIndex + i + 1) % tabItems.length]
      )
    : []

  const selectTab = (id: Tab) => { setAutoRotate(false); setActiveTab(id) }
  const go = (dir: 1 | -1) => {
    if (tabItems.length <= 1) return
    setFeaturedIndex(prev => (prev + dir + tabItems.length) % tabItems.length)
  }

  return (
    <div
      className="bg-white rounded-3xl shadow-elevated overflow-hidden border border-gray-100"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1F6F5F] via-[#268a70] to-[#1F6F5F] px-4 md:px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-black text-white tracking-wide">أخبار مضمونة</p>
            <p className="text-[10px] font-bold text-white/70 mt-0.5">كل جديد في مجالك · يتجدد كل ٣ دقايق</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-full flex-shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          <span className="text-[10px] font-black text-white tracking-widest">LIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-100 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-800 hover:bg-white/70'
              }`}
              style={isActive ? { boxShadow: `inset 0 -2px 0 ${tab.accent}` } : undefined}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: isActive ? tab.accent : undefined }} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="p-16 text-center">
          <RefreshCw className="w-8 h-8 mx-auto text-gray-300 animate-spin" />
          <p className="text-sm text-gray-400 mt-4">جاري تحميل الأخبار...</p>
        </div>
      ) : !featured ? (
        <div className="p-16 text-center">
          <Newspaper className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">مفيش أخبار دلوقتي في {activeCfg.label}</p>
          <button
            onClick={() => fetchTab(activeTab)}
            className="mt-4 text-xs font-bold text-[#1F6F5F] hover:underline inline-flex items-center gap-1 mx-auto"
          >
            <RefreshCw className="w-3 h-3" /> حاول تاني
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Featured — large (full width) */}
          <a
            href={featured.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block no-underline overflow-hidden aspect-[16/10] md:aspect-[21/9]"
          >
            <NewsImage src={featured.image} alt={featured.title} accent={activeCfg.accent} big />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-white"
                style={{ background: activeCfg.accent }}
              >
                <activeCfg.icon className="w-3 h-3" /> {activeCfg.label}
              </span>
              {featured.isEgyptian && (
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-black/50 backdrop-blur text-white">🇪🇬 مصر</span>
              )}
            </div>
            {tabItems.length > 1 && (
              <div className="absolute top-3 left-3 flex items-center gap-1">
                <button
                  onClick={(e) => { e.preventDefault(); go(-1) }}
                  aria-label="السابق"
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); go(1) }}
                  aria-label="التالي"
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
              <h3 className="text-white font-black text-lg md:text-2xl leading-snug line-clamp-3 drop-shadow">
                {featured.title}
              </h3>
              <div className="flex items-center gap-2 mt-2.5 text-white/85 text-[11px] font-bold">
                <span className="truncate">{featured.source}</span>
                <span className="opacity-50">·</span>
                <span className="inline-flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" /> {formatTime(featured.pubDate)}
                </span>
              </div>
            </div>
          </a>

          {/* كل الأخبار ورا بعض — قايمة رأسية بعرض الكارت */}
          <div className="divide-y divide-gray-100 border-t border-gray-100 max-h-[420px] overflow-y-auto">
            {sideItems.map((item, i) => (
              <a
                key={`${activeTab}-${item.link}-${i}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors no-underline"
              >
                <div className="relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  <NewsImage src={item.image} alt={item.title} accent={activeCfg.accent} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs md:text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#1F6F5F] transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                    <span className="truncate">{item.source}</span>
                    <span className="flex-shrink-0">·</span>
                    <span className="flex-shrink-0">{formatTime(item.pubDate)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {featured && (
        <div className="px-4 md:px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> يتجدد تلقائيًا كل ٣ دقايق
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span>{tabItems.length} خبر</span>
            <span className="opacity-50">·</span>
            <span>{TABS.length} تصنيف</span>
          </span>
        </div>
      )}
    </div>
  )
}

// Image with a branded fallback — a broken/empty image never leaves a blank box.
function NewsImage({ src, alt, accent, big = false }: { src: string; alt: string; accent: string; big?: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])

  if (!src || failed) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${accent}26, ${accent}0d)` }}
      >
        <Newspaper className={big ? 'w-12 h-12' : 'w-6 h-6'} style={{ color: accent, opacity: 0.5 }} />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
    />
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
