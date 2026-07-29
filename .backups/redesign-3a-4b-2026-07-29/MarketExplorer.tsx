'use client'

// src/app/real-estate/market/MarketExplorer.tsx
// =====================================================================
// 🔎 مستكشف بورصة العقارات — بحث لايف + فلاتر (client component)
// ⚡ التغيير الكبير (12 Jul 2026): المناطق بقت DYNAMIC.
//    زمان كانت ٣ مناطق مكتوبة في الكود (العاصمة/التجمع/الساحل) وأي مشروع
//    بره التلاتة كان بيختفي. دلوقتي بنبني قايمة المناطق من الداتا نفسها
//    (area_label) — فأي مشروع في أي منطقة بيظهر أوتوماتيك.
// ➕ كل كارت مشروع بقى فيه: بروشور PDF · فيديو · وزرار «اسأل عن المشروع ده»
//    برسالة فيها كود المشروع → بنعرف كل استفسار عن أنهي مشروع بالظبط.
//
// 🎨 إعادة تصميم العرض (16 يوليو 2026) — الشكل كان بيأذي الصفحة:
//    1. **حيطة الفلاتر:** ٢٥ شريطة منطقة + ١٣ شريطة مطوّر في بار لاصق =
//       ٤٠٠ بكسل بتاكل نص الشاشة والمشاريع مدفونة تحتها، وجواها سكرول
//       متداخل (max-h-24 overflow-auto) — أسوأ نمط ممكن. بقوا قايمتين اختيار.
//    2. **العرض ضيّق:** max-w-4xl = ٨٩٦px على شاشة ١٤٤٠ — عمودين وبس
//       والباقي هوامش فاضية. بقى max-w-7xl و٤ أعمدة على الديسكتوب.
//    3. **التكرار:** قسم «مشاريع بالبروشور» كان بيعرض نفس الكروت اللي
//       بتتكرر تاني تحت في قسم منطقتها. اتشال — الترتيب بيرفع صاحب الصورة فوق.
//    4. **الترتيب مقلوب:** أول حاجة المشتري كان بيشوفها بانر أخضر بيقول
//       «ضيف مشروعك» — ده إعلان للمطوّرين. اتنقل تحت بعد المشاريع.
// =====================================================================
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2, KeyRound, RefreshCcw, MessageCircle, Search, X,
  MapPin, Flame, Clock, Plus, FileText, PlayCircle, CalendarClock, Wallet, Sparkles,
  ChevronDown,
} from 'lucide-react'
import {
  inquiryWaLink, projectCode, PROPERTY_TYPES, PROPERTY_TYPE_LABEL, PROPERTY_TYPE_ICON,
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

const ADD_LISTING = '/add-listing?src=re-market'
const ADD_PROJECT = '/add-project'
const WA_FOLLOW = `https://wa.me/201002229982?text=${encodeURIComponent('عايز أتابع تحديثات أسعار العقارات — المارد 🧞')}`

const UNIT_SUFFIX: Record<Item['price_unit'], string> = {
  egp_total: ' ج',
  egp_per_m2: ' ج/م²',
  egp_month: ' ج/شهر',
  egp_night: ' ج/ليلة',
}

const KIND_LABEL: Record<string, string> = {
  apartments: 'شقة',
  villas: 'فيلا',
  chalets: 'شاليه',
  offices: 'مكتب',
  commercial: 'تجاري',
}

const SEGMENTS = [
  { key: 'developer' as const, label: '🏗️ مشروعات المطورين', hint: 'إطلاقات وأسعار من السوق الأولي' },
  { key: 'resale' as const, label: '🔁 الريسيل وسعر المتر', hint: 'متوسطات السوق الثانوي' },
  { key: 'rent' as const, label: '🔑 الإيجارات', hint: 'متوسطات الإيجار' },
]

type SegFilter = 'all' | 'developer' | 'resale' | 'rent' | 'ops_sale' | 'ops_rent'
const SEG_CHIPS: Array<{ key: SegFilter; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'developer', label: 'مشروعات المطورين' },
  { key: 'resale', label: 'الريسيل' },
  { key: 'rent', label: 'الإيجارات' },
  { key: 'ops_sale', label: '🔥 فرص بيع' },
  { key: 'ops_rent', label: '🔥 فرص إيجار' },
]

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

