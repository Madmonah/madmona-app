'use client'

// src/app/real-estate/market/MarketExplorer.tsx
// =====================================================================
// 🏗️ بورصة مشاريع المطوّرين — إعادة تصميم 3a (29 Jul 2026)
// التصميم الأبيض المعتمد من design_handoff_bourse_marid (اللي محمد بعته).
// ✅ قرار منتج: البورصة بقت لمشاريع المطوّرين بس (segment='developer').
//    متوسطات الريسيل والإيجار اتشالت من الصفحة دي (هتروح للماركت بليس).
// ✅ اللوجيك القديم متحافظ عليه بالكامل: بحث norm() المعرَّب، المناطق
//    والمطوّرين الديناميك من الداتا، فلتر التصنيف، inquiryWaLink،
//    logInquiry sendBeacon، مودال الفيديو، bannerTone للمشاريع من غير صورة.
// 🆕 شريط مؤشرات: دولار + دهب ٢١ من /api/financial-data، ومتر العاصمة
//    والتجمع محسوبين من صفوف الريسيل egp_per_m2 (الداتا لسه بتتجاب من
//    السيرفر — بس مش بتتعرض ككروت). أسهم ▲▼ = مقارنة بآخر زيارة
//    (localStorage) — مفيش أسهم متلفقة من غير داتا حقيقية.
// 🆕 شريطة «🔥 فرص» بتحوّل الصفحة لعرض الفرص بس.
// =====================================================================
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
import Link from 'next/link'
import { DEVELOPER_DIRECTORY, findDeveloperBySlug } from '@/lib/developer-directory'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Building2, Search, X, MapPin, ChevronDown,
  FileText, PlayCircle, CalendarClock, Wallet, MessageCircle, Clock,
} from 'lucide-react'
import {
  inquiryWaLink, PROPERTY_TYPES, PROPERTY_TYPE_LABEL, PROPERTY_TYPE_ICON,
  type MediaItem, type PropertyType,
} from '@/lib/projects'

export type Item = {
  id: string
  slug: string
  area: string
  area_label: string
  city: string | null
  district: string | null
  segment: 'developer' | 'resale' | 'rent'
  developer: string | null
  title: string
  unit_label: string | null
  price_from: number | null
  price_to: number | null
  price_unit: 'egp_total' | 'egp_per_m2' | 'egp_month' | 'egp_night'
  note: string | null
  property_type: PropertyType | null
  payment_plan: string | null
  delivery_label: string | null
  cover_url: string | null
  brochure_url: string | null
  video_url: string | null
  media: MediaItem[] | null
  sort_order: number
  updated_at: string
}

export type Opportunity = {
  id: string
  title: string
  kind: string
  area_label: string | null
  city: string | null
  snippet: string | null
  posted_at: string | null
  offer_type: 'sale' | 'rent'
  price_label: string | null
}

const ADD_PROJECT = '/add-project'

const UNIT_SUFFIX: Record<Item['price_unit'], string> = {
  egp_total: ' ج',
  egp_per_m2: ' ج/م²',
  egp_month: ' ج/شهر',
  egp_night: ' ج/ليلة',
}

// 🌍 (٢٧ أغسطس ٢٠٢٦) مفاتيح الترجمة لأنواع الوحدات — KIND_LABEL العربي
//    سايبه لأي استخدام سيرفري/تحليلي، والعرض بيستخدم KIND_KEY.
const KIND_KEY: Record<string, string> = {
  apartments: 'bo.k_apartments', villas: 'bo.k_villas', chalets: 'bo.k_chalets',
  offices: 'bo.k_offices', commercial: 'bo.k_commercial',
}
const KIND_LABEL: Record<string, string> = {
  apartments: 'شقة',
  villas: 'فيلا',
  chalets: 'شاليه',
  offices: 'مكتب',
  commercial: 'تجاري',
}

// ⛱️ الهاندأوف كتب «⛱️ ساحلي» للشرايط هنا — نسخة محلية فوق أيقونات المكتبة
const CHIP_ICON: Record<PropertyType, string> = { ...PROPERTY_TYPE_ICON, coastal: '⛱️' }

/** أرقام هندية زي الموك: ٨٤ مشروع في ٩ مناطق */
const arNum = (n: number) => n.toLocaleString('ar-EG')

function fmtMoney(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000
    return `${Number.isInteger(m) ? m : m.toFixed(1)} مليون`
  }
  if (v >= 1000) {
    const k = v / 1000
    return `${Number.isInteger(k) ? k : k.toFixed(1)} ألف`
  }
  return `${v}`
}

