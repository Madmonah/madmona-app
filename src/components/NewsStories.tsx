'use client'

import { useEffect, useRef, useState } from 'react'
import {
  X, ExternalLink, Newspaper, ShieldCheck, DollarSign, Home, Car,
  Briefcase, Plane, Sparkles, Camera,
} from 'lucide-react'

// ============================================================================
// NewsStories — عرض الأخبار بنظام «ستوري» (زي إنستجرام/واتساب) — للموبايل فقط.
// شريط دواير فوق + عارض ملء الشاشة: شرائط تقدّم، تبديل تلقائي، لمس يمين/شمال.
// الديسكتوب بيشوف عرض الماجازين (CompactNewsTabs) بدلاً منه.
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

const TABS: { id: Tab; label: string; icon: typeof Newspaper; accent: string }[] = [
  { id: 'madmona',     label: 'مضمونة',    icon: ShieldCheck, accent: '#FA8125' },
  { id: 'economy',     label: 'اقتصاد',    icon: DollarSign,  accent: '#10b981' },
  { id: 'real_estate', label: 'عقارات',    icon: Home,        accent: '#FA8125' },
  { id: 'automotive',  label: 'سيارات',    icon: Car,         accent: '#3b82f6' },
  { id: 'business',    label: 'أعمال',     icon: Briefcase,   accent: '#2FA084' },
  { id: 'tourism',     label: 'سياحة',     icon: Plane,       accent: '#06b6d4' },
  { id: 'fashion',     label: 'موضة',      icon: Sparkles,    accent: '#ec4899' },
  { id: 'tech',        label: 'تكنولوجيا', icon: Camera,      accent: '#a855f7' },
]

const STORY_MS = 6000
const MAX_STORIES = 6