// 🎨 (13 Jul 2026) المشاريع اللي لسه مالهاش صورة بتاخد بانر بهوية مضمونة —
// لون متدرّج حسب المنطقة عشان الشبكة تبقى حيّة مش رمادية مكررة.
function bannerTone(it: Item): string {
  const s = `${it.area_label || ''} ${it.city || ''}`
  if (/ساحل|علمين|رأس الحكمة|مارينا|سيدي|مطروح|جونة|سخنة|galala|جلالة/i.test(s))
    return 'from-[#0E7490] to-[#22D3EE]' // بحر
  if (/عاصمة|إدارية|capital/i.test(s))
    return 'from-[#1E3A8A] to-[#3B82F6]' // العاصمة
  if (/زايد|أكتوبر|اكتوبر|جيزة|october|zayed/i.test(s))
    return 'from-[#7C2D12] to-[#EA580C]' // غرب
  if (/تجمع|قاهرة الجديدة|مستقبل|شروق|عبور|مدينتي|new cairo/i.test(s))
    return 'from-[#1F6F5F] to-[#2FA084]' // شرق — هوية مضمونة
  return 'from-[#334155] to-[#64748B]' // الباقي
}

function fmtPrice(it: Item): string {
  const unit = UNIT_SUFFIX[it.price_unit] || ' ج'
  if (it.price_from != null && it.price_to != null)
    return `${fmtMoney(it.price_from)} – ${fmtMoney(it.price_to)}${unit}`
  if (it.price_from != null) return `يبدأ من ${fmtMoney(it.price_from)}${unit}`
  return ''
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
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

export default function MarketExplorer({
  items,
  opportunities,
}: {
  items: Item[]
  opportunities: Opportunity[]
}) {
  const [q, setQ] = useState('')
  const [areaF, setAreaF] = useState<'all' | string>('all')
  const [segF, setSegF] = useState<SegFilter>('all')
  // 🏷️ (14 Jul 2026) فلتر التصنيف — سكني/ساحلي/تجاري/مختلط
  const [typeF, setTypeF] = useState<'all' | PropertyType>('all')
  // 🏗️ (14 Jul 2026) فلتر المطوّر — ناس كتير بتدوّر بالمطوّر مش بالمنطقة
  const [devF, setDevF] = useState<'all' | string>('all')
  const [videoOpen, setVideoOpen] = useState<Item | null>(null)

  const nq = norm(q.trim())

  // 🔑 المناطق بتتبني من الداتا — مش من قايمة مكتوبة في الكود.
  // ترتيب: المناطق اللي فيها أكتر مشاريع الأول.
  const areas = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of items) counts.set(it.area_label, (counts.get(it.area_label) || 0) + 1)
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
      .map(([label, count]) => ({ label, count }))
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (areaF !== 'all' && it.area_label !== areaF) return false
      if (typeF !== 'all' && it.property_type !== typeF) return false
      if (devF !== 'all' && it.developer !== devF) return false
      if (segF === 'ops_sale' || segF === 'ops_rent') return false
      if (segF !== 'all' && it.segment !== segF) return false
      if (!nq) return true
      const hay = norm(
        [it.title, it.developer, it.unit_label, it.note, it.area_label, it.city, it.payment_plan]
          .filter(Boolean)
          .join(' '),
      )
      return hay.includes(nq)
    })
  }, [items, areaF, typeF, devF, segF, nq])

  // 🏷️ عدّاد كل تصنيف (بيتحسب من الداتا — التصنيفات الفاضية مبتظهرش)
  const typeCounts = useMemo(() => {
    const c = new Map<PropertyType, number>()
    for (const it of items) {
      if (it.property_type) c.set(it.property_type, (c.get(it.property_type) || 0) + 1)
    }
    return c
  }, [items])

  // 🏗️ المطوّرين — مبنيين من الداتا، الأكتر مشاريع الأول
  const developers = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of items) {
      if (it.segment === 'developer' && it.developer) {
        counts.set(it.developer, (counts.get(it.developer) || 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
      .map(([name, count]) => ({ name, count }))
  }, [items])

  const filteredOps = useMemo(() => {
    if (segF === 'developer' || segF === 'resale' || segF === 'rent') return []
    // الفرص مالهاش تصنيف ولا مطوّر — بتختفي لما نفلتر بأي منهم
    if (typeF !== 'all' || devF !== 'all') return []
    if (areaF !== 'all' && segF === 'all') return []
    return opportunities.filter((op) => {
      if (segF === 'ops_sale' && op.offer_type !== 'sale') return false
      if (segF === 'ops_rent' && op.offer_type !== 'rent') return false
      if (!nq) return true
      const hay = norm([op.title, op.snippet, op.area_label, op.city, KIND_LABEL[op.kind]].filter(Boolean).join(' '))
      return hay.includes(nq)
    })
  }, [opportunities, segF, areaF, typeF, devF, nq])

  const saleOps = filteredOps.filter((o) => o.offer_type === 'sale').slice(0, 12)
  const rentOps = filteredOps.filter((o) => o.offer_type === 'rent').slice(0, 12)
  const showOps = segF === 'all' || segF === 'ops_sale' || segF === 'ops_rent'
  const totalResults = filteredItems.length + (showOps ? saleOps.length + rentOps.length : 0)

  // المناطق اللي فيها نتايج بعد الفلترة — بنرسمها بالترتيب
  const visibleAreas = useMemo(() => {
    const set = new Set(filteredItems.map((it) => it.area_label))
    return areas.filter((a) => set.has(a.label))
  }, [areas, filteredItems])

  const lastUpdate = items.length
    ? items.reduce((mx, it) => (it.updated_at > mx ? it.updated_at : mx), items[0].updated_at)
    : null
  const devCount = items.filter((i) => i.segment === 'developer').length

  return (
    // 📐 كان max-w-4xl (896px) — على شاشة 1440 ده عمودين وهوامش فاضية على
    //    الجنبين. 84 مشروع محتاجين مساحة.
    <main className="max-w-7xl mx-auto px-4 pb-16">
      {/* Hero */}
      <section className="py-8 md:py-12 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1F6F5F]/10 rounded-full mb-4">
          <Flame className="w-3 h-3 text-[#1F6F5F]" />
          <span className="text-xs font-medium text-[#1F6F5F]">
            {devCount} مشروع في {areas.length} منطقة — وبيزيدوا
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">
          بورصة عقارات <span className="text-[#1F6F5F]">مضمونة</span>
        </h1>
        <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto mb-3">
          مشروعات المطورين بالبروشور والفيديو · الريسيل · الإيجارات · فرص حقيقية — دوّر وفلتر زي ما تحب.
        </p>
        {lastUpdate && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
            <RefreshCcw className="w-3 h-3 text-[#2FA084]" />
            آخر تحديث: {fmtDate(lastUpdate)} · بيتجدد يومياً
          </div>
        )}
      </section>

      {/* 🔎 شريط البحث والفلاتر */}
      <section className="sticky top-2 z-20 mb-8">
        <div className="bg-white/95 backdrop-blur rounded-2xl border border-gray-200 shadow-lg p-3 md:p-4">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="دوّر باسم المشروع أو المطور أو المنطقة... (مثلاً: Talda، HDP، مستقبل سيتي)"
              className="w-full rounded-full border border-gray-200 bg-[#FAFAF7] py-2.5 pr-10 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30 focus:border-[#1F6F5F]"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                aria-label="امسح البحث"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 🏷️ التصنيف — أول سؤال في دماغ أي حد: بدور على سكني ولا تجاري؟ */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <button
              onClick={() => setTypeF('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${typeF === 'all' ? 'bg-gray-900 text-white' : 'bg-[#FAFAF7] text-gray-700 border border-gray-200 hover:border-gray-400'}`}
            >
              كل الأنواع
            </button>
            {PROPERTY_TYPES.filter((t) => (typeCounts.get(t) || 0) > 0).map((t) => (
              <button
                key={t}
                onClick={() => setTypeF(typeF === t ? 'all' : t)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${typeF === t ? 'bg-gray-900 text-white' : 'bg-[#FAFAF7] text-gray-700 border border-gray-200 hover:border-gray-400'}`}
              >
                <span>{PROPERTY_TYPE_ICON[t]}</span>
                {PROPERTY_TYPE_LABEL[t]}
                <span className="opacity-60">{typeCounts.get(t)}</span>
              </button>
            ))}
          </div>

          {/* 📍🏗️ المنطقة والمطوّر — قايمتين اختيار مش حيطة شرايط.
              كانوا ٢٥ + ١٣ شريطة جوه سكرول متداخل في بار لاصق: بتاكل نص
              الشاشة، والمشاريع نفسها مدفونة تحتها. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <label className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#1F6F5F] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={areaF}
                onChange={(e) => setAreaF(e.target.value)}
                aria-label="المنطقة"
                className={`w-full appearance-none rounded-full border py-2 pr-9 pl-3 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30 ${areaF === 'all' ? 'bg-[#FAFAF7] border-gray-200 text-gray-700' : 'bg-[#1F6F5F]/10 border-[#1F6F5F]/40 text-[#1F6F5F]'}`}
              >
                <option value="all">كل المناطق ({areas.length})</option>
                {areas.map((a) => (
                  <option key={a.label} value={a.label}>{a.label} ({a.count})</option>
                ))}
              </select>
            </label>

            <label className="relative">
              <Building2 className="w-3.5 h-3.5 text-[#8B5CF6] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={devF}
                onChange={(e) => setDevF(e.target.value)}
                aria-label="المطوّر"
                disabled={developers.length < 2}
                className={`w-full appearance-none rounded-full border py-2 pr-9 pl-3 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 disabled:opacity-50 ${devF === 'all' ? 'bg-[#FAFAF7] border-gray-200 text-gray-700' : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/40 text-[#8B5CF6]'}`}
              >
                <option value="all">كل المطوّرين ({developers.length})</option>
                {developers.map((d) => (
                  <option key={d.name} value={d.name}>{d.name} ({d.count})</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SEG_CHIPS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSegF(segF === s.key && s.key !== 'all' ? 'all' : s.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${segF === s.key ? 'bg-[#2FA084] text-white' : 'bg-[#FAFAF7] text-gray-700 border border-gray-200 hover:border-[#2FA084]/50'}`}
              >
                {s.label}
              </button>
            ))}
            <span className="text-[11px] text-gray-400 mr-auto pr-1">{totalResults} نتيجة</span>
          </div>
        </div>
      </section>

      {totalResults === 0 ? (
        <section className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-600 mb-10">
          <Clock className="w-8 h-8 mx-auto mb-3 text-[#1F6F5F]" />
          مفيش نتايج للبحث ده — جرب كلمة تانية أو شيل الفلاتر 🙏
          <div className="mt-4">
            <button
              onClick={() => { setQ(''); setAreaF('all'); setSegF('all') }}
              className="px-5 py-2 rounded-full bg-[#1F6F5F] text-white text-sm font-bold"
            >
              اعرض كل حاجة
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* ⛔ (16 يوليو) قسم «مشاريع بالبروشور والفيديو» اتشال — كان بيعرض
              نفس الكروت اللي بتظهر تاني تحت في قسم منطقتها. نفس المشروع
              مرتين في نفس الصفحة. ترتيب الجلب أصلاً بيرفع اللي معاه صورة فوق. */}

          {visibleAreas.map((areaDef) => {
            const areaItems = filteredItems.filter((it) => it.area_label === areaDef.label)
            if (areaItems.length === 0) return null
            return (
              <section key={areaDef.label} className="mb-12 scroll-mt-32">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#1F6F5F] text-white flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">{areaDef.label}</h2>
                  <span className="text-xs text-gray-400">{areaItems.length}</span>
                </div>

                {SEGMENTS.map((seg) => {
                  const rows = areaItems.filter((it) => it.segment === seg.key)
                  if (rows.length === 0) return null

                  if (seg.key === 'developer') {
                    return (
                      <div key={seg.key} className="mb-6">
                        <div className="flex items-baseline gap-2 mb-3 px-1">
                          <h3 className="font-bold text-gray-900">{seg.label}</h3>
                          <span className="text-xs text-gray-500">{rows.length} مشروع</span>
                        </div>
                        {/* 4 أعمدة على الشاشات العريضة — كانوا 2 بحد أقصى */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {rows.map((it) => (
                            <ProjectCard key={it.id} it={it} onPlay={() => setVideoOpen(it)} />
                          ))}
                        </div>
                      </div>
                    )
                  }

                  // 🔽 (16 Jul 2026) طلب محمد: متوسطات الريسيل/الإيجار كانت قايمة مفرودة
                  // طويلة «شكلها مش حلو» — بقت دروب ليست منسدلة: سطر واحد لكل منطقة،
                  // تدوس عليه يفتح الجدول. الصفحة اتضغطت والمشاريع بقت البطل.
                  return (
                    <details key={seg.key} className="mb-4 group/avg bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:bg-gray-50/60 transition-colors">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm">{seg.label}</h3>
                          <span className="text-xs text-gray-400 hidden sm:inline">{seg.hint}</span>
                        </div>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-[#1F6F5F] bg-[#1F6F5F]/8 px-2 py-0.5 rounded-full">
                            {rows.length} {seg.key === 'rent' ? 'نوع وحدة' : 'متوسط'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open/avg:rotate-180" />
                        </span>
                      </summary>
                      <div className="border-t border-gray-100">
                        {rows.map((it, i) => (
                          <div
                            key={it.id}
                            className={`flex items-center justify-between gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">{it.title}</p>
                              {(it.unit_label || it.note) && (
                                <p className="text-xs text-gray-500 truncate">
                                  {[it.unit_label, it.note].filter(Boolean).join(' — ')}
                                </p>
                              )}
                            </div>
                            <p className="text-[#1F6F5F] font-bold text-sm whitespace-nowrap">{fmtPrice(it)}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                })}
              </section>
            )
          })}

          {/* 🔥 فرص معروضة دلوقتي */}
          {showOps && (saleOps.length > 0 || rentOps.length > 0) && (
            <section id="opportunities" className="mb-12 scroll-mt-32">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#1F6F5F] text-white flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">فرص معروضة دلوقتي 🔥</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5 pr-1">
                إعلانات حقيقية من السوق بسعر واضح — اسأل عن أي وحدة واتساب والمارد 🧞 يوصّلك بصاحبها بمعاملة مضمونة.
              </p>

              {saleOps.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3 px-1">
                    🏷️ للبيع <span className="text-xs text-gray-400 font-normal">({saleOps.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {saleOps.map((op) => <OppCard key={op.id} op={op} />)}
                  </div>
                </div>
              )}

              {rentOps.length > 0 && (
                <div className="mb-2">
                  <h3 className="font-bold text-gray-900 mb-3 px-1">
                    🔑 للإيجار <span className="text-xs text-gray-400 font-normal">({rentOps.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {rentOps.map((op) => <OppCard key={op.id} op={op} />)}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* 🏗️ للمطوّرين — بعد المشاريع مش قبلها.
          البانر ده والكارت المنقّط اللي كان تحته كانوا بيقولوا نفس الكلام
          («ضيف مشروعك») في نفس الصفحة — اتدمجوا في واحد. */}
      <DevelopersBanner />

      <p className="text-[11px] text-gray-400 text-center mb-10 leading-relaxed max-w-2xl mx-auto">
        الأسعار استرشادية من المطورين والمسوّقين وبتتغير باستمرار — راجع المطور قبل أي قرار.
        مضمونة بتوصّلك وبتضمن المعاملة.
      </p>

      {/* CTA band */}
      <section className="bg-[#1F6F5F] rounded-2xl p-8 md:p-10 text-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">عندك وحدة عايز تبيعها أو تأجّرها؟</h2>
        <p className="text-white/80 text-sm mb-5">
          ضيفها على مضمونة ببلاش — حماية كاملة، وعمولة ١٠٪ على الحجز الناجح بس.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={ADD_LISTING}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-[#1F6F5F] font-bold shadow-lg hover:bg-gray-50 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            ضيف الليستنج
          </Link>
          <a
            href={WA_FOLLOW}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            كلّم المارد 🧞
          </a>
        </div>
      </section>

      {videoOpen && <VideoModal it={videoOpen} onClose={() => setVideoOpen(null)} />}
    </main>
  )
}

// =====================================================================
// 🏗️ بانر المطوّرين — بيتعرض **بعد** المشاريع.
// كان فوق خالص، فأول حاجة يشوفها المشتري كانت إعلان موجّه للمطوّرين.
// =====================================================================
function DevelopersBanner() {
  return (
    <section className="mb-8">
      <div className="rounded-2xl bg-gradient-to-l from-[#1F6F5F] to-[#2FA084] p-6 md:p-7 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 shrink-0" />
          <h2 className="font-bold text-lg">انت مطوّر أو مسوّق عقاري؟</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="flex gap-2.5">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-white/80" />
            <div>
              <p className="font-bold text-sm mb-0.5">أي منطقة في مصر</p>
              <p className="text-xs text-white/80 leading-relaxed">
                مش بس العاصمة والتجمع والساحل — مستقبل سيتي، العبور، السخنة، هليوبوليس،
                رأس الحكمة… مشروعك هيظهر مهما كانت منطقته.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <FileText className="w-4 h-4 shrink-0 mt-0.5 text-white/80" />
            <div>
              <p className="font-bold text-sm mb-0.5">بروشور PDF + فيديو</p>
              <p className="text-xs text-white/80 leading-relaxed">
                ارفع البروشور وفيديو المشروع مع الأسعار ونظام السداد — بيتضغطوا أوتوماتيك
                عشان الصفحة تفتح بسرعة على الموبايل.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <MessageCircle className="w-4 h-4 shrink-0 mt-0.5 text-white/80" />
            <div>
              <p className="font-bold text-sm mb-0.5">استفسارات موصولة بمشروعها</p>
              <p className="text-xs text-white/80 leading-relaxed">
                كل مشروع ليه زرار «اسأل عن المشروع ده» — المارد 🧞 بيعرف العميل بيسأل عن
                أنهي مشروع بالظبط ويوصّله بيك.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href={ADD_PROJECT}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#1F6F5F] font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            ضيف مشروعك ببلاش
          </Link>
          <p className="text-xs text-white/75 text-center sm:text-right">
            دقيقتين وهيبقى قدام آلاف الباحثين يومياً.
          </p>
        </div>
      </div>
    </section>
  )
}

// =====================================================================
// كارت المشروع — بروشور + فيديو + زرار استفسار متتبَّع بكود المشروع
// =====================================================================
function ProjectCard({ it, onPlay }: { it: Item; onPlay: () => void }) {
  // بنسجّل الاستفسار قبل ما الواتساب يفتح — sendBeacon عشان مايعطلش الفتح
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

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">
      {/* 🖼️ الميديا هي البطل */}
      <div className="relative h-52 overflow-hidden">
        {it.cover_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.cover_url}
              alt={it.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* تدرّج تحت عشان النص يبان */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-4">
              <h4 className="text-white font-bold text-base leading-snug drop-shadow line-clamp-2">
                {it.title}
              </h4>
              {/* المطوّر + الحتة بالظبط تحت العنوان على الصورة */}
              <p className="text-white/85 text-[11px] mt-0.5 drop-shadow">
                {[it.developer, it.district].filter(Boolean).join(' · ')}
              </p>
            </div>
          </>
        ) : (
          // 🎨 مفيش صورة؟ بانر بهوية مضمونة — مش كارت فاضي
          <div className={`w-full h-full bg-gradient-to-br ${bannerTone(it)} relative flex flex-col items-center justify-center gap-2.5 px-5 text-center`}>
            {/* نقشة خفيفة */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '18px 18px',
              }}
            />
            <Building2 className="w-9 h-9 text-white/90 relative" strokeWidth={1.5} />
            <p className="text-white font-bold text-[15px] leading-snug line-clamp-2 relative drop-shadow-sm">
              {it.title}
            </p>
            {it.developer && (
              <p className="text-white/75 text-[11px] relative">{it.developer}</p>
            )}
            {it.area_label && (
              <span className="relative mt-1 text-[10px] text-white/90 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
                📍 {it.area_label}
              </span>
            )}
          </div>
        )}

        {/* 🏷️ شارات فوق الصورة */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {it.video_url && (
            <button
              onClick={onPlay}
              className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full hover:bg-black/80 transition-colors"
            >
              <PlayCircle className="w-3 h-3" /> فيديو
            </button>
          )}
          {it.brochure_url && (
            <a
              href={it.brochure_url}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1 rounded-full hover:bg-black/80 transition-colors"
            >
              <FileText className="w-3 h-3" /> بروشور
            </a>
          )}
        </div>

        {/* 💰 السعر — بادج بارز */}
        {fmtPrice(it) && (
          <div className="absolute top-3 left-3">
            <span className="bg-white/95 backdrop-blur-sm text-[#1F6F5F] font-bold text-xs px-3 py-1.5 rounded-full shadow-sm">
              {fmtPrice(it)}
            </span>
          </div>
        )}

        {/* 📷 مؤشر عدد الصور — لما فيه معرض (بيقول للناس فيه أكتر) */}
        {it.cover_url && (it.media?.length || 0) > 1 && (
          <div className="absolute bottom-3 left-3">
            <span className="flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              {it.media!.length}
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* العنوان والسعر فوق على الصورة — هنا التفاصيل بس */}
        {it.area_label && it.cover_url && (
          <p className="text-[11px] text-gray-500 mb-2 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#2FA084]" />
            {it.area_label}
          </p>
        )}
        {it.unit_label && (
          <p className="text-[13px] text-gray-700 mb-2.5 leading-relaxed font-medium">{it.unit_label}</p>
        )}

        {(it.payment_plan || it.delivery_label) && (
          <div className="space-y-1 mb-2">
            {it.payment_plan && (
              <p className="text-[11px] text-gray-600 leading-relaxed flex gap-1.5">
                <Wallet className="w-3 h-3 shrink-0 mt-0.5 text-[#2FA084]" />
                <span>{it.payment_plan}</span>
              </p>
            )}
            {it.delivery_label && (
              <p className="text-[11px] text-gray-600 flex gap-1.5 items-center">
                <CalendarClock className="w-3 h-3 shrink-0 text-[#2FA084]" />
                <span>{it.delivery_label}</span>
              </p>
            )}
          </div>
        )}

        {it.note && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">{it.note}</p>
        )}
        {/* شارات الميديا فوق على الصورة — مش هنا تاني */}

        {/* 🔗 (14 Jul 2026) زرارين: صفحة المشروع الكاملة (معرض+فيديو+تفاصيل) + الواتساب */}
        <div className="mt-auto flex gap-2">
          <Link
            href={`/real-estate/projects/${it.slug}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full border-2 border-[#1F6F5F]/20 text-[#1F6F5F] text-xs font-bold hover:bg-[#1F6F5F]/5 hover:border-[#1F6F5F]/40 transition-all"
          >
            <Building2 className="w-3.5 h-3.5" />
            التفاصيل
          </Link>
          <a
            href={inquiryWaLink(it)}
            onClick={logInquiry}
            target="_blank"
            rel="noopener"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-[#1F6F5F] text-white text-xs font-bold hover:opacity-95 transition-opacity"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            اسأل عنه
          </a>
        </div>
        <p className="text-[10px] text-gray-300 text-center mt-1.5">{projectCode(it.id)}</p>
      </div>
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
            aria-label="اقفل"
            className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {embed ? (
          <iframe
            src={`${embed}?autoplay=1`}
            title={`فيديو ${it.title}`}
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
          اسأل عن {it.title}
        </a>
      </div>
    </div>
  )
}

function OppCard({ op }: { op: Opportunity }) {
  const waMsg =
    `أهلاً المارد 🧞 — عايز أسأل عن الفرصة دي من بورصة مضمونة: ${op.title}` +
    `${op.area_label ? ' — ' + op.area_label : ''} (كود ${op.id.slice(0, 8)})`
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1F6F5F]/10 text-[#1F6F5F] shrink-0">
            {KIND_LABEL[op.kind] || 'عقار'}
          </span>
          {(op.area_label || op.city) && (
            <span className="text-xs text-gray-500 inline-flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              {op.area_label || op.city}
            </span>
          )}
        </div>
        {op.price_label && (
          <span className="text-sm font-black text-[#1F6F5F] whitespace-nowrap shrink-0">{op.price_label}</span>
        )}
      </div>
      <h3 className="font-bold text-gray-900 text-sm mb-1.5">{op.title}</h3>
      {op.snippet && <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{op.snippet}</p>}
      <a
        href={`https://wa.me/201002229982?text=${encodeURIComponent(waMsg)}`}
        target="_blank"
        rel="noopener"
        className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#1F6F5F] text-white text-xs font-bold hover:opacity-95 transition-opacity"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        اسأل عن الوحدة دي
      </a>
    </div>
  )
}
