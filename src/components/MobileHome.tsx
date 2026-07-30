'use client'

// ============================================================================
// MobileHome — mobile-only home (design option "2a": مركّز + اسأل مارد مضمونة)
// Renders ONLY on mobile (parent gates with md:hidden). Desktop keeps the
// existing homepage untouched. Reuses category grouping (buildGroups /
// VERTICALS, same identity as CategoryTrackTabs), live FX/gold from
// /api/financial-data, and top news from /api/news-feed.
// Handoff: "Madmona Home Improvements" → option 2a (29 Jul 2026).
// ============================================================================

import { useState, useEffect, FormEvent, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Bell, Menu, X, ArrowLeft, User, LogIn, LogOut, Briefcase, Plus,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useT } from '@/lib/i18n/LanguageProvider'
import { DEVELOPER_DIRECTORY } from '@/lib/developer-directory'
import DownloadAppBig from '@/components/DownloadAppBig'

type Category = {
  id: string
  name_ar: string
  name_en: string | null
  slug: string
  icon: string | null
  image_url: string | null
  track: string | null
  group_slug?: string | null
  group_name_ar?: string | null
  group_emoji?: string | null
  group_display_order?: number | null
}

type VKey = 'products' | 'rentals' | 'services' | 'restaurants' | 'daily'

const VERTICALS: { key: VKey; ar: string; en: string; emoji: string; tracks: string[]; tone: string; accent: string }[] = [
  { key: 'products',    ar: 'بيع',        en: 'Buy',         emoji: '🏷️', tracks: ['products'],            tone: 'from-[#2C5F8D] to-[#5B9BD5]', accent: '#3D7BB6' },
  { key: 'rentals',     ar: 'إيجار',      en: 'Rent',        emoji: '🔑', tracks: ['rentals', 'hybrid'],   tone: 'from-[#1F6F5F] to-[#2FA084]', accent: '#1F6F5F' },
  { key: 'services',    ar: 'خدمات',      en: 'Services',    emoji: '🛠️', tracks: ['services'],            tone: 'from-[#8A6A0F] to-[#D4A017]', accent: '#B8860B' },
  { key: 'restaurants', ar: 'مطاعم',      en: 'Restaurants', emoji: '🍽️', tracks: ['restaurants'],         tone: 'from-[#B4453A] to-[#E26D5C]', accent: '#D24C3E' },
  { key: 'daily',       ar: 'سوبر ماركت', en: 'Groceries',   emoji: '🛒', tracks: ['daily'],               tone: 'from-[#5C3A7E] to-[#9B6FC4]', accent: '#7A4FA3' },
]

function trackToVkey(track: string | null): VKey {
  switch (track) {
    case 'rentals': case 'hybrid': return 'rentals'
    case 'services': return 'services'
    case 'restaurants': return 'restaurants'
    case 'daily': return 'daily'
    default: return 'products'
  }
}

type CatGroup = {
  key: string
  name_ar: string
  emoji: string | null
  image_url: string | null
  order: number
  count: number
  vkey: VKey
}

function buildGroups(cats: Category[]): CatGroup[] {
  const map = new Map<string, CatGroup>()
  for (const c of cats) {
    const key = c.group_slug || c.slug
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      if (!existing.image_url && c.image_url) existing.image_url = c.image_url
    } else {
      map.set(key, {
        key,
        name_ar: c.group_name_ar || c.name_ar,
        emoji: c.group_emoji || c.icon,
        image_url: c.image_url,
        order: c.group_display_order ?? 999,
        count: 1,
        vkey: trackToVkey(c.track),
      })
    }
  }
  return [...map.values()].sort((a, b) => a.order - b.order)
}

// ---- FX / news data shapes ----
interface FinData {
  ok: boolean
  currencies: { code: string; name_ar: string; flag: string; rate: number }[]
  gold: { karat: number; label: string; price_per_gram_egp: number }[]
}
interface NewsItem { title: string; link: string; image: string; source: string; pubDate: string; category: string }