// 🎨 المشاريع اللي لسه مالهاش صورة بتاخد بانر متدرّج بلون المنطقة
function bannerTone(it: Item): string {
  const s = `${it.area_label || ''} ${it.city || ''}`
  if (/ساحل|علمين|رأس الحكمة|مارينا|سيدي|مطروح|جونة|سخنة|galala|جلالة/i.test(s))
    return 'from-[#0E7490] to-[#22D3EE]' // بحر
  if (/عاصمة|إدارية|capital/i.test(s))
    return 'from-[#1E3A8A] to-[#3B82F6]' // العاصمة
  if (/زايد|أكتوبر|اكتوبر|جيزة|october|zayed/i.test(s))
    return 'from-[#7C2D12] to-[#059669]' // غرب
  if (/تجمع|قاهرة الجديدة|مستقبل|شروق|عبور|مدينتي|new cairo/i.test(s))
    return 'from-[#2B4521] to-[#D4A017]' // شرق — دهبي (٧ أغسطس: محمد مش عايز أي أخضر يشبه الجرين كارد)
  return 'from-[#334155] to-[#64748B]' // الباقي
}

function fmtPrice(it: Item): string {
  const unit = UNIT_SUFFIX[it.price_unit] || ' ج'
  if (it.price_from != null && it.price_to != null)
    return `${fmtMoney(it.price_from)} – ${fmtMoney(it.price_to)}${unit}`
  if (it.price_from != null) return `يبدأ من ${fmtMoney(it.price_from)}${unit}`
  return ''
}

// توحيد النص العربي للبحث (همزات/تاء مربوطة/ياء + إزالة التشكيل)
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
}

type Chip = 'all' | PropertyType | 'ops'

