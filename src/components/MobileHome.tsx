'use client'

// ============================================================================
// MobileHome — mobile-only home (design option "2a": مركّز + اسأل مارد مضمونة)
// Renders ONLY on mobile (parent gates with md:hidden). Desktop keeps the
// existing homepage untouched. Reuses category grouping (buildGroups /
// VERTICALS, same identity as CategoryTrackTabs).
// ⚠️ (11 أغسطس 2026، طلب محمد) الأخبار + أسعار العملات والذهب اتنقلوا من هنا
// لجوّه تاب "بورصة رجال الأعمال" (/business-lounge) بالكامل — مفيش أي fetch
// لـ/api/financial-data أو /api/news-feed في الملف ده تاني؛ كارت البورصة في
// الهيرو تحت هو اللي بيودّي عليهم.
// Handoff: "Madmona Home Improvements" → option 2a (29 Jul 2026).
// ============================================================================

import { useState, useEffect, FormEvent, ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Search, Bell, Menu, X, ArrowLeft, User, LogIn, LogOut, Briefcase, Plus,
  LayoutDashboard, Car, Package,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useT } from '@/lib/i18n/LanguageProvider'
import LanguageToggle from './LanguageToggle'
import DownloadAppBig from '@/components/DownloadAppBig'
import WorkspaceMenu from '@/components/WorkspaceMenu'

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

type VKey = 'products' | 'rentals' | 'services' | 'restaurants' | 'industry'

const VERTICALS: { key: VKey; ar: string; en: string; emoji: string; tracks: string[]; tone: string; accent: string }[] = [
  { key: 'products',    ar: 'بيع',        en: 'Buy',         emoji: '🏷️', tracks: ['products', 'sales'],   tone: 'from-[#2C5F8D] to-[#5B9BD5]', accent: '#3D7BB6' },
  { key: 'rentals',     ar: 'إيجار',      en: 'Rent',        emoji: '🔑', tracks: ['rentals', 'hybrid'],   tone: 'from-[#34D399] to-[#2FA084]', accent: '#059669' },
  { key: 'services',    ar: 'خدمات',      en: 'Services',    emoji: '🛠️', tracks: ['services'],            tone: 'from-[#8A6A0F] to-[#D4A017]', accent: '#2B4521' },
  // 🍽️ (١٤ أغسطس ٢٠٢٦ — محمد) رجوع المطاعم. الـ track ده كان موجود في
  //    الداتابيز طول الوقت (١٣ تصنيف · ٢٦ مطعم منشور · ١٬٥٨٤ صنف منيو)،
  //    بس التصنيفات كانت is_active=false فمكانش ليه تاب هنا.
  { key: 'restaurants', ar: 'مطاعم',      en: 'Restaurants', emoji: '🍽️', tracks: ['restaurants'],         tone: 'from-[#7C2D12] to-[#EA9A3E]', accent: '#9A3412' },
  // 🏭 (١ سبتمبر ٢٠٢٦) القسم الخامس — شركات وصناعة (B2B)
  { key: 'industry',    ar: 'شركات وصناعة', en: 'Industry',    emoji: '🏭', tracks: ['industry'],            tone: 'from-[#3E4A54] to-[#5A6B7A]', accent: '#5A6B7A' },
]

// (11 أغسطس 2026) قسم «بورصة مضمونة العقارية» مش فئة داتا بيز — كارت ثابت
// بيودّي على /real-estate/market، ظاهر جنب بيع/إيجار/خدمات في الهيرو.
const BOURSE_CARD = {
  key: 'bourse' as const,
  ar: 'بورصة مضمونة العقارية',
  en: 'Madmona Real Estate Exchange',
  emoji: '🏗️',
  // 🖼️ (١٤ أغسطس ٢٠٢٦) الكارتين دول كانوا **بدون صورة خالص** — إيموجي على
  //    تدرج لوني بس، لأنهم مش فئات في الداتابيز (متكتوبين هنا يدوي) فمحدش
  //    كان بيدّيهم صورة. دلوقتي بقى ليهم صور بالهوية الخضرا الجديدة.
  img: '/hero/bourse.jpg',
  tone: 'from-[#14231E] to-[#34D399]',
  accent: '#059669',
  href: '/real-estate/market',
}

// (11 أغسطس 2026) كارت خامس ثابت — «بورصة رجال الأعمال»: أخبار + عملات +
// ذهب في لوحة واحدة، جنب بيع/إيجار/خدمات/بورصة عقارية.
const BUSINESS_CARD = {
  key: 'business' as const,
  ar: 'بورصة رجال الأعمال',
  en: 'Business Lounge',
  emoji: '📈',
  img: '/hero/business-lounge.jpg',
  tone: 'from-[#2B4521] to-[#34D399]',
  accent: '#059669',
  href: '/business-lounge',
}

