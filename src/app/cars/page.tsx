'use client'

// ============================================================================
// 🚗 سوق العربيات — /cars
//
// (١٧ أغسطس ٢٠٢٦ — محمد: «عايز الكتيجوريز تظهر بشكل أفضل: بيع → مركبات →
//  (معارض أو أفراد) → زيرو ومستعمل → الأنواع (نقل وميكروباص…) وتبان بشكل
//  منسق. المنتجات تظهر كل التصنيف أما المعرض تفتح قايمة المعارض،
//  بالسعر متضاف ليها عمولة العربية 1%».)
//
// الأسعار هنا جاية من listings.price_egp اللي بقى **شامل العمولة** —
// الصافي بتاع البايع محفوظ في pricing_rules.net_price (هجرة
// cars_commission_1pct). الصفحة ماتحسبش أي عمولة بنفسها.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface Car {
  id: string; title: string; price: number | null
  city: string | null; district: string | null; photo: string | null
  seller: 'showroom' | 'individual'
  supplier_name: string | null; supplier_slug: string | null
  condition: 'zero' | 'used' | null; vtype: string | null
}
interface Showroom { slug: string | null; name: string; logo_url: string | null; district: string | null; city: string | null; cars: number }

export default function CarsMarket() {
  const { t, locale } = useT()
  // 🌍 (٢٧ أغسطس ٢٠٢٦) كانت بره الكومبوننت فمفيش عندها useT — اتنقلت جوّه.
  const fmt = (n: number | null) =>
    n ? Number(n).toLocaleString(locale.startsWith('ar') ? 'ar-EG' : 'en-US') + ' ' + t('bo.egp') : t('cr.ask_price')
  const [tab, setTab] = useState<'cars' | 'showrooms'>('cars')
  const [seller, setSeller] = useState<'all' | 'showroom' | 'individual'>('all')
  const [cond, setCond] = useState<'all' | 'zero' | 'used'>('all')
  const [vtype, setVtype] = useState<string>('all')
  const [cars, setCars] = useState<Car[]>([])
  const [showrooms, setShowrooms] = useState<Showroom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('public_cars_market')
      if (data?.ok) { setCars(data.cars || []); setShowrooms(data.showrooms || []) }
      setLoading(false)
    })()
  }, [])

  const types = useMemo(() => {
    const t = new Set<string>()
    cars.forEach((c) => c.vtype && t.add(c.vtype))
    return ['all', ...Array.from(t)]
  }, [cars])

  const filtered = cars.filter((c) =>
    (seller === 'all' || c.seller === seller) &&
    (cond === 'all' || c.condition === cond) &&
    (vtype === 'all' || c.vtype === vtype))

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7]">
      <div className="bg-[#14231E]">
        <div className="max-w-3xl mx-auto px-4 h-11 flex items-center justify-between">
          <a href="/" className="text-sm font-black text-[#FAFAF7]">{t('tn.brand')}</a>
          <span className="text-[10px] font-bold text-[#B9C7BF]">{t('common.slogan')}</span>
        </div>
      </div>

      <header className="bg-[#14231E] text-white">
        <div className="max-w-3xl mx-auto px-5 pt-7 pb-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#4ADE80] mb-1">{t('cr.eyebrow')}</p>
          <h1 className="text-3xl font-black">{t('cr.title')}</h1>
          {/* التبويب الرئيسي: العربيات (كل التصنيف) | المعارض (قايمة) */}
          <div className="flex gap-2 mt-4">
            {([['cars', t('cr.tab_cars')], ['showrooms', t('cr.tab_showrooms')]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-colors ${tab === k ? 'bg-[#059669] text-white' : 'bg-white/10 text-[#D9E2DD]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {loading && <p className="text-center text-[#7C8A84] py-10">{t('cr.loading')}</p>}

        {/* ═══ تبويب المعارض — قايمة المعارض ═══ */}
        {!loading && tab === 'showrooms' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {showrooms.length === 0 && <p className="text-[#7C8A84] col-span-2 text-center py-8">{t('cr.no_showrooms')}</p>}
            {showrooms.map((s) => {
              const inner = (
                <div className="bg-white rounded-2xl border border-[#E5DFD3] p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 rounded-xl bg-[#E7F5EE] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {s.logo_url ? <img src={s.logo_url} alt={s.name} className="max-w-full max-h-full object-contain" /> : <span className="text-2xl">🏢</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[#14231E] leading-snug">{s.name}</p>
                    <p className="text-[11px] text-[#7C8A84] mt-0.5">
                      {[s.district, s.city].filter(Boolean).join(' · ')} · {t('cr.n_cars', { n: Number(s.cars).toLocaleString(locale.startsWith('ar') ? 'ar-EG' : 'en-US') })}
                    </p>
                  </div>
                  <span className="mr-auto text-[#059669] font-black text-sm flex-shrink-0">{t('cr.enter')}</span>
                </div>
              )
              return s.slug ? <Link key={s.name} href={`/s/${s.slug}`}>{inner}</Link> : <div key={s.name}>{inner}</div>
            })}
          </div>
        )}

        {/* ═══ تبويب العربيات — كل التصنيف منسق ═══ */}
        {!loading && tab === 'cars' && (
          <>
            {/* البايع: معارض | أفراد */}
            <FilterRow label={t('cr.f_seller')} value={seller} onChange={(v) => setSeller(v as any)}
              options={[['all', t('cr.f_all')], ['showroom', t('cr.f_showroom')], ['individual', t('cr.f_individual')]]} />
            {/* الحالة: زيرو | مستعمل */}
            <FilterRow label={t('cr.f_condition')} value={cond} onChange={(v) => setCond(v as any)}
              options={[['all', t('cr.f_all')], ['zero', t('cr.f_zero')], ['used', t('cr.f_used')]]} />
            {/* النوع: ملاكي · ميكروباص · نقل … */}
            {types.length > 2 && (
              <FilterRow label={t('cr.f_type')} value={vtype} onChange={setVtype}
                options={types.map((ty) => [ty, ty === 'all' ? t('cr.f_all') : ty])} />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {filtered.length === 0 && <p className="text-[#7C8A84] col-span-2 text-center py-8">{t('cr.none')}</p>}
              {filtered.map((c) => (
                <Link key={c.id} href={`/l/${c.id}`}
                  className="bg-white rounded-2xl overflow-hidden border border-[#E5DFD3] hover:shadow-md transition-shadow">
                  <div className="h-44 bg-[#E7F5EE]" style={c.photo ? { backgroundImage: `url(${c.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {c.condition && <Chip>{c.condition === 'zero' ? t('cr.f_zero') : t('cr.f_used')}</Chip>}
                      {c.vtype && c.vtype !== 'ملاكي' && <Chip>{c.vtype}</Chip>}
                      <Chip>{c.seller === 'showroom' ? t('cr.showroom') : t('cr.individual')}</Chip>
                    </div>
                    <h3 className="font-black text-[#14231E] leading-snug">{c.title}</h3>
                    <p className="text-[11px] text-[#7C8A84] mt-1">
                      {[c.district, c.city].filter(Boolean).join(' · ')}
                      {c.seller === 'showroom' && c.supplier_name ? ` · ${c.supplier_name}` : ''}
                    </p>
                    <p className="text-lg font-black text-[#059669] mt-2">{fmt(c.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function FilterRow({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: (readonly [string, string])[] | string[][]
}) {
  return (
    <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      <span className="text-[11px] font-black text-[#7C8A84] flex-shrink-0 w-12">{label}</span>
      {options.map(([k, lbl]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${value === k ? 'bg-[#14231E] text-white' : 'bg-white border border-[#E5DFD3] text-[#4B5563]'}`}>
          {lbl}
        </button>
      ))}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="text-[10.5px] font-bold bg-[#E7F5EE] text-[#065F46] px-2 py-0.5 rounded-full">{children}</span>
}