/** كلاس إخفاء سكرول البار للشرايط الأفقية */
const HS = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export default function MarketExplorer({
  items,
  opportunities,
}: {
  items: Item[]
  opportunities: Opportunity[]
}) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const [areaF, setAreaF] = useState<'all' | string>('all')
  const [devF, setDevF] = useState<'all' | string>('all')
  // 📢 (٢٨/٨) عدّاد الطلبات المفتوحة — بيتجاب مرة عند الفتح
  const [openRequests, setOpenRequests] = useState(0)
  const [chip, setChip] = useState<Chip>('all')
  const [videoOpen, setVideoOpen] = useState<Item | null>(null)
  // 🔗 فلتر لوجو المطوّر (?dev=slug) — جاي من رصّة اللوجوهات في هوم الموبايل (29 Jul 2026)
  const [devSlug, setDevSlug] = useState<string>('')

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const s = sp.get('dev') || ''
      if (s && findDeveloperBySlug(s)) setDevSlug(s)
    } catch { /* non-blocking */ }
  }, [])

  // 🖼️ اختيار مطوّر من رصّة اللوجوهات (١١ أغسطس ٢٠٢٦) — بيحدّث الفلتر
  // ورابط الصفحة (?dev=slug) من غير reload، وبيسكرول لنتايج المطوّر.
  function selectDeveloper(slug: string) {
    setDevSlug(slug)
    try {
      const sp = new URLSearchParams(window.location.search)
      sp.set('dev', slug)
      window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`)
    } catch { /* non-blocking */ }
    document.getElementById('bourse-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const nq = norm(q.trim())

  // 🏗️ البورصة = مشاريع المطوّرين بس (قرار منتج — الهاندأوف 3a)
  // 📢 (٢٨/٨) كام طلب مفتوح؟
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { count } = await (supabaseBrowser as unknown as {
          from: (t: string) => { select: (c: string, o: { count: 'exact'; head: boolean }) => Promise<{ count: number | null }> }
        }).from('v_live_property_demand').select('id', { count: 'exact', head: true })
        if (alive && typeof count === 'number') setOpenRequests(count)
      } catch { /* البانر مايبانش */ }
    })()
    return () => { alive = false }
  }, [])

  const devItems = useMemo(() => items.filter((it) => it.segment === 'developer'), [items])

  // 🔑 المناطق ديناميك من الداتا — الأكتر مشاريع الأول
  const areas = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of devItems) counts.set(it.area_label, (counts.get(it.area_label) || 0) + 1)
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
      .map(([label, count]) => ({ label, count }))
  }, [devItems])

  // 🏗️ المطوّرين — من الداتا برضه
  const developers = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of devItems) {
      if (it.developer) counts.set(it.developer, (counts.get(it.developer) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
      .map(([name, count]) => ({ name, count }))
  }, [devItems])

  // 🏷️ عدّاد كل تصنيف (التصنيفات الفاضية مبتظهرش)
  const typeCounts = useMemo(() => {
    const c = new Map<PropertyType, number>()
    for (const it of devItems) {
      if (it.property_type) c.set(it.property_type, (c.get(it.property_type) || 0) + 1)
    }
    return c
  }, [devItems])

  const filteredItems = useMemo(() => {
    if (chip === 'ops') return []
    const slugEntry = devSlug ? findDeveloperBySlug(devSlug) : undefined
    return devItems.filter((it) => {
      if (slugEntry && (!it.developer || !slugEntry.match.includes(it.developer))) return false
      if (areaF !== 'all' && it.area_label !== areaF) return false
      if (devF !== 'all' && it.developer !== devF) return false
      if (chip !== 'all' && it.property_type !== chip) return false
      if (!nq) return true
      const hay = norm(
        [it.title, it.developer, it.unit_label, it.note, it.area_label, it.city, it.district, it.payment_plan]
          .filter(Boolean)
          .join(' '),
      )
      return hay.includes(nq)
    })
  }, [devItems, areaF, devF, chip, nq, devSlug])

  // 🔥 الفرص: بتظهر مع «الكل» (من غير فلاتر منطقة/مطوّر) أو مع شريطة «فرص»
  const filteredOps = useMemo(() => {
    if (chip !== 'all' && chip !== 'ops') return []
    if (chip === 'all' && (areaF !== 'all' || devF !== 'all')) return []
    return opportunities
      .filter((op) => {
        if (chip === 'ops' && areaF !== 'all' && op.area_label !== areaF) return false
        if (!nq) return true
        const hay = norm([op.title, op.snippet, op.area_label, op.city, KIND_LABEL[op.kind]].filter(Boolean).join(' '))
        return hay.includes(nq)
      })
      .slice(0, 16)
  }, [opportunities, chip, areaF, devF, nq])

  // المناطق اللي فيها نتايج بعد الفلترة — بنرسمها بالترتيب
  const visibleAreas = useMemo(() => {
    const set = new Set(filteredItems.map((it) => it.area_label))
    return areas.filter((a) => set.has(a.label))
  }, [areas, filteredItems])

  const totalResults = filteredItems.length + filteredOps.length

  return (
    <main className="mx-auto max-w-7xl pb-28 md:pb-16">
      {/* ─── 1) الهيدر المدمج: رجوع + العنوان + LIVE + اللوجو ─── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            aria-label={t('bo.back')}
            className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,.06)] shrink-0"
          >
            <ArrowRight className="w-[18px] h-[18px] text-[#374151]" strokeWidth={2.5} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[16px] font-black text-[#0A0A0A] leading-[1.2]">
              {t('bo.title')}{' '}
              <span className="align-[2px] text-[9px] font-bold text-[#059669] bg-[#34D399]/10 px-[7px] py-[2px] rounded-full">
                LIVE
              </span>
            </h1>
            <p className="text-[10px] font-bold text-[#7C8A84] mt-px truncate">
              {t('bo.sub', { p: arNum(devItems.length), a: arNum(areas.length) })}
            </p>
          </div>
        </div>
        <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,.06)] shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/madmona-logo.png" alt={t('tn.brand')} className="w-7 h-7 object-contain" />
        </div>
      </div>

      {/* ─── 2) البحث + قايمتي المنطقة/المطوّر + شرايط التصنيف (لاصقين) ─── */}
      <div className="sticky top-0 z-30 bg-[#FAFAF7] px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5 bg-white border-2 border-[#E5DFD3] rounded-2xl px-4 py-3 shadow-[0_4px_16px_rgba(20,40,34,.05)]">
          <Search className="w-[17px] h-[17px] text-[#7C8A84] shrink-0" strokeWidth={2.5} />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('bo.search_ph')}
            className="flex-1 min-w-0 bg-transparent text-[13.5px] font-medium text-[#14231E] placeholder:text-[#7C8A84] focus:outline-none"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label={t('bo.clear_search')}
              className="w-5 h-5 rounded-full bg-[#F1EEE6] text-[#7C8A84] flex items-center justify-center shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <label className="relative flex items-center">
            <MapPin className="w-3.5 h-3.5 text-[#059669] absolute right-3.5 pointer-events-none" strokeWidth={2.5} />
            <select
              value={areaF}
              onChange={(e) => setAreaF(e.target.value)}
              aria-label={t('bo.area')}
              className="w-full appearance-none bg-white border-[1.5px] border-[#E5DFD3] rounded-full py-[9px] pr-9 pl-8 text-[12px] font-extrabold text-[#1A1A1A] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#059669]/25"
            >
              <option value="all">{t('bo.all_areas', { n: arNum(areas.length) })}</option>
              {areas.map((a) => (
                <option key={a.label} value={a.label}>{a.label} ({arNum(a.count)})</option>
              ))}
            </select>

            {/* 🔽 (٢٨/٨) فلتر المطوّرين رجع — بديل رصّة اللوجوهات */}
            <select
              value={devF}
              onChange={(e) => setDevF(e.target.value)}
              className="flex-1 min-w-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-[12.5px] font-bold text-white outline-none"
            >
              <option value="all" style={{ color: '#1A2E26' }}>كل المطوّرين ({arNum(developers.length)})</option>
              {developers.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({arNum(d.count)})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#7C8A84] absolute left-3.5 pointer-events-none" strokeWidth={2.5} />
          </label>

            {/* 🧹 (٢٨/٨) اتشال فلتر الشركات — العميل بيدوّر على منطقة وسعر
                ونظام سداد، مش على اسم شركة. والبحث بيغطي اسم المطوّر أصلاً. */}
        </div>

        <div className={`flex gap-2 mt-2.5 overflow-x-auto pb-0.5 ${HS}`}>
          <ChipBtn active={chip === 'all'} onClick={() => setChip('all')}>{t('bo.chip_all')}</ChipBtn>
          {PROPERTY_TYPES.filter((t) => (typeCounts.get(t) || 0) > 0).map((t) => (
            <ChipBtn key={t} active={chip === t} onClick={() => setChip(chip === t ? 'all' : t)}>
              {CHIP_ICON[t]} {PROPERTY_TYPE_LABEL[t]}
            </ChipBtn>
          ))}
          {opportunities.length > 0 && (
            <ChipBtn active={chip === 'ops'} onClick={() => setChip(chip === 'ops' ? 'all' : 'ops')}>
              {t('bo.chip_hot')}
            </ChipBtn>
          )}
        </div>
      </div>

      {/* ─── 3) شريط المؤشرات: دولار · دهب ٢١ · متر العاصمة · متر التجمع ─── */}
      <IndicatorsBar items={items} />

      {/* ─── 3.5) رصّة لوجوهات المطوّرين — اتنقلت هنا من الهوم (١١ أغسطس ٢٠٢٦)
          بدل ما تكون في الهوم بلوجو صغير، دلوقتي بجودة أعلى وقابلة للضغط
          (بتفلتر نتايج نفس الصفحة). كل لوجو ياخد مساحة عرض تناسب جودة
          الملف الفعلية (quality في developer-directory.ts) بدل ما نكبّر
          لوجو منخفض الدقة ويبان مبكسل. */}
      {/* 🧹 (٢٨ أغسطس ٢٠٢٦) رصّة لوجوهات الشركات اتشالت من البورصة —
          محمد: «شيلت التابات بتاعت الشركات المحطوطة في بورصة
          العقارات نسخة الموبايل؟». الفلتر الدروبليست بديلها. */}

      {/* 📢 (٢٨/٨) طلبات حية — عملاء بيدوّروا على وحدات دلوقتي */}
      {openRequests > 0 && (
        <Link
          href="/real-estate/requests"
          className="mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-[#34D399]/12 border border-[#34D399]/35 px-4 py-3 no-underline"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#34D399]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-black text-white">
              🔴 طلبات عقارات لايف — {arNum(openRequests)} دلوقتي
            </span>
            <span className="block text-[11px] text-white/70 mt-0.5">
              عملاء طالبين وحدات أو بيسألوا عن مشاريع — شوف وقدّم عرضك
            </span>
          </span>
          <span className="text-[#34D399] text-lg font-black">←</span>
        </Link>
      )}

      {/* 🔗 بادج فلتر المطوّر الجاي من رصّة اللوجوهات (?dev=) */}
      {devSlug && findDeveloperBySlug(devSlug) && (
        <div className="mx-4 mt-3 flex items-center justify-between bg-white border border-[#059669]/20 rounded-2xl px-4 py-2.5">
          <span className="text-[13px] font-black text-[#059669]">
            {t('bo.dev_projects', { name: findDeveloperBySlug(devSlug)!.name })}
          </span>
          <button
            onClick={() => {
              setDevSlug('')
              try {
                const sp = new URLSearchParams(window.location.search)
                sp.delete('dev')
                window.history.replaceState(null, '', `${window.location.pathname}${sp.toString() ? '?' + sp.toString() : ''}`)
              } catch { /* non-blocking */ }
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500"
          >
            <X className="w-3.5 h-3.5" /> {t('bo.all_devs_btn')}
          </button>
        </div>
      )}

      {totalResults === 0 ? (
        <section id="bourse-results" className="mx-4 mt-6 bg-white rounded-[18px] border border-black/5 p-10 text-center text-[#7C8A84] text-[13px] font-semibold">
          <Clock className="w-8 h-8 mx-auto mb-3 text-[#059669]" />
          {t('bo.no_results')}
          <div className="mt-4">
            <button
              onClick={() => { setQ(''); setAreaF('all'); setDevF('all'); setChip('all'); setDevSlug('') }}
              className="px-5 py-2 rounded-full bg-[#34D399] text-[#04352A] text-sm font-bold"
            >
              {t('bo.show_all')}
            </button>
          </div>
        </section>
      ) : (
        <div id="bourse-results">
          {/* ─── 4) أقسام المناطق — كروت المشاريع ─── */}
          {visibleAreas.map((areaDef) => {
            const areaItems = filteredItems.filter((it) => it.area_label === areaDef.label)
            if (areaItems.length === 0) return null
            return (
              <section key={areaDef.label} className="px-4 pt-[22px] scroll-mt-32">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-[38px] h-[38px] rounded-[13px] bg-[#34D399] flex items-center justify-center shrink-0">
                    <MapPin className="w-[18px] h-[18px] text-white" strokeWidth={2} />
                  </span>
                  <h2 className="text-[17px] font-black text-[#0A0A0A]">{areaDef.label}</h2>
                  <span className="text-[11px] font-bold text-[#9CA3AF]">{arNum(areaItems.length)}</span>
                </div>
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {areaItems.map((it) => (
                    <ProjectCard key={it.id} it={it} onPlay={() => setVideoOpen(it)} />
                  ))}
                </div>
              </section>
            )
          })}

          {/* ─── 5) 🔥 فرص معروضة دلوقتي — سكرول عرضي ─── */}
          {filteredOps.length > 0 && (
            <section id="opportunities" className="px-4 pt-6 scroll-mt-32">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="w-[38px] h-[38px] rounded-[13px] bg-[#34D399] flex items-center justify-center text-[17px]">🔥</span>
                <h2 className="text-[17px] font-black text-[#0A0A0A]">{t('bo.ops_t')}</h2>
              </div>
              <p className="text-[11px] font-semibold text-[#7C8A84] leading-[1.6] mb-3">
                {t('bo.ops_d')}
              </p>
              <div className={`flex gap-2.5 overflow-x-auto pb-1 ${HS}`}>
                {filteredOps.map((op) => (
                  <OppCard key={op.id} op={op} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ─── 6) بانر المطوّرين + الديسكليمر ─── */}
      <section className="px-4 pt-6 pb-2">
        <div className="bg-[linear-gradient(118deg,#059669,#34D399)] rounded-[20px] px-5 py-[18px] flex items-center gap-3">
          <span className="flex-1 min-w-0">
            <span className="block text-white text-[15px] font-black">{t('bo.dev_cta_t')}</span>
            <span className="block text-white/75 text-[11px] font-semibold mt-0.5 leading-relaxed">
              {t('bo.dev_cta_d')}
            </span>
          </span>
          <Link href={ADD_PROJECT} className="bg-white text-[#059669] rounded-xl px-4 py-2.5 text-[13px] font-black shrink-0">
            {t('bo.dev_cta_btn')}
          </Link>
        </div>
        <p className="text-[9.5px] font-semibold text-[#9CA3AF] text-center leading-[1.7] max-w-[300px] mx-auto mt-3">
          {t('bo.disclaimer')}
        </p>
      </section>

      {videoOpen && <VideoModal it={videoOpen} onClose={() => setVideoOpen(null)} />}
    </main>
  )
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-none px-[15px] py-2 rounded-full text-[12.5px] font-extrabold whitespace-nowrap transition-colors ${
        active ? 'bg-[#34D399] text-[#04352A]' : 'bg-white text-[#1A1A1A] border-[1.5px] border-[#E5DFD3]'
      }`}
    >
      {children}
    </button>
  )
}

