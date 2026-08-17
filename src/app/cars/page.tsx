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

const fmt = (n: number | null) => (n ? Number(n).toLocaleString('ar-EG') + ' ج' : 'اسأل عن السعر')

export default function CarsMarket() {
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
          <a href="/" className="text-sm font-black text-[#FAFAF7]">مضمونة</a>
          <span className="text-[10px] font-bold text-[#B9C7BF]">معاملاتك مضمونة</span>
        </div>
      </div>

      <header className="bg-[#14231E] text-white">
        <div className="max-w-3xl mx-auto px-5 pt-7 pb-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#4ADE80] mb-1">بيع · مركبات</p>
          <h1 className="text-3xl font-black">سوق العربيات</h1>
          {/* التبويب الرئيسي: العربيات (كل التصنيف) | المعارض (قايمة) */}
          <div className="flex gap-2 mt-4">
            {([['cars', '🚗 كل العربيات'], ['showrooms', '🏢 المعارض']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-colors ${tab === k ? 'bg-[#059669] text-white' : 'bg-white/10 text-[#D9E2DD]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {loading && <p className="text-center text-[#7C8A84] py-10">⏳ ثواني…</p>}

        {/* ═══ تبويب المعارض — قايمة المعارض ═══ */}
        {!loading && tab === 'showrooms' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {showrooms.length === 0 && <p className="text-[#7C8A84] col-span-2 text-center py-8">المعارض بتنضم واحد ورا التاني — قريب 👀</p>}
            {showrooms.map((s) => {
              const inner = (
                <div className="bg-white rounded-2xl border border-[#E5DFD3] p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 rounded-xl bg-[#E7F5EE] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {s.logo_url ? <img src={s.logo_url} alt={s.name} className="max-w-full max-h-full object-contain" /> : <span className="text-2xl">🏢</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[#14231E] leading-snug">{s.name}</p>
                    <p className="text-[11px] text-[#7C8A84] mt-0.5">
                      {[s.district, s.city].filter(Boolean).join(' · ')} · {Number(s.cars).toLocaleString('ar-EG')} عربية
                    </p>
                  </div>
                  <span className="mr-auto text-[#059669] font-black text-sm flex-shrink-0">ادخل ←</span>
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
            <FilterRow label="البايع" value={seller} onChange={(v) => setSeller(v as any)}
              options={[['all', 'الكل'], ['showroom', '🏢 معارض'], ['individual', '👤 أفراد']]} />
            {/* الحالة: زيرو | مستعمل */}
            <FilterRow label="الحالة" value={cond} onChange={(v) => setCond(v as any)}
              options={[['all', 'الكل'], ['zero', '✨ زيرو'], ['used', '🔄 مستعمل']]} />
            {/* النوع: ملاكي · ميكروباص · نقل … */}
            {types.length > 2 && (
              <FilterRow label="النوع" value={vtype} onChange={setVtype}
                options={types.map((t) => [t, t === 'all' ? 'الكل' : t])} />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {filtered.length === 0 && <p className="text-[#7C8A84] col-span-2 text-center py-8">مفيش عربيات بالفلاتر دي حاليًا</p>}
              {filtered.map((c) => (
                <Link key={c.id} href={`/l/${c.id}`}
                  className="bg-white rounded-2xl overflow-hidden border border-[#E5DFD3] hover:shadow-md transition-shadow">
                  <div className="h-44 bg-[#E7F5EE]" style={c.photo ? { backgroundImage: `url(${c.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {c.condition && <Chip>{c.condition === 'zero' ? '✨ زيرو' : '🔄 مستعمل'}</Chip>}
                      {c.vtype && c.vtype !== 'ملاكي' && <Chip>{c.vtype}</Chip>}
                      <Chip>{c.seller === 'showroom' ? '🏢 معرض' : '👤 فرد'}</Chip>
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