function trackToVkey(track: string | null): VKey {
  switch (track) {
    case 'rentals': case 'hybrid': return 'rentals'
    case 'services': return 'services'
    case 'restaurants': return 'restaurants'
    case 'industry': return 'industry'   // 🏭 (١/٩) كان بيقع في default → بيع
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

export default function MobileHome({ categories, liveCounts = {}, sectionCounts = {} }: { categories: Category[]; liveCounts?: Record<string, number>; sectionCounts?: Record<string, number> }) {
  const { lang, t } = useT()
  const router = useRouter()
  const en = lang === 'en'

  // بعد شيل شريط التابات مافيش حاجة بتغيّر ده — القيمة ثابتة 'all'
  // (سايبينها متغير عشان `groups` و`addTrack` تحت يفضلوا زي ما هما).
  const active: 'all' | VKey = 'all'
  const [menuOpen, setMenuOpen] = useState(false)
  // 👤 (٢٨/٨) موظف مضمونة؟ — لوحة الإدارة بتبان له بس
  const [isStaff, setIsStaff] = useState(false)

  // 👤 (٢٨/٨) موظف مضمونة؟ — لوحة الإدارة بتبان له بس
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string,
        ) => Promise<{ data: unknown }>)('is_madmona_staff')
        if (alive && data === true) setIsStaff(true)
      } catch { /* مش موظف — الرابط مايبانش */ }
    })()
    return () => { alive = false }
  }, [])
  const [loggedIn, setLoggedIn] = useState(false)
  const [q, setQ] = useState('')
  const [marid, setMarid] = useState('')

  // auth (for drawer login/logout)
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => setLoggedIn(!!data.session))
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s))
    return () => sub.subscription.unsubscribe()
  }, [])

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

  // 🐞 (١٤ أغسطس ٢٠٢٦) كارت القسم كان بياخد كل حاجته من **أول مجموعة فرعية
  //    بالصدفة** (`catCards.find(vkey === …)`) — وده كان بيعمل ٣ مشاكل:
  //
  //    ١) الضغط على «بيع» كان بيفتح `?track=products&group=sale-property`،
  //       فالماركتبليس بيدخل جوّه **العقارات** على طول والمستخدم مش شايف
  //       باقي أقسام البيع (عربيات · بيت وأثاث · بحري …).
  //    ٢) حجاب «قريبًا» كان بيتحسب من عدّاد المجموعة دي لوحدها: «خدمات»
  //       كان متغطّي لأن أول مجموعة فيه «خدمات طبية وتجميل» = صفر إعلان،
  //       مع إن القسم كله فيه شغل.
  //    ٣) «N قسم» كان عدد فئات المجموعة الواحدة مش القسم كله.
  //
  //    الصح: نحسب على **مستوى الـtrack كله**.
  const trackOf = (k: VKey) => VERTICALS.find(v => v.key === k)?.tracks || []
  const trackStats = (k: VKey) => {
    const cats = categories.filter(c => trackOf(k).includes(c.track || ''))
    const gkeys = new Set(cats.map(c => c.group_slug || c.slug))
    const live = [...gkeys].reduce((s, gk) => s + (liveCounts[gk] ?? 0), 0)
    // الصورة: أول مجموعة في القسم عندها صورة (مع نفس حارس عدم التكرار)
    // 🖼️ (١ سبتمبر ٢٠٢٦) محمد: «صورة القسم ملهاش علاقة». للصناعة: القسم
    //    الرئيسي slug='industry' هو اللي صورته مصنع — مش أول فرع (مواد بناء).
    const card = (k === 'industry' ? catCards.find(c => c.key === 'industry' && c.image_url) : null)
      || catCards.find(c => c.vkey === k && c.useImg && c.image_url)
      || catCards.find(c => c.vkey === k)
    // 🔢 (٢/٩/٢٠٢٦) العدّاد من الداتابيز بقاعدة «لو رووت واحد عُدّ أولاده» —
    //    cats.length بيعدّ الرووتس بس، فالصناعة كانت بتطلع «١ قسم» وفيها ١٨.
    const fromDb = trackOf(k).reduce((sum, tr) => sum + (sectionCounts[tr] ?? 0), 0)
    return { cats: fromDb || cats.length, live, card }
  }

  return (
    <div className="md:hidden bg-[#FAFAF7] min-h-screen">
      {/* 1+2. هيدر + عنوان الترحيب سوا جوّه بلوك برتقالي واحد — (طلب محمد
          ١١ أغسطس: "زود البرتقالي مساحة أكبر في الهيدر") مش بس شريط ضيق،
          دلوقتي المساحة البرتقالية بتمتد من شريط الحالة لحد تحت العنوان،
          وبعدين تيجي كروت السيرش البيضا فوقها. paddingTop بيمدّ الخلفية
          لفوق تحت شريط الحالة نفسه — متطابق مع appleWebApp.statusBarStyle:
          'black-translucent' + viewport-fit=cover في layout.tsx. */}
      <div
        className="bg-[#34D399] rounded-b-[28px] pb-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <header className="flex items-center justify-between px-4 pb-1">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <span className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,.06)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/madmona-logo.png" alt="مضمونة" className="w-[30px] h-[30px] object-contain" />
            </span>
            <span className="leading-none">
              <span className="block text-[15px] font-black text-white leading-none">{t('tn.brand')}</span>
              <span className="block text-[8px] font-bold tracking-[0.25em] text-white/70 mt-0.5">MADMONA</span>
            </span>
          </Link>
          <div className="flex gap-2">
            {/* 🌍 (٢٧ أغسطس ٢٠٢٦) محمد: «موجود الكلام ده في نسخة الموبايل؟» —
                الهوم بتاعة الموبايل ماكانش فيها أي زرار لغة أصلًا. */}
            <LanguageToggle
              className="bg-white/15 h-10"
              activeClass="bg-white text-[#059669]"
              inactiveClass="bg-transparent text-white"
            />
            <Link href="/notifications" aria-label="الإشعارات" className="relative w-10 h-10 bg-white/15 rounded-[14px] flex items-center justify-center no-underline">
              <Bell className="w-[19px] h-[19px] text-white" strokeWidth={2} />
              <span className="absolute top-[9px] left-[9px] w-[7px] h-[7px] rounded-full bg-[#E26D5C] border-[1.5px] border-[#059669]" />
            </Link>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="القائمة" className="w-10 h-10 bg-white/15 rounded-[14px] flex items-center justify-center">
              <Menu className="w-[19px] h-[19px] text-white" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* تاب تحميل التطبيق - في نفس سطر العنوان على الشمال (30 Jul 2026) */}
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
          <h1 className="text-[22px] font-black text-white leading-[1.25] flex-1 min-w-0">
            {t('mhome.h1_a')}<br/>{t('mhome.h1_b')} <span className="underline decoration-2 decoration-white/60 underline-offset-4">{t('mhome.h1_c')}</span>
          </h1>
          <div className="flex-shrink-0 pt-1">
            <DownloadAppBig compact />
          </div>
        </div>
      </div>

      {/* 2. Search hero */}
      <div className="px-4 pt-3.5 -mt-2.5 relative z-10">
        <form onSubmit={submitSearch} className="flex items-center gap-2.5 bg-white border-2 border-[#E5DFD3] rounded-2xl px-4 py-[13px] shadow-[0_4px_16px_rgba(20,40,34,.05)]">
          <Search className="w-[18px] h-[18px] text-[#7C8A84] flex-shrink-0" strokeWidth={2.5} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('mhome.apartment_car_hall_service')}
            className="flex-1 bg-transparent outline-none text-sm font-medium text-[#1A1A1A] placeholder:text-[#7C8A84] min-w-0"
          />
          <button type="submit" aria-label="بحث" className="w-[34px] h-[34px] -my-1.5 -ms-2 rounded-[10px] bg-[#34D399] flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-white rtl:rotate-0 ltr:rotate-180" strokeWidth={2.5} />
          </button>
        </form>

        {/* 3. Ask Marid row — typeable; opens Marid chat with the message */}
        <form onSubmit={submitMarid} className="flex items-center gap-2.5 bg-white border-[1.5px] border-[#E5DFD3] rounded-2xl px-4 py-3 mt-2.5 focus-within:border-[#059669] transition-colors">
          <span className="text-[20px] leading-none flex-shrink-0">🧞</span>
          <input
            value={marid}
            onChange={e => setMarid(e.target.value)}
            placeholder={t('mhome.ask_madmona_marid')}
            className="flex-1 bg-transparent outline-none text-[13px] font-semibold text-[#1A1A1A] placeholder:text-[#4B5563] min-w-0"
          />
          <button type="submit" aria-label={t('mhome.ask')} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#059669] rtl:rotate-0 ltr:rotate-180" strokeWidth={2.5} />
          </button>
        </form>

        {/* 4. ⛔ (١٤ أغسطس ٢٠٢٦، طلب محمد) شريط التابات (الكل · بيع · إيجار ·
            خدمات) اللي كان تحت خانة «اسأل مارد مضمونة» **اتشال**.
            سببين: (١) كان مكرّر — نفس التلات أقسام ظاهرة ككروت كبيرة تحته
            على طول. (٢) كان بيكسر الكروت: أول ما تدوس تاب، الكروت التانية
            بتفقد صورتها وعدد أقسامها لأن الفلترة بتشيل مجموعاتها.
            الدخول للأقسام بقى من الكروت نفسها. */}
      </div>

      {/* 5. Categories — (11 أغسطس 2026) 4 كروت ثابتة بعرض الشاشة كامل، ذي ديزاين
          الترباوية: بيع · إيجار · خدمات · بورصة مضمونة العقارية. مفيش مطاعم
          ولا سوبر ماركت/صيدليات هنا خالص. */}
      <section className="pt-[22px]">
        <div className="flex items-baseline justify-between mb-3 px-4">
          <h2 className="text-[17px] font-black text-[#0A0A0A]">{t('mhome.choose_your_section')}</h2>
          <Link href="/marketplace" className="text-xs font-extrabold text-[#059669] no-underline">{t('mhome.see_all')}</Link>
        </div>
        <div className="flex flex-col gap-3 px-4">
          {VERTICALS.map(v => {
            const st = trackStats(v.key)
            const g = st.card
            const soon = st.live < 5
            return (
              <Link
                key={v.key}
                // 🔑 من غير `&group=` — بنفتح **القسم كله** والماركتبليس بيعرض
                //    كروت المجموعات الفرعية فوق (drill-down المستوى الأول).
                //    لو بعتنا group بيدخل جوّه مجموعة واحدة على طول.
                href={`/marketplace?track=${v.key}`}
                className="relative block rounded-[22px] overflow-hidden w-full aspect-[16/10] no-underline"
              >
                {g?.useImg && g.image_url ? (
                  <>
                    <Image src={g.image_url} alt={v.ar} fill sizes="100vw" className="object-cover" priority />
                    <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,25,20,.82), rgba(10,25,20,.1) 60%)' }} />
                  </>
                ) : (
                  <>
                    <span className={`absolute inset-0 bg-gradient-to-br ${v.tone}`}>
                      <span className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                      <span className="absolute inset-x-0 top-[18%] text-center text-[56px] select-none">{v.emoji}</span>
                    </span>
                    <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,25,20,.6), transparent)' }} />
                  </>
                )}
                <span className="absolute inset-x-0 bottom-0 p-4">
                  <span className="block text-white text-xl font-black leading-tight">{t('mhome.v_' + v.key)}</span>
                  {st.cats > 0 && <span className="block text-white/75 text-[11px] font-bold mt-0.5">{st.cats} {t('mhome.sections')}</span>}
                </span>
                {soon && (
                  <>
                    <span className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-white/95 text-[#14231E] text-[12px] font-black px-3.5 py-1.5 rounded-full shadow">
                        {t('mhome.coming_soon')} ✨
                      </span>
                    </span>
                  </>
                )}
              </Link>
            )
          })}

          {/* بورصة مضمونة العقارية — كارت رابع ثابت بعرض الشاشة كامل */}
          <Link
            href={BOURSE_CARD.href}
            className="relative block rounded-[22px] overflow-hidden w-full aspect-[16/10] no-underline"
          >
            <Image src={BOURSE_CARD.img} alt={BOURSE_CARD.ar} fill sizes="100vw" className="object-cover" />
            <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,25,20,.82), rgba(10,25,20,.1) 60%)' }} />
            <span className="absolute top-4 left-4 text-[9px] font-bold text-[#8FE3C8] bg-white/10 px-2 py-1 rounded-full">LIVE</span>
            <span className="absolute inset-x-0 bottom-0 p-4">
              <span className="block text-white text-xl font-black leading-tight">{t('mhome.v_bourse')}</span>
              <span className="block text-white/75 text-[11px] font-bold mt-0.5">{t('mhome.developer_projects_prices_of')}</span>
            </span>
          </Link>

          {/* بورصة رجال الأعمال — كارت خامس: أخبار + عملات + ذهب */}
          <Link
            href={BUSINESS_CARD.href}
            className="relative block rounded-[22px] overflow-hidden w-full aspect-[16/10] no-underline"
          >
            <Image src={BUSINESS_CARD.img} alt={BUSINESS_CARD.ar} fill sizes="100vw" className="object-cover" />
            <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,25,20,.82), rgba(10,25,20,.1) 60%)' }} />
            <span className="absolute top-4 left-4 text-[9px] font-bold text-[#8FE3C8] bg-white/10 px-2 py-1 rounded-full">LIVE</span>
            <span className="absolute inset-x-0 bottom-0 p-4">
              <span className="block text-white text-xl font-black leading-tight">{t('mhome.v_business')}</span>
              <span className="block text-white/75 text-[11px] font-bold mt-0.5">{t('mhome.news_currency_rates_gold_pri')}</span>
            </span>
          </Link>
        </div>
      </section>

      {/* 6. Supplier CTA */}
      <section className="px-4 pt-6 pb-7">
        <div className="rounded-[20px] px-5 py-[18px] flex items-center gap-3" style={{ background: 'linear-gradient(118deg, #059669, #34D399)' }}>
          <span className="flex-1">
            <span className="block text-white text-[15px] font-black">{t('mhome.have_something_to_rent_or_se')}</span>
            <span className="block text-white/75 text-[11px] font-semibold mt-0.5">{t('mhome.list_it_free_in_2_minutes_we')}</span>
          </span>
          <Link href={`/add-listing${addTrack}`} className="bg-white text-[#059669] rounded-xl px-4 py-2.5 text-[13px] font-black flex-shrink-0 no-underline">{t('mhome.list')}</Link>
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
                  <span className="block font-black text-[#059669]">{t('tn.brand')}</span>
                  <span className="block text-[9px] text-gray-500 font-bold tracking-[0.2em]">MADMONA</span>
                </span>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} className="w-9 h-9 hover:bg-gray-50 rounded-xl flex items-center justify-center">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <DrawerLink href="/account" icon={<User className="w-5 h-5 text-gray-700" />} title={t('mhome.account')} desc={t('mhome.orders_favorites_wallet')} onClose={() => setMenuOpen(false)} />
              <DrawerLink href={`/add-listing${addTrack}`} icon={<Plus className="w-5 h-5 text-[#d4a017]" strokeWidth={3} />} iconBg="bg-[#d4a017]/10" title={t('mhome.add_a_listing')} desc={t('mhome.start_selling_or_renting')} onClose={() => setMenuOpen(false)} />
              <DrawerLink href="/careers" icon={<Briefcase className="w-5 h-5 text-[#059669]" />} iconBg="bg-[#34D399]/10" title={t('mhome.careers')} desc={t('mhome.join_the_madmona_team')} onClose={() => setMenuOpen(false)} />
              {/* 🔔 (٢٨/٨) الإشعارات */}
              {/* 🚗 (٢٨/٨) السيارات — ٤٢ إعلان منشور وماكانش ليها رابط في الموبايل */}
              {/* 📦 (٢٨/٨) طلباتي */}
              <DrawerLink href="/my-orders" icon={<Package className="w-5 h-5 text-[#059669]" />} iconBg="bg-[#34D399]/10" title="طلباتي" desc="حجوزاتك وطلباتك" onClose={() => setMenuOpen(false)} />
              <DrawerLink href="/notifications" icon={<Bell className="w-5 h-5 text-[#059669]" />} title="الإشعارات" desc="كل اللي جالك في مكان واحد" onClose={() => setMenuOpen(false)} />


              {/* 🎛️ (٢٨ أغسطس ٢٠٢٦) **لوحة واحدة** بدل اتنين — محمد:



                  «مش هيظهر ليا ٢ لوحة تحكم مفصولين عن بعض».



                  أدمن مضمونة → لوحة المنصة · صاحب بيزنس → موديولات نشاطه */}
              <WorkspaceMenu onNavigate={() => setMenuOpen(false)} />
              {loggedIn ? (
                <button type="button" onClick={signOut} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-50 text-right">
                  <span className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0"><LogOut className="w-5 h-5 text-red-500" /></span>
                  <span className="flex-1"><span className="block font-bold text-gray-900">{t('mhome.sign_out')}</span></span>
                </button>
              ) : (
                <DrawerLink href="/auth/login" icon={<LogIn className="w-5 h-5 text-[#059669]" />} iconBg="bg-[#34D399]/10" title={t('mhome.log_in')} desc={t('mhome.access_your_account')} onClose={() => setMenuOpen(false)} />
              )}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <Link href="/chat" onClick={() => setMenuOpen(false)} className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-2xl font-bold no-underline">
                💬 {t('mhome.chat_with_us_now')}
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