function timeAgoAr(iso: string): string {
  try {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const mins = Math.max(1, Math.round((now - then) / 60000))
    if (mins < 60) return `من ${mins} دقيقة`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `من ${hrs} ساعة`
    const days = Math.round(hrs / 24)
    return `من ${days} يوم`
  } catch { return '' }
}

export default function MobileHome({ categories, liveCounts = {} }: { categories: Category[]; liveCounts?: Record<string, number> }) {
  const { lang } = useT()
  const router = useRouter()
  const en = lang === 'en'

  const [active, setActive] = useState<'all' | VKey>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [fin, setFin] = useState<FinData | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [q, setQ] = useState('')
  const [marid, setMarid] = useState('')

  // auth (for drawer login/logout)
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => setLoggedIn(!!data.session))
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // live FX + gold
  useEffect(() => {
    let dead = false
    fetch(`/api/financial-data?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json()).then(j => { if (!dead && j?.ok) setFin(j) }).catch(() => {})
    return () => { dead = true }
  }, [])

  // all news (كل التصنيفات مدموجة ورا بعض — 29 Jul 2026)
  useEffect(() => {
    let dead = false
    const cats = ['madmona', 'economy', 'real_estate', 'automotive', 'business', 'tourism', 'fashion', 'tech']
    Promise.all(
      cats.map(c =>
        fetch(`/api/news-feed?category=${c}&_=${Date.now()}`, { cache: 'no-store' })
          .then(r => r.json())
          .then(j => (j?.ok && Array.isArray(j.items) ? (j.items as NewsItem[]) : []))
          .catch(() => [] as NewsItem[])
      )
    ).then(lists => {
      if (dead) return
      const seen = new Set<string>()
      const merged = lists.flat().filter(n => {
        if (!n?.link || seen.has(n.link)) return false
        seen.add(n.link)
        return true
      })
      merged.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      setNews(merged)
    })
    return () => { dead = true }
  }, [])

  const onChip = (key: 'all' | VKey) => {
    setActive(key)
    try {
      const sp = new URLSearchParams(window.location.search)
      if (key === 'all') { sp.delete('track') } else { sp.set('track', key) }
      window.history.replaceState(null, '', `${window.location.pathname}${sp.toString() ? '?' + sp.toString() : ''}`)
    } catch { /* non-blocking */ }
  }

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    const term = q.trim()
    router.push(term ? `/marketplace?q=${encodeURIComponent(term)}` : '/marketplace')
  }

  // اسأل المارد — بيفتح شات المارد ومعاه السؤال، والمارد يرد جوه الشات
  const submitMarid = (e: FormEvent) => {
    e.preventDefault()
    const term = marid.trim()
    router.push(term ? `/chat/marid?q=${encodeURIComponent(term)}` : '/chat/marid')
  }

  const signOut = async () => {
    setMenuOpen(false)
    await supabaseBrowser.auth.signOut()
    if (typeof window !== 'undefined') window.location.href = '/'
  }

  const addTrack = active === 'all' ? '' : `?track=${active}`
  const groups = active === 'all'
    ? buildGroups(categories)
    : buildGroups(categories.filter(c => (VERTICALS.find(v => v.key === active)?.tracks || []).includes(c.track || '')))

  // منع تكرار نفس الصورة في «الكل»: أول ما صورة تتكرر نحوّل الكارت لتايل بأيقونته
  const seenImg = new Set<string>()
  const catCards = groups.map(g => {
    const useImg = !!g.image_url && !seenImg.has(g.image_url)
    if (useImg && g.image_url) seenImg.add(g.image_url)
    return { ...g, useImg }
  })

  const usd = fin?.currencies?.find(c => c.code === 'USD')?.rate
  const gold21 = fin?.gold?.find(g => g.karat === 21)?.price_per_gram_egp

  const chips: { key: 'all' | VKey; label: string; emoji?: string }[] = [
    { key: 'all', label: en ? 'All' : 'الكل' },
    ...VERTICALS.map(v => ({ key: v.key, label: en ? v.en : v.ar, emoji: v.emoji })),
  ]

  return (
    <div className="md:hidden bg-[#FAFAF7] min-h-screen">
      {/* 1. Compact header */}
      <header className="flex items-center justify-between px-4 pt-3 pb-1">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <span className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,.06)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/madmona-logo.png" alt="مضمونة" className="w-[30px] h-[30px] object-contain" />
          </span>
          <span className="leading-none">
            <span className="block text-[15px] font-black text-[#1F6F5F] leading-none">مضمونة</span>
            <span className="block text-[8px] font-bold tracking-[0.25em] text-[#9CA3AF] mt-0.5">MADMONA</span>
          </span>
        </Link>
        <div className="flex gap-2">
          <Link href="/account" aria-label="الإشعارات" className="relative w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,.06)] no-underline">
            <Bell className="w-[19px] h-[19px] text-[#374151]" strokeWidth={2} />
            <span className="absolute top-[9px] left-[9px] w-[7px] h-[7px] rounded-full bg-[#E26D5C] border-[1.5px] border-white" />
          </Link>
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="القائمة" className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,.06)]">
            <Menu className="w-[19px] h-[19px] text-[#374151]" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* 2. Search hero */}
      <div className="px-4 pt-3.5">
        {/* تاب تحميل التطبيق - في نفس سطر العنوان على الشمال (30 Jul 2026) */}
        <div className="flex items-start justify-between gap-3 mb-3">
        <h1 className="text-[22px] font-black text-[#0A0A0A] leading-[1.25] flex-1 min-w-0">
          {en ? <>Find anything —<br/>you&apos;re <span className="text-[#1F6F5F]">covered</span></>
              : <>دوّر على أي حاجة —<br/>معاملاتك <span className="text-[#1F6F5F]">مضمونة</span></>}
        </h1>
          <div className="flex-shrink-0 pt-1">
            <DownloadAppBig compact />
          </div>
        </div>
        <form onSubmit={submitSearch} className="flex items-center gap-2.5 bg-white border-2 border-[#E5DFD3] rounded-2xl px-4 py-[13px] shadow-[0_4px_16px_rgba(20,40,34,.05)]">
          <Search className="w-[18px] h-[18px] text-[#7C8A84] flex-shrink-0" strokeWidth={2.5} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={en ? 'Apartment · car · hall · service…' : 'شقة · عربية · قاعة · خدمة…'}
            className="flex-1 bg-transparent outline-none text-sm font-medium text-[#1A1A1A] placeholder:text-[#7C8A84] min-w-0"
          />
          <button type="submit" aria-label="بحث" className="w-[34px] h-[34px] -my-1.5 -ms-2 rounded-[10px] bg-[#1F6F5F] flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-white rtl:rotate-0 ltr:rotate-180" strokeWidth={2.5} />
          </button>
        </form>

        {/* 3. Ask Marid row — typeable; opens Marid chat with the message */}
        <form onSubmit={submitMarid} className="flex items-center gap-2.5 bg-white border-[1.5px] border-[#E5DFD3] rounded-2xl px-4 py-3 mt-2.5 focus-within:border-[#1F6F5F] transition-colors">
          <span className="text-[20px] leading-none flex-shrink-0">🧞</span>
          <input
            value={marid}
            onChange={e => setMarid(e.target.value)}
            placeholder={en ? 'Ask Madmona Marid…' : 'اسأل مارد مضمونة… عايز إيه؟'}
            className="flex-1 bg-transparent outline-none text-[13px] font-semibold text-[#1A1A1A] placeholder:text-[#4B5563] min-w-0"
          />
          <button type="submit" aria-label={en ? 'Ask' : 'اسأل'} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#1F6F5F] rtl:rotate-0 ltr:rotate-180" strokeWidth={2.5} />
          </button>
        </form>

        {/* 4. Vertical chips */}
        <div className="flex gap-2 overflow-x-auto mt-3 pb-0.5 hide-scroll">
          {chips.map(c => {
            const on = active === c.key
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onChip(c.key)}
                className={`flex-none inline-flex items-center gap-1.5 px-4 py-[9px] rounded-full text-[13px] font-extrabold transition-colors ${on ? 'bg-[#1F6F5F] text-white' : 'bg-white text-[#1A1A1A] border-[1.5px] border-[#E5DFD3]'}`}
              >
                {c.emoji && <span className="leading-none">{c.emoji}</span>}
                <span>{c.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. Categories */}
      <section className="px-4 pt-[22px]">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[17px] font-black text-[#0A0A0A]">{en ? 'Categories' : 'الأقسام'}</h2>
          <Link href="/marketplace" className="text-xs font-extrabold text-[#1F6F5F] no-underline">{en ? 'See all ←' : 'شوف الكل ←'}</Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {catCards.map(g => {
            const vm = VERTICALS.find(v => v.key === g.vkey)
            // (29 Jul 2026) قسم رئيسي أقل من 5 إعلانات منشورة ← ضل + «قريبًا»
            const soon = (liveCounts[g.key] ?? 0) < 5
            return (
              <Link
                key={g.key}
                href={`/marketplace?track=${g.vkey}&group=${encodeURIComponent(g.key)}`}
                className="relative block rounded-[18px] overflow-hidden aspect-[4/3] no-underline"
              >
                {g.useImg && g.image_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.image_url} alt={g.name_ar} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,25,20,.8), rgba(10,25,20,.05) 60%)' }} />
                  </>
                ) : (
                  <>
                    <span className={`absolute inset-0 bg-gradient-to-br ${vm?.tone || 'from-[#1F6F5F] to-[#2FA084]'}`}>
                      <span className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                      <span className="absolute inset-x-0 top-[14%] text-center text-[42px] select-none">{g.emoji || '🏷️'}</span>
                    </span>
                    <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,25,20,.55), transparent)' }} />
                  </>
                )}
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="block text-white text-base font-black leading-tight">{g.name_ar}</span>
                  <span className="block text-white/75 text-[10.5px] font-bold mt-0.5">{g.count} {en ? 'sections' : 'قسم'}</span>
                </span>
                {soon && (
                  <>
                    <span className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-white/95 text-[#14231E] text-[12px] font-black px-3.5 py-1.5 rounded-full shadow">
                        {en ? 'Coming soon' : 'قريبًا'} ✨
                      </span>
                    </span>
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </section>

      {/* 6. Property market + developers grid */}
      <section className="px-4 pt-[22px]">
        {/* شريط بورصة العقارات — فوق اللوجوهات وبيودّي على البورصة (29 Jul 2026) */}
        <Link
          href="/real-estate/market"
          className="flex items-center gap-3 rounded-[18px] px-4 py-3.5 no-underline mb-3"
          style={{ background: 'linear-gradient(118deg, #14231E, #1F6F5F)' }}
        >
          <span className="w-10 h-10 rounded-xl bg-white/12 flex items-center justify-center flex-shrink-0 text-xl">🏗️</span>
          <span className="flex-1 min-w-0">
            <span className="block text-white text-[15px] font-black">
              {en ? 'Property market' : 'بورصة العقارات'}{' '}
              <span className="text-[9px] font-bold text-[#8FE3C8] bg-white/10 px-1.5 py-0.5 rounded-full align-[2px]">LIVE</span>
            </span>
            <span className="block text-white/70 text-[11px] font-semibold mt-0.5">{en ? 'Developer projects, prices & offers' : 'مشاريع المطوّرين وأسعارهم وعروضهم'}</span>
          </span>
          <span className="text-white font-black text-[13px] flex-shrink-0">←</span>
        </Link>

        {/* شريط اتجاه السوق */}
        <MarketTicker fin={fin} en={en} />

        {/* رصّة لوجوهات المطوّرين — ثابتة، كل لوجو بيودّي على مشاريع الشركة في البورصة */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 whitespace-nowrap">نخبة المطورين المتعاقدين</p>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DEVELOPER_DIRECTORY.map((d) => (
              <Link
                key={d.slug}
                href={`/real-estate/market?dev=${d.slug}`}
                className="bg-white border border-black/5 rounded-2xl p-2 flex flex-col items-center justify-center gap-1 no-underline active:scale-95 transition-transform"
              >
                <span className="h-9 w-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.logo} alt={d.name} className="max-h-9 max-w-full object-contain" loading="lazy" draggable={false} />
                </span>
                <span className="text-[9px] font-bold text-gray-500 text-center leading-tight line-clamp-1">{d.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. News list */}
      {news.length > 0 && (
        <section className="px-4 pt-[22px]">
          <div className="mb-2.5">
            <h2 className="text-[17px] font-black text-[#0A0A0A]">{en ? 'Madmona news' : 'أخبار مضمونة'}</h2>
          </div>
          <div className="flex flex-col gap-2">
            {news.map((n, i) => (
              <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center bg-white rounded-2xl p-2.5 border border-black/5 no-underline">
                {n.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" loading="lazy" />
                ) : (
                  <span className="w-14 h-14 rounded-xl bg-[#1F6F5F]/10 flex items-center justify-center flex-shrink-0 text-xl">📰</span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-extrabold text-[#111827] leading-[1.45] line-clamp-2">{n.title}</span>
                  <span className="block text-[10px] font-bold text-[#1F6F5F] mt-0.5">{n.source} · {timeAgoAr(n.pubDate)}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 8. Supplier CTA */}
      <section className="px-4 pt-6 pb-7">
        <div className="rounded-[20px] px-5 py-[18px] flex items-center gap-3" style={{ background: 'linear-gradient(118deg, #1F6F5F, #2d7a52)' }}>
          <span className="flex-1">
            <span className="block text-white text-[15px] font-black">{en ? 'Have something to rent or sell?' : 'عندك حاجة تأجرها أو تبيعها؟'}</span>
            <span className="block text-white/75 text-[11px] font-semibold mt-0.5">{en ? 'List it free in 2 minutes — we market it for you' : 'ضيفها مجاناً في دقيقتين — إحنا بنسوّقلك'}</span>
          </span>
          <Link href={`/add-listing${addTrack}`} className="bg-white text-[#1F6F5F] rounded-xl px-4 py-2.5 text-[13px] font-black flex-shrink-0 no-underline">{en ? 'List ←' : 'ضيف ←'}</Link>
        </div>
      </section>

      {/* Menu drawer (mirrors TopNav drawer) */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-80 max-w-[85%] bg-white flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 bg-[#FAFAF7] rounded-2xl flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/madmona-logo.png" alt="مضمونة" className="w-9 h-9 object-contain" />
                </span>
                <span>
                  <span className="block font-black text-[#1F6F5F]">مضمونة</span>
                  <span className="block text-[9px] text-gray-500 font-bold tracking-[0.2em]">MADMONA</span>
                </span>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} className="w-9 h-9 hover:bg-gray-50 rounded-xl flex items-center justify-center">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <DrawerLink href="/account" icon={<User className="w-5 h-5 text-gray-700" />} title={en ? 'Account' : 'حسابي'} desc={en ? 'Orders, favorites & wallet' : 'طلباتك ومفضّلتك والمحفظة'} onClose={() => setMenuOpen(false)} />
              <DrawerLink href={`/add-listing${addTrack}`} icon={<Plus className="w-5 h-5 text-[#d4a017]" strokeWidth={3} />} iconBg="bg-[#d4a017]/10" title={en ? 'Add a listing' : 'ضيف المنتج'} desc={en ? 'Start selling or renting' : 'ابدأ تبيع أو تؤجّر على مضمونة'} onClose={() => setMenuOpen(false)} />
              <DrawerLink href="/careers" icon={<Briefcase className="w-5 h-5 text-[#1F6F5F]" />} iconBg="bg-[#1F6F5F]/10" title={en ? 'Careers' : 'التوظيف'} desc={en ? 'Join the Madmona team' : 'تقدّم لفرص العمل في مضمونة'} onClose={() => setMenuOpen(false)} />
              {loggedIn ? (
                <button type="button" onClick={signOut} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-50 text-right">
                  <span className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0"><LogOut className="w-5 h-5 text-red-500" /></span>
                  <span className="flex-1"><span className="block font-bold text-gray-900">{en ? 'Sign out' : 'تسجيل الخروج'}</span></span>
                </button>
              ) : (
                <DrawerLink href="/auth/login" icon={<LogIn className="w-5 h-5 text-[#1F6F5F]" />} iconBg="bg-[#1F6F5F]/10" title={en ? 'Log in' : 'تسجيل الدخول'} desc={en ? 'Access your account' : 'ادخل على حسابك'} onClose={() => setMenuOpen(false)} />
              )}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <Link href="/chat" onClick={() => setMenuOpen(false)} className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-2xl font-bold no-underline">
                💬 {en ? 'Chat with us now' : 'كلّمنا مباشر — رد فوري'}
              </Link>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

function StatCard({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <span className="flex-none bg-white border border-[#EAE4D7] rounded-[14px] px-3.5 py-2.5">
      <span className="block text-[10px] font-extrabold text-[#7C8A84]">{label}</span>
      <span className="block text-sm font-black text-[#0A0A0A] mt-0.5 whitespace-nowrap">
        {value}{up && <span className="text-[#2FA084] text-[10px] ms-1">▲</span>}
      </span>
    </span>
  )
}

function DrawerLink({ href, icon, iconBg = 'bg-gray-100', title, desc, onClose }: { href: string; icon: ReactNode; iconBg?: string; title: string; desc?: string; onClose: () => void }) {
  return (
    <Link href={href} onClick={onClose} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline transition-colors">
      <span className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>{icon}</span>
      <span className="flex-1">
        <span className="block font-bold text-gray-900">{title}</span>
        {desc && <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>}
      </span>
    </Link>
  )
}

// شريط اتجاه السوق — ثابت من غير حركة، بيتسحب بالإيد (29 Jul 2026: بلاش أنيميشن)
function MarketTicker({ fin, en }: { fin: FinData | null; en: boolean }) {
  const ticks: { label: string; value: string }[] = []
  fin?.currencies?.forEach(c => {
    if (c?.rate) ticks.push({ label: `${c.flag || ''} ${c.name_ar || c.code}`.trim(), value: `${c.rate.toFixed(2)} ج` })
  })
  fin?.gold?.forEach(g => {
    if (g?.price_per_gram_egp) ticks.push({ label: g.label || `ذهب ${g.karat}`, value: `${g.price_per_gram_egp.toLocaleString('ar-EG')} ج` })
  })

  if (ticks.length === 0) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-0.5 hide-scroll">
        <StatCard label={en ? 'USD' : 'دولار'} value="…" />
        <StatCard label={en ? 'Gold 21' : 'ذهب ٢١'} value="…" />
      </div>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 hide-scroll">
      {ticks.map((t, i) => (
        <span key={i} className="shrink-0 inline-flex items-baseline gap-1.5 bg-white border border-black/5 rounded-xl px-3 py-2">
          <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">{t.label}</span>
          <span className="text-[12px] font-black text-[#1F6F5F] whitespace-nowrap">{t.value}</span>
        </span>
      ))}
    </div>
  )
}
