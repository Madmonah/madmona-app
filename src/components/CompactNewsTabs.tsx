'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Newspaper, RefreshCw, ShieldCheck, DollarSign, Home, Car,
  Briefcase, Plane, Sparkles, Camera, Clock,
} from 'lucide-react'

// ============================================================================
// CompactNewsTabs — Top-story-per-section grid (redesigned 11 Aug 2026)
//
// (11 أغسطس 2026) بدل الكاروسيل الكبير بتاب واحد نشط، دلوقتي بيعرض أهم خبر
// واحد بس من كل قسم من الـ8 أقسام في شبكة — ذي ديزاين الترباوية. يفضل الريفريش
// كل 3 دقايق. الكود القديم (تابات + مميّز دوّار) متسيب تحت غير مستخدم لو
// حبينا نرجعله.
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
  { id: 'madmona',     label: 'أخبار مضمونة', icon: ShieldCheck, accent: '#FA8125' },
  { id: 'economy',     label: 'اقتصاد',       icon: DollarSign,  accent: '#10b981' },
  { id: 'real_estate', label: 'عقارات',       icon: Home,        accent: '#FA8125' },
  { id: 'automotive',  label: 'سيارات',       icon: Car,         accent: '#3b82f6' },
  { id: 'business',    label: 'أعمال',        icon: Briefcase,   accent: '#2FA084' },
  { id: 'tourism',     label: 'سياحة',        icon: Plane,       accent: '#06b6d4' },
  { id: 'fashion',     label: 'موضة وأعراس',  icon: Sparkles,    accent: '#ec4899' },
  { id: 'tech',        label: 'تكنولوجيا',    icon: Camera,      accent: '#a855f7' },
]

const REFRESH_INTERVAL = 3 * 60 * 1000   // 3 minutes

export default function CompactNewsTabs() {
  // (11 أغسطس 2026) أهم خبر واحد بس لكل قسم — مفيش تابات ولا كاروسيل تاني
  const [topByTab, setTopByTab] = useState<Partial<Record<Tab, NewsItem>>>({})
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  const fetchAll = async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const results = await Promise.all(
        TABS.map(async t => {
          try {
            const res = await fetch(`/api/news-feed?category=${t.id}&_=${Date.now()}`, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache, no-store' },
            })
            const data: ApiResponse = await res.json()
            return [t.id, data.ok && data.items.length > 0 ? data.items[0] : undefined] as const
          } catch {
            return [t.id, undefined] as const
          }
        })
      )
      setTopByTab(Object.fromEntries(results.filter(([, v]) => !!v)) as Partial<Record<Tab, NewsItem>>)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, REFRESH_INTERVAL)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cards = TABS.map(t => ({ tab: t, item: topByTab[t.id] })).filter(c => !!c.item)

  return (
    <div className="bg-white rounded-3xl shadow-elevated overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#FA8125] via-[#268a70] to-[#FA8125] px-4 md:px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-black text-white tracking-wide">أخبار مضمونة</p>
            <p className="text-[10px] font-bold text-white/70 mt-0.5">أهم خبر في كل قسم · يتجدد كل ٣ دقايق</p>
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

      {/* Body — شبكة أهم خبر لكل قسم */}
      {loading && cards.length === 0 ? (
        <div className="p-16 text-center">
          <RefreshCw className="w-8 h-8 mx-auto text-gray-300 animate-spin" />
          <p className="text-sm text-gray-400 mt-4">جاري تحميل الأخبار...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="p-16 text-center">
          <Newspaper className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">مفيش أخبار دلوقتي</p>
          <button
            onClick={() => fetchAll()}
            className="mt-4 text-xs font-bold text-[#FA8125] hover:underline inline-flex items-center gap-1 mx-auto"
          >
            <RefreshCw className="w-3 h-3" /> حاول تاني
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100">
          {cards.map(({ tab, item }) => {
            const Icon = tab.icon
            return (
              <a
                key={tab.id}
                href={item!.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block no-underline overflow-hidden aspect-[4/3] bg-white"
              >
                <NewsImage src={item!.image} alt={item!.title} accent={tab.accent} big />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <span
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-white"
                  style={{ background: tab.accent }}
                >
                  <Icon className="w-3 h-3" /> {tab.label}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
                  <h3 className="text-white font-black text-sm md:text-base leading-snug line-clamp-3 drop-shadow">
                    {item!.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-white/85 text-[10px] font-bold">
                    <span className="truncate">{item!.source}</span>
                    <span className="opacity-50">·</span>
                    <span className="inline-flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" /> {formatTime(item!.pubDate)}
                    </span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {/* Footer */}
      {cards.length > 0 && (
        <div className="px-4 md:px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> يتجدد تلقائيًا كل ٣ دقايق
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span>{cards.length} قسم</span>
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
