'use client'

// src/app/real-estate/market/MarketExplorer.tsx
// =====================================================================
// 🔎 مستكشف بورصة العقارات — بحث لايف + فلاتر (client component)
// بيستقبل الداتا من السيرفر ويدير: بحث نصي (مشروع/مطور/منطقة/وصف)،
// فلتر منطقة، فلتر قسم (مطورين/ريسيل/إيجار/فرص بيع/فرص إيجار)،
// عدادات نتايج، وCTA للمطورين يضيفوا مشاريعهم.
// =====================================================================
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2, KeyRound, RefreshCcw, MessageCircle, Search, X,
  Landmark, MapPin, Umbrella, Flame, Clock, Plus,
} from 'lucide-react'

export type Item = {
  id: string
  area: 'new_capital' | 'new_cairo' | 'sahel'
  segment: 'developer' | 'resale' | 'rent'
  developer: string | null
  title: string
  unit_label: string | null
  price_from: number | null
  price_to: number | null
  price_unit: 'egp_total' | 'egp_per_m2' | 'egp_month' | 'egp_night'
  note: string | null
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
const WA_FOLLOW = `https://wa.me/201002229982?text=${encodeURIComponent('عايز أتابع تحديثات أسعار العقارات في العاصمة والتجمع والساحل')}`
const WA_DEVELOPER = `https://wa.me/201002229982?text=${encodeURIComponent('أنا مطور/مسوق عقاري وعايز أضيف مشروعي في بورصة عقارات مضمونة')}`

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

const AREAS = [
  { key: 'new_capital' as const, label: 'العاصمة الإدارية', icon: Landmark },
  { key: 'new_cairo' as const, label: 'التجمع والقاهرة الجديدة', icon: MapPin },
  { key: 'sahel' as const, label: 'الساحل الشمالي', icon: Umbrella },
]

const SEGMENTS = [
  { key: 'developer' as const, label: '🏗️ مشروعات المطورين', hint: 'إطلاقات وأسعار من السوق الأولي' },
  { key: 'resale' as const, label: '🔁 الريسيل وسعر المتر', hint: 'متوسطات السوق الثانوي بالمنطقة' },
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
  return '—'
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
  const [areaF, setAreaF] = useState<'all' | Item['area']>('all')
  const [segF, setSegF] = useState<SegFilter>('all')

  const nq = norm(q.trim())

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (areaF !== 'all' && it.area !== areaF) return false
      if (segF === 'ops_sale' || segF === 'ops_rent') return false
      if (segF !== 'all' && it.segment !== segF) return false
      if (!nq) return true
      const hay = norm(
        [it.title, it.developer, it.unit_label, it.note, AREAS.find((a) => a.key === it.area)?.label]
          .filter(Boolean)
          .join(' '),
      )
      return hay.includes(nq)
    })
  }, [items, areaF, segF, nq])

  const filteredOps = useMemo(() => {
    if (segF === 'developer' || segF === 'resale' || segF === 'rent') return []
    // الفرص إعلانات على مستوى الجمهورية — لو مختار منطقة محددة نخفيها
    // إلا لو طالب الفرص صراحةً من الفلتر
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
          <span className="text-xs font-medium text-[#1F6F5F]">مرجع العقارات في مصر — {devCount} مشروع وبيزيدوا</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">
          بورصة عقارات <span className="text-[#1F6F5F]">مضمونة</span>
        </h1>
        <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto mb-3">
          مشروعات المطورين · الريسيل · الإيجارات · فرص بيع وإيجار حقيقية — دوّر وفلتر زي ما تحب.
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
              placeholder="دوّر باسم المشروع أو المطور أو المنطقة... (مثلاً: المراسم، سوديك، رأس الحكمة)"
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
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <button
              onClick={() => setAreaF('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${areaF === 'all' ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-gray-700 border border-gray-200 hover:border-[#1F6F5F]/40'}`}
            >
              كل المناطق
            </button>
            {AREAS.map((a) => (
              <button
                key={a.key}
                onClick={() => setAreaF(areaF === a.key ? 'all' : a.key)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${areaF === a.key ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-gray-700 border border-gray-200 hover:border-[#1F6F5F]/40'}`}
              >
                <a.icon className="w-3 h-3" />
                {a.label}
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
            <button onClick={() => { setQ(''); setAreaF('all'); setSegF('all') }} className="px-5 py-2 rounded-full bg-[#1F6F5F] text-white text-sm font-bold">
              اعرض كل حاجة
            </button>
          </div>
        </section>
      ) : (
        <>
          {AREAS.map((areaDef) => {
            const areaItems = filteredItems.filter((it) => it.area === areaDef.key)
            if (areaItems.length === 0) return null
            return (
              <section key={areaDef.key} id={areaDef.key} className="mb-12 scroll-mt-32">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#1F6F5F] text-white flex items-center justify-center">
                    <areaDef.icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">{areaDef.label}</h2>
                </div>

                {SEGMENTS.map((seg) => {
                  const rows = areaItems.filter((it) => it.segment === seg.key)
                  if (rows.length === 0) return null

                  if (seg.key === 'developer') {
                    return (
                      <div key={seg.key} className="mb-6">
                        <div className="flex items-baseline gap-2 mb-3 px-1">
                          <h3 className="font-bold text-gray-900">{seg.label}</h3>
                          <span className="text-xs text-gray-500">{seg.hint} · {rows.length} مشروع</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {rows.map((it) => (
                            <div key={it.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h4 className="font-bold text-gray-900 leading-snug">{it.title}</h4>
                                <Building2 className="w-4 h-4 text-[#2FA084] shrink-0 mt-1" />
                              </div>
                              {it.developer && (
                                <p className="text-xs text-gray-500 mb-2">المطور: {it.developer}</p>
                              )}
                              {it.unit_label && (
                                <p className="text-xs text-gray-600 mb-2">{it.unit_label}</p>
                              )}
                              <p className="text-[#1F6F5F] font-bold text-lg mb-1.5">{fmtPrice(it)}</p>
                              {it.note && <p className="text-xs text-gray-500 leading-relaxed">{it.note}</p>}
                            </div>
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
                إعلانات حقيقية من السوق بسعر واضح — اسأل عن أي وحدة واتساب وفريق مضمونة يوصّلك بصاحبها بمعاملة مضمونة. بتتجدد يومياً.
              </p>

              {saleOps.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3 px-1">🏷️ للبيع <span className="text-xs text-gray-400 font-normal">({saleOps.length})</span></h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {saleOps.map((op) => (
                      <OppCard key={op.id} op={op} />
                    ))}
                  </div>
                </div>
              )}

              {rentOps.length > 0 && (
                <div className="mb-2">
                  <h3 className="font-bold text-gray-900 mb-3 px-1">🔑 للإيجار <span className="text-xs text-gray-400 font-normal">({rentOps.length})</span></h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rentOps.map((op) => (
                      <OppCard key={op.id} op={op} />
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-400 text-center mt-4">
                العناوين والتفاصيل من إعلانات عامة — مضمونة بتوصّلك وبتضمن المعاملة، ومش طرف في الإعلان الأصلي.
              </p>
            </section>
          )}
        </>
      )}

      {/* 🏗️ CTA للمطورين — ده اللي بيكبّر المرجع */}
      <section className="mb-6">
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#2FA084]/40 p-6 md:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#2FA084]/10 text-[#2FA084] flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">انت مطور أو مسوق عقاري ومشروعك مش هنا؟</h3>
              <p className="text-sm text-gray-600">ابعتلنا تفاصيل مشروعك وهنضيفه في البورصة — قدام آلاف الباحثين يومياً.</p>
            </div>
          </div>
          <a
            href={WA_DEVELOPER}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2FA084] text-white font-bold text-sm shrink-0 hover:opacity-95 transition-opacity"
          >
            <MessageCircle className="w-4 h-4" />
            ضيف مشروعك
          </a>
        </div>
      </section>

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-400 text-center mb-10 leading-relaxed max-w-2xl mx-auto">
        الأسعار استرشادية مُجمّعة من مصادر سوق منشورة وبتتغير باستمرار — راجع المطور أو المعلن قبل أي قرار.
        مضمونة مش وسيط في مشروعات المطورين المعروضة هنا.
      </p>

      {/* CTA band */}
      <section className="bg-[#1F6F5F] rounded-2xl p-8 md:p-10 text-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">عندك وحدة في العاصمة أو التجمع أو الساحل؟</h2>
        <p className="text-white/80 text-sm mb-5">
          ضيفها على مضمونة ببلاش — حماية كاملة، فلوسك بتوصلك بسرعة، وعمولة 10% على الحجز الناجح بس.
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
            تابع تحديثات الأسعار واتساب
          </a>
        </div>
      </section>

      <p className="text-center text-xs text-gray-500">
        <Link href="/real-estate" className="text-[#1F6F5F] font-semibold hover:underline">
          → اعرف إزاي تأجّر عقارك مع مضمونة
        </Link>
      </p>
    </main>
  )
}

function OppCard({ op }: { op: Opportunity }) {
  const waMsg = `عايز أسأل عن الفرصة دي من بورصة مضمونة: ${op.title}${op.area_label ? ' — ' + op.area_label : ''} (كود ${op.id.slice(0, 8)})`
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
          <span className="text-sm font-black text-[#1F6F5F] whitespace-nowrap shrink-0">
            {op.price_label}
          </span>
        )}
      </div>
      <h3 className="font-bold text-gray-900 text-sm mb-1.5">{op.title}</h3>
      {op.snippet && (
        <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{op.snippet}</p>
      )}
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
