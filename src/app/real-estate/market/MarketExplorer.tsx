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
// =====================================================================
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2, KeyRound, RefreshCcw, MessageCircle, Search, X,
  MapPin, Flame, Clock, Plus, FileText, PlayCircle, CalendarClock, Wallet, Sparkles,
} from 'lucide-react'
import { inquiryWaLink, projectCode, type MediaItem } from '@/lib/projects'

export type Item = {
  id: string
  slug: string
  area: string
  area_label: string
  city: string | null
  segment: 'developer' | 'resale' | 'rent'
  developer: string | null
  title: string
  unit_label: string | null
  price_from: number | null
  price_to: number | null
  price_unit: 'egp_total' | 'egp_per_m2' | 'egp_month' | 'egp_night'
  note: string | null
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

function fmtPrice(it: Item): string {
  const unit = UNIT_SUFFIX[it.price_unit] || ' ج'
  if (it.price_from != null && it.price_to != null)
    return `${fmtMoney(it.price_from)} – ${fmtMoney(it.price_to)}${unit}`
  if (it.price_from != null) return `يبدأ من ${fmtMoney(it.price_from)}${unit}`
  return 'السعر عند الطلب'
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
  }, [items, areaF, segF, nq])

  const filteredOps = useMemo(() => {
    if (segF === 'developer' || segF === 'resale' || segF === 'rent') return []
    if (areaF !== 'all' && segF === 'all') return []
    return opportunities.filter((op) => {
      if (segF === 'ops_sale' && op.offer_type !== 'sale') return false
      if (segF === 'ops_rent' && op.offer_type !== 'rent') return false
      if (!nq) return true
      const hay = norm([op.title, op.snippet, op.area_label, op.city, KIND_LABEL[op.kind]].filter(Boolean).join(' '))
      return hay.includes(nq)
    })
  }, [opportunities, segF, areaF, nq])

  const saleOps = filteredOps.filter((o) => o.offer_type === 'sale').slice(0, 12)
  const rentOps = filteredOps.filter((o) => o.offer_type === 'rent').slice(0, 12)
  const showOps = segF === 'all' || segF === 'ops_sale' || segF === 'ops_rent'
  const totalResults = filteredItems.length + (showOps ? saleOps.length + rentOps.length : 0)

  // المناطق اللي فيها نتايج بعد الفلترة — بنرسمها بالترتيب
  const visibleAreas = useMemo(() => {
    const set = new Set(filteredItems.map((it) => it.area_label))
    return areas.filter((a) => set.has(a.label))
  }, [areas, filteredItems])

  // 🔥 المشاريع اللي عليها ميديا (صورة/بروشور/فيديو) — بتتعرض في قسم فوق خالص.
  // من غير كده كانت بتتدفن تحت لأن العرض بيتقسّم بالمناطق، والمنطقة اللي فيها
  // أكتر مشاريع (قديمة وبلا صور) بتطلع الأول.
  const featured = useMemo(
    () =>
      filteredItems
        .filter((it) => it.segment === 'developer' && (it.cover_url || it.brochure_url || it.video_url))
        .slice(0, 12),
    [filteredItems],
  )

  const lastUpdate = items.length
    ? items.reduce((mx, it) => (it.updated_at > mx ? it.updated_at : mx), items[0].updated_at)
    : null
  const devCount = items.filter((i) => i.segment === 'developer').length

  return (
    <main className="max-w-4xl mx-auto px-4 pb-16">
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

      {/* 🆕 بانر التوضيح — الجديد في البورصة (يوليو 2026) */}
      <section className="mb-8">
        <div className="rounded-2xl bg-gradient-to-l from-[#1F6F5F] to-[#2FA084] p-6 md:p-7 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 shrink-0" />
            <h2 className="font-bold text-lg">جديد في البورصة</h2>
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
              مطور أو مسوق عقاري؟ دقيقتين وهيبقى قدام آلاف الباحثين يومياً.
            </p>
          </div>
        </div>
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

          {/* شرايط المناطق — مبنية من الداتا */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2 max-h-24 overflow-y-auto">
            <button
              onClick={() => setAreaF('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${areaF === 'all' ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-gray-700 border border-gray-200 hover:border-[#1F6F5F]/40'}`}
            >
              كل المناطق
            </button>
            {areas.map((a) => (
              <button
                key={a.label}
                onClick={() => setAreaF(areaF === a.label ? 'all' : a.label)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${areaF === a.label ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-gray-700 border border-gray-200 hover:border-[#1F6F5F]/40'}`}
              >
                <MapPin className="w-3 h-3" />
                {a.label}
                <span className="opacity-60">{a.count}</span>
              </button>
            ))}
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
          {/* 🔥 مشاريع بالصور والبروشور والفيديو — فوق خالص عشان تتشاف */}
          {featured.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#2FA084] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  مشاريع بالبروشور والفيديو
                </h2>
                <span className="text-xs text-gray-400">{featured.length}</span>
              </div>
              <p className="text-xs text-gray-500 mb-5 pr-1">
                أحدث المشاريع اللي المطورين نزّلوها بنفسهم — بالأسعار ونظام السداد والبروشور.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featured.map((it) => (
                  <ProjectCard key={`f-${it.id}`} it={it} onPlay={() => setVideoOpen(it)} />
                ))}
              </div>
            </section>
          )}

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {rows.map((it) => (
                            <ProjectCard key={it.id} it={it} onPlay={() => setVideoOpen(it)} />
                          ))}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={seg.key} className="mb-6">
                      <div className="flex items-baseline gap-2 mb-3 px-1">
                        <h3 className="font-bold text-gray-900">{seg.label}</h3>
                        <span className="text-xs text-gray-500">{seg.hint}</span>
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
                    </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {saleOps.map((op) => <OppCard key={op.id} op={op} />)}
                  </div>
                </div>
              )}

              {rentOps.length > 0 && (
                <div className="mb-2">
                  <h3 className="font-bold text-gray-900 mb-3 px-1">
                    🔑 للإيجار <span className="text-xs text-gray-400 font-normal">({rentOps.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rentOps.map((op) => <OppCard key={op.id} op={op} />)}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* 🏗️ CTA للمطورين — دلوقتي بيوديه لفورم فعلي مش واتساب بس */}
      <section className="mb-6">
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#2FA084]/40 p-6 md:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#2FA084]/10 text-[#2FA084] flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">انت مطور أو مسوق عقاري ومشروعك مش هنا؟</h3>
              <p className="text-sm text-gray-600">
                ضيفه بنفسك في دقيقتين — بالأسعار والبروشور والفيديو. أي منطقة في مصر.
              </p>
            </div>
          </div>
          <Link
            href={ADD_PROJECT}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2FA084] text-white font-bold text-sm shrink-0 hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            ضيف مشروعك
          </Link>
        </div>
      </section>

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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {it.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={it.cover_url}
          alt={it.title}
          loading="lazy"
          className="w-full h-36 object-cover"
        />
      )}

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="font-bold text-gray-900 leading-snug">{it.title}</h4>
          <Building2 className="w-4 h-4 text-[#2FA084] shrink-0 mt-1" />
        </div>

        {it.developer && <p className="text-xs text-gray-500 mb-2">المطور: {it.developer}</p>}
        {it.unit_label && <p className="text-xs text-gray-600 mb-2 leading-relaxed">{it.unit_label}</p>}

        <p className="text-[#1F6F5F] font-bold text-lg mb-2">{fmtPrice(it)}</p>

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

        {it.note && <p className="text-xs text-gray-500 leading-relaxed mb-3">{it.note}</p>}

        {/* الميديا */}
        {(it.brochure_url || it.video_url) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {it.brochure_url && (
              <a
                href={it.brochure_url}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:border-[#1F6F5F]/40 hover:text-[#1F6F5F] transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                البروشور PDF
              </a>
            )}
            {it.video_url && (
              <button
                onClick={onPlay}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:border-[#1F6F5F]/40 hover:text-[#1F6F5F] transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                فيديو المشروع
              </button>
            )}
          </div>
        )}

        <a
          href={inquiryWaLink(it)}
          onClick={logInquiry}
          target="_blank"
          rel="noopener"
          className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#1F6F5F] text-white text-xs font-bold hover:opacity-95 transition-opacity"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          اسأل عن المشروع ده
        </a>
        <p className="text-[10px] text-gray-300 text-center mt-1.5">{projectCode(it.id)}</p>
      </div>
    </div>
  )
}

function VideoModal({ it, onClose }: { it: Item; onClose: () => void }) {
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
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={it.video_url || ''}
          controls
          autoPlay
          playsInline
          preload="metadata"
          poster={it.cover_url || undefined}
          className="w-full rounded-xl bg-black max-h-[75vh]"
        />
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