// =====================================================================
// 🖼️ رصّة لوجوهات المطوّرين — اتنقلت من الهوم لجوّه البورصة العقارية
// (طلب محمد ١١ أغسطس: "عايز كل اللوجو بتاع الشركات العقارية يكون ظاهر
// وبجودة عالية ويتحط جوة شاشة البورصة العقارية مش في الهوم بيدج").
// كل كارت بارتفاع موحّد، بس صندوق اللوجو جواه بيتغيّر بحسب جودة الملف
// الفعلية (high/medium/low) — عشان لوجو منخفض الدقة ميتكبّرش ويبان مبكسل.
// الضغط على أي لوجو بيفلتر نتايج نفس الصفحة (مش رابط لصفحة تانية).
// =====================================================================
function DeveloperLogosGrid({ onSelect, activeSlug }: { onSelect: (slug: string) => void; activeSlug: string }) {
  const { t } = useT()
  return (
    <section className="px-4 pt-5">
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#E5DFD3]" />
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#9CA3AF] whitespace-nowrap">
          {t('bo.elite_devs')}
        </p>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#E5DFD3]" />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {DEVELOPER_DIRECTORY.map((d) => {
          const active = activeSlug === d.slug
          return (
            <button
              key={d.slug}
              type="button"
              onClick={() => onSelect(d.slug)}
              aria-label={t('bo.dev_projects_aria', { name: d.name })}
              className={`bg-white rounded-2xl p-2.5 min-h-[56px] flex items-center justify-center transition-colors ${
                active ? 'border-2 border-[#059669]' : 'border border-black/5'
              }`}
            >
              <span className="text-[11px] font-black text-[#14231E] text-center leading-tight line-clamp-2">{d.name}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// =====================================================================
// 📊 شريط المؤشرات — كروت غامقة #14231E بسكرول عرضي
// دولار + دهب ٢١ من /api/financial-data (كاش ٦٠ ثانية عندهم).
// متر العاصمة/التجمع من صفوف الريسيل egp_per_m2 في نفس داتا البورصة.
// الأسهم ▲▼ = مقارنة القيمة بآخر زيارة محفوظة في localStorage.
// =====================================================================
type Trend = 1 | -1 | 0

function IndicatorsBar({ items }: { items: Item[] }) {
  const { t } = useT()
  const [fin, setFin] = useState<{ usd: number | null; gold21: number | null }>({ usd: null, gold21: null })
  const [trend, setTrend] = useState<{ usd: Trend; gold: Trend }>({ usd: 0, gold: 0 })

  useEffect(() => {
    let alive = true
    fetch('/api/financial-data')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        const usd: number | null = d?.currencies?.find((c: { code: string }) => c.code === 'USD')?.rate ?? null
        const gold21: number | null = d?.gold?.find((g: { karat: number }) => g.karat === 21)?.price_per_gram_egp ?? null
        try {
          const prev = JSON.parse(localStorage.getItem('bourse_ind_prev') || '{}') as { usd?: unknown; gold21?: unknown }
          const t = (cur: number | null, old: unknown): Trend =>
            typeof old === 'number' && cur != null && Math.abs(cur - old) > 0.001 ? (cur > old ? 1 : -1) : 0
          setTrend({ usd: t(usd, prev.usd), gold: t(gold21, prev.gold21) })
          localStorage.setItem('bourse_ind_prev', JSON.stringify({ usd, gold21 }))
        } catch { /* localStorage مش متاح؟ مفيش أسهم وخلاص */ }
        setFin({ usd, gold21 })
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const m2 = useMemo(() => {
    const range = (re: RegExp): readonly [number, number] | null => {
      let lo = Infinity
      let hi = 0
      for (const it of items) {
        if (it.segment !== 'resale' || it.price_unit !== 'egp_per_m2') continue
        if (!re.test(`${it.area_label} ${it.city || ''}`)) continue
        if (it.price_from != null) {
          lo = Math.min(lo, it.price_from)
          hi = Math.max(hi, it.price_to ?? it.price_from)
        }
      }
      return lo === Infinity || hi <= 0 ? null : [lo, hi]
    }
    return { capital: range(/عاصمة|إدارية/), newCairo: range(/تجمع|قاهرة الجديدة/) }
  }, [items])

  const fmtK = (r: readonly [number, number]) => `${Math.round(r[0] / 1000)}–${Math.round(r[1] / 1000)} ألف`

  const cards: Array<{ label: string; value: string; gold?: boolean; t?: Trend }> = []
  // 💵 (٢٨ أغسطس ٢٠٢٦) محمد: «شيل تاب الدولار أو الدهب في بورصة
  //    العقارات». الدولار والدهب اتشالوا — البورصة عقارية،
  //    وأسعار المتر هي المؤشر اللي يهم المشتري هنا.
  //    (لسه موجودين في بورصة رجال الأعمال /business-lounge)
  if (m2.capital) cards.push({ label: t('bo.capital_m2'), value: fmtK(m2.capital) })
  if (m2.newCairo) cards.push({ label: t('bo.newcairo_m2'), value: fmtK(m2.newCairo) })
  if (cards.length === 0) return null

  return (
    <div className="px-4 pt-4">
      <div className={`flex gap-2 overflow-x-auto pb-0.5 ${HS}`}>
        {cards.map((c) => (
          <div key={c.label} className="flex-none bg-[#14231E] rounded-[14px] px-3.5 py-2.5">
            <p className="text-[10px] font-bold text-white/55 whitespace-nowrap">{c.label}</p>
            <p className={`text-[14px] font-black mt-px whitespace-nowrap ${c.gold ? 'text-[#FFE9A8]' : 'text-white'}`}>
              {c.value}
              {c.t === 1 && <span className="text-[#2FA084] text-[10px]"> ▲</span>}
              {c.t === -1 && <span className="text-[#E26D5C] text-[10px]"> ▼</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// =====================================================================
// 🏗️ كارت المشروع — التصميم الأبيض 3a
// نسختين: بصورة (ميديا 170px + العنوان على الصورة) / من غير صورة
// (بانر bannerTone 150px + نقشة نقط). زرارين: التفاصيل + اسأل عنه 🧞.
// logInquiry sendBeacon زي ما هو — بنسجّل الاستفسار قبل فتح الواتساب.
// =====================================================================
function ProjectCard({ it, onPlay }: { it: Item; onPlay: () => void }) {
  const { t } = useT()
  function logInquiry() {
    try {
      const body = JSON.stringify({ project_id: it.id, source: 'bourse_card' })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/projects/inquiry', new Blob([body], { type: 'application/json' }))
      } else {
        fetch('/api/projects/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {})
      }
    } catch { /* لو التسجيل فشل، الواتساب لازم يفتح برضه */ }
  }

  const price = fmtPrice(it)
  const hasCover = !!it.cover_url

  return (
    <div className="bg-white rounded-[18px] border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,.04)] overflow-hidden flex flex-col">
      <div className={`relative ${hasCover ? 'h-[170px]' : 'h-[150px]'}`}>
        {hasCover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.cover_url!}
              alt={it.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,.72),rgba(0,0,0,.08)_55%)]" />
            <span className="absolute bottom-0 inset-x-0 p-3">
              <span className="block text-white text-[16px] font-black leading-[1.3] line-clamp-2">{it.title}</span>
              {/* 🧹 (٢٨/٨) اسم المطوّر اتشال من الكارت */}
              {it.district && (
                <span className="block text-white/85 text-[10.5px] font-semibold mt-0.5 truncate">
                  {it.district}
                </span>
              )}
            </span>
          </>
        ) : (
          <span className={`absolute inset-0 bg-gradient-to-br ${bannerTone(it)} flex flex-col items-center justify-center gap-1.5 px-5 text-center`}>
            <span
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }}
            />
            <Building2 className="w-[30px] h-[30px] text-white/90 relative" strokeWidth={1.5} />
            <span className="relative text-white text-[15px] font-black leading-[1.35] line-clamp-2">{it.title}</span>
            {it.district && <span className="relative text-white/75 text-[11px] font-semibold">{it.district}</span>}
          </span>
        )}

        {price && (
          <span className="absolute top-2.5 left-2.5 bg-white/95 text-[#059669] text-[11.5px] font-black px-3 py-1.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,.15)]">
            {price}
          </span>
        )}

        {(it.video_url || it.brochure_url) && (
          <span className="absolute top-2.5 right-2.5 flex flex-col gap-[5px] items-end">
            {it.video_url && (
              <button
                onClick={onPlay}
                className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-[4px] text-white text-[9.5px] font-bold px-2.5 py-1 rounded-full"
              >
                <PlayCircle className="w-2.5 h-2.5" /> {t('bo.video')}
              </button>
            )}
            {it.brochure_url && (
              <a
                href={it.brochure_url}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-[4px] text-white text-[9.5px] font-bold px-2.5 py-1 rounded-full"
              >
                <FileText className="w-2.5 h-2.5" /> {t('bo.brochure')}
              </a>
            )}
          </span>
        )}
      </div>

      <div className="px-3.5 pt-3 pb-3.5 flex flex-col flex-1">
        {it.unit_label && <p className="text-[12.5px] font-semibold text-[#374151] mb-2">{it.unit_label}</p>}
        {(it.payment_plan || it.delivery_label) && (
          <div className="flex flex-col gap-1 mb-3">
            {it.payment_plan && (
              <span className="flex items-start gap-1.5 text-[11px] text-[#4B5563] leading-relaxed">
                <Wallet className="w-3 h-3 shrink-0 mt-[3px] text-[#2FA084]" strokeWidth={2} />
                {it.payment_plan}
              </span>
            )}
            {it.delivery_label && (
              <span className="flex items-start gap-1.5 text-[11px] text-[#4B5563] leading-relaxed">
                <CalendarClock className="w-3 h-3 shrink-0 mt-[3px] text-[#2FA084]" strokeWidth={2} />
                {it.delivery_label}
              </span>
            )}
          </div>
        )}
        <div className="mt-auto flex gap-2">
          <Link
            href={`/real-estate/projects/${it.slug}`}
            className="flex-1 inline-flex items-center justify-center py-2.5 rounded-full border-2 border-[#059669]/20 text-[#059669] text-[12px] font-extrabold"
          >
            {t('bo.details')}
          </Link>
          <a
            href={inquiryWaLink(it)}
            onClick={logInquiry}
            target="_blank"
            rel="noopener"
            className="flex-1 inline-flex items-center justify-center py-2.5 rounded-full bg-[#34D399] text-[#04352A] text-[12px] font-extrabold"
          >
            {t('bo.ask')}
          </a>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// 🔥 كارت الفرصة — 230px سكرول عرضي: بادج النوع + السعر + العنوان + زرار
// =====================================================================
function OppCard({ op }: { op: Opportunity }) {
  const { t } = useT()
  const sale = op.offer_type === 'sale'
  const waMsg =
    t('bo.wa_ask', { title: op.title }) +
    `${op.area_label ? ' — ' + op.area_label : ''} (كود ${op.id.slice(0, 8)})`
  return (
    <div className="flex-none w-[230px] bg-white rounded-2xl border border-black/5 p-3.5 flex flex-col gap-[7px]">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[9.5px] font-extrabold px-[9px] py-[3px] rounded-full whitespace-nowrap ${
            sale ? 'text-[#059669] bg-[#34D399]/10' : 'text-[#D4A017] bg-[#D4A017]/[.12]'
          }`}
        >
          {t(KIND_KEY[op.kind] || 'bo.property')} · {sale ? t('bo.for_sale') : t('bo.for_rent')}
        </span>
        {op.price_label && (
          <span className="text-[13px] font-black text-[#059669] whitespace-nowrap">{op.price_label}</span>
        )}
      </div>
      <p className="text-[12.5px] font-extrabold text-[#111827] leading-[1.45] line-clamp-3">
        {op.title}
        {op.area_label ? ` — ${op.area_label}` : ''}
      </p>
      <a
        href={`https://wa.me/201002229982?text=${encodeURIComponent(waMsg)}`}
        target="_blank"
        rel="noopener"
        className="mt-auto inline-flex items-center justify-center py-[9px] rounded-full bg-[#34D399] text-[#04352A] text-[11.5px] font-extrabold"
      >
        {t('bo.ask_unit')}
      </a>
    </div>
  )
}

/** رابط يوتيوب → embed. أي حاجة تانية = ملف فيديو مرفوع (<video>) */
function ytEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  )
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

function VideoModal({ it, onClose }: { it: Item; onClose: () => void }) {
  const { t } = useT()
  const embed = it.video_url ? ytEmbed(it.video_url) : null
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white font-bold text-sm">{it.title}</p>
          <button
            onClick={onClose}
            aria-label={t('bo.close')}
            className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {embed ? (
          <iframe
            src={`${embed}?autoplay=1`}
            title={t('bo.video') + ' ' + it.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full aspect-video rounded-xl bg-black"
          />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={it.video_url || ''}
            controls
            autoPlay
            playsInline
            preload="metadata"
            poster={it.cover_url || undefined}
            className="w-full rounded-xl bg-black max-h-[75vh]"
          />
        )}
        <a
          href={inquiryWaLink(it)}
          target="_blank"
          rel="noopener"
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#2FA084] text-white text-sm font-bold"
        >
          <MessageCircle className="w-4 h-4" />
          {t('bo.ask_item', { name: it.title })}
        </a>
      </div>
    </div>
  )
}