export default function NewsStories() {
  const [cache, setCache] = useState<Partial<Record<Tab, NewsItem[]>>>({})
  const [openTab, setOpenTab] = useState<Tab | null>(null)
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [loadingTab, setLoadingTab] = useState<Tab | null>(null)
  const fetchingRef = useRef<Set<Tab>>(new Set())

  const fetchTab = async (tab: Tab): Promise<NewsItem[]> => {
    if (cache[tab]) return cache[tab] as NewsItem[]
    if (fetchingRef.current.has(tab)) return []
    fetchingRef.current.add(tab)
    try {
      const res = await fetch(`/api/news-feed?category=${tab}&_=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      const items: NewsItem[] = data?.ok && Array.isArray(data.items) ? data.items.slice(0, MAX_STORIES) : []
      setCache(prev => ({ ...prev, [tab]: items }))
      return items
    } catch {
      return []
    } finally {
      fetchingRef.current.delete(tab)
    }
  }

  const openStory = async (tab: Tab) => {
    setLoadingTab(tab)
    const items = await fetchTab(tab)
    setLoadingTab(null)
    if (items.length === 0) return
    setIdx(0)
    setProgress(0)
    setOpenTab(tab)
  }

  const close = () => { setOpenTab(null); setIdx(0); setProgress(0) }

  // نجيب كل التصنيفات أول ما يفتح الكومبوننت — عشان الصور والعناوين تبان تحت الدواير
  useEffect(() => {
    TABS.forEach((tt) => { void fetchTab(tt.id) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stories: NewsItem[] = openTab ? (cache[openTab] || []) : []
  const current = stories[idx]
  const activeCfg = openTab ? TABS.find((tt) => tt.id === openTab)! : null

  const goNext = () => {
    if (idx + 1 >= stories.length) close()
    else { setIdx(idx + 1); setProgress(0) }
  }
  const goPrev = () => { setIdx(Math.max(0, idx - 1)); setProgress(0) }

  // Auto-advance + progress (time-based, resets each story)
  useEffect(() => {
    if (!openTab || !current) return
    setProgress(0)
    const startAt = Date.now()
    const iv = setInterval(() => {
      const p = Math.min(100, ((Date.now() - startAt) / STORY_MS) * 100)
      setProgress(p)
      if (p >= 100) {
        clearInterval(iv)
        if (idx + 1 >= stories.length) setOpenTab(null)
        else setIdx(idx + 1)
      }
    }, 50)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTab, idx])

  // Lock page scroll while the viewer is open
  useEffect(() => {
    if (!openTab) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [openTab])

  // Close on back button / Escape
  useEffect(() => {
    if (!openTab) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openTab])

  return (
    <div className="md:hidden">
      {/* عنوان صغير للأخبار */}
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-sm font-black text-gray-900">أخبار مضمونة</span>
        <span className="text-[10px] font-bold text-[#FA8125] bg-[#FA8125]/10 px-2 py-0.5 rounded-full">LIVE</span>
      </div>

      {/* شريط ستوري بشكل فيسبوك — كروت مستطيلة طويلة */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 px-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const cover = cache[tab.id]?.[0]?.image
          const headline = cache[tab.id]?.[0]?.title
          const isLoading = loadingTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => openStory(tab.id)}
              type="button"
              className="relative flex-shrink-0 w-[116px] h-[190px] rounded-2xl overflow-hidden shadow-soft active:scale-95 transition-transform"
            >
              {/* الخلفية: صورة الخبر أو جرادينت الفئة */}
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={tab.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(160deg, ${tab.accent}, #12211c)` }}>
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon className="w-8 h-8 text-white/80" />
                  )}
                </span>
              )}
              {/* تدرّج للقراءة */}
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/25" />
              {/* أفاتار التصنيف فوق (بلون الفئة زي فيسبوك) */}
              <span className="absolute top-2 right-2 w-9 h-9 rounded-full p-[2.5px] flex items-center justify-center" style={{ background: tab.accent }}>
                <span className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Icon className="w-4 h-4" style={{ color: tab.accent }} />
                </span>
              </span>
              {/* العنوان + التصنيف تحت */}
              <span className="absolute inset-x-0 bottom-0 p-2 text-right">
                <span className="block text-white text-[11px] font-black leading-tight line-clamp-2 drop-shadow">
                  {headline || tab.label}
                </span>
                <span className="block text-white/70 text-[9px] font-bold mt-0.5">{tab.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* عارض ملء الشاشة */}
      {openTab && current && activeCfg && (
        <div className="fixed inset-0 z-[120] bg-black select-none" dir="rtl">
          {/* شرائط التقدّم */}
          <div className="absolute top-0 inset-x-0 z-30 flex gap-1 p-2 pt-3">
            {stories.map((_, i) => (
              <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%',
                    transition: i === idx ? 'width 50ms linear' : 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* الهيدر */}
          <div className="absolute top-5 inset-x-0 z-30 flex items-center justify-between px-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: activeCfg.accent }}>
                <activeCfg.icon className="w-3.5 h-3.5 text-white" />
              </span>
              <span className="text-white text-xs font-black">{activeCfg.label}</span>
              <span className="text-white/60 text-[10px]">{formatTime(current.pubDate)}</span>
            </div>
            <button onClick={close} type="button" aria-label="إغلاق" className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* الصورة */}
          <div className="absolute inset-0">
            {current.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.image} alt={current.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${activeCfg.accent}, #111)` }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/45" />
          </div>

          {/* مناطق اللمس للتنقّل */}
          <button aria-label="السابق" onClick={goPrev} type="button" className="absolute top-16 bottom-32 right-0 w-1/3 z-20" />
          <button aria-label="التالي" onClick={goNext} type="button" className="absolute top-16 bottom-32 left-0 w-1/3 z-20" />

          {/* المحتوى */}
          <div className="absolute inset-x-0 bottom-0 z-30 p-5 pb-9">
            <div className="flex items-center gap-2 mb-2">
              {current.isEgyptian && <span className="text-[10px] font-bold bg-white/15 text-white px-2 py-0.5 rounded-full">🇪🇬 مصر</span>}
              <span className="text-[11px] text-white/70 font-bold truncate">{current.source}</span>
            </div>
            <h3 className="text-white text-xl font-black leading-snug mb-4 line-clamp-4 drop-shadow">{current.title}</h3>
            <a
              href={current.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-black text-sm px-5 py-3 rounded-full no-underline active:scale-95 transition-transform"
            >
              اقرأ الخبر كامل <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(pubDate: string): string {
  try {
    const date = new Date(pubDate)
    const diffMs = Date.now() - date.getTime()
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
