// src/components/PropertyMarketHomeSection.tsx
// =====================================================================
// 📊 قسم بورصة العقارات في الهوم — يجيب أرقام مختارة من
// property_market_items ويعرضها كبطاقة لايف + شريط لوجوهات المطورين + CTA.
// Server component — بيخفي نفسه تماماً لو مفيش داتا (fail-safe).
// v3 (27 Jul 2026): تصميم احترافي + شريط لوجوهات المطورين المتحرك (دينامك)
// =====================================================================
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { TrendingUp, ArrowLeft, RefreshCcw, Landmark, MapPin, KeyRound, Umbrella, ShieldCheck } from 'lucide-react'
import DeveloperLogosMarquee from './DeveloperLogosMarquee'

type Item = {
  area: 'new_capital' | 'new_cairo' | 'sahel'
  segment: 'developer' | 'resale' | 'rent'
  title: string
  price_from: number | null
  price_to: number | null
  price_unit: 'egp_total' | 'egp_per_m2' | 'egp_month' | 'egp_night'
  updated_at: string
}

const UNIT_SUFFIX: Record<Item['price_unit'], string> = {
  egp_total: ' ج',
  egp_per_m2: ' ج/م²',
  egp_month: ' ج/شهر',
  egp_night: ' ج/ليلة',
}

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

function fmtRange(it: Item): string {
  const unit = UNIT_SUFFIX[it.price_unit] || ' ج'
  if (it.price_from != null && it.price_to != null) return `${fmtMoney(it.price_from)} – ${fmtMoney(it.price_to)}${unit}`
  if (it.price_from != null) return `من ${fmtMoney(it.price_from)}${unit}`
  return '—'
}

export default async function PropertyMarketHomeSection() {
  let items: Item[] = []
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await sb
      .from('property_market_items')
      .select('area, segment, title, price_from, price_to, price_unit, updated_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    items = (data as Item[]) || []
  } catch {
    return null
  }
  if (items.length === 0) return null

  const capitalMeter = items.find((i) => i.area === 'new_capital' && i.segment === 'resale' && i.price_unit === 'egp_per_m2')
  const cairoMeter = items.find((i) => i.area === 'new_cairo' && i.segment === 'resale' && i.price_unit === 'egp_per_m2')
  const cairoRent = items.find((i) => i.area === 'new_cairo' && i.segment === 'rent')
  const sahelRent = items.find((i) => i.area === 'sahel' && i.segment === 'rent')
  const devCount = items.filter((i) => i.segment === 'developer').length
  const lastUpdate = items.reduce((mx, it) => (it.updated_at > mx ? it.updated_at : mx), items[0].updated_at)
  const lastUpdateLabel = (() => {
    try {
      return new Date(lastUpdate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
    } catch {
      return ''
    }
  })()

  const tiles = [
    capitalMeter && {
      icon: Landmark,
      area: 'العاصمة الإدارية',
      title: capitalMeter.title,
      value: fmtRange(capitalMeter),
      img: '/areas/capital.jpg',
    },
    cairoMeter && {
      icon: MapPin,
      area: 'التجمع الخامس',
      title: cairoMeter.title,
      value: fmtRange(cairoMeter),
      img: '/areas/newcairo.jpg',
    },
    sahelRent && {
      icon: Umbrella,
      area: 'الساحل — الصيف',
      title: sahelRent.title,
      value: fmtRange(sahelRent),
      img: '/areas/coast.jpg',
    },
    cairoRent && {
      icon: KeyRound,
      area: 'إيجارات التجمع',
      title: cairoRent.title,
      value: fmtRange(cairoRent),
      img: '/areas/rentals.jpg',
    },
  ].filter(Boolean) as Array<{ icon: typeof Landmark; area: string; title: string; value: string; img: string }>

  if (tiles.length === 0) return null

  return (
    <section className="relative py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section header */}
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2FA084] to-[#2B4521] text-white flex items-center justify-center shadow-lg shadow-[#2B4521]/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6FCF97] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FA084]" />
                </span>
                <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#2B4521]">LIVE MARKET</p>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">بورصة عقارات مضمونة</h2>
            </div>
          </div>
          {lastUpdateLabel && (
            <p className="text-[11px] md:text-xs text-gray-500 inline-flex items-center gap-1.5">
              <RefreshCcw className="w-3 h-3 text-[#2FA084]" />
              آخر تحديث: {lastUpdateLabel}
            </p>
          )}
        </div>

        {/* البطاقة الرئيسية */}
        <div className="bg-gradient-to-br from-white to-[#F3F1EA] border border-[#EAE4D7] rounded-3xl p-5 md:p-7 shadow-xl shadow-[#2B4521]/10 overflow-hidden relative">
          {/* لمسة ذهبية خفيفة في الخلفية */}
          <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 rounded-full bg-[#6FCF97]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-[#2FA084]/10 blur-3xl" />

          <Link href="/real-estate/market" className="block no-underline group relative">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {tiles.map((t) => (
                <div
                  key={t.area}
                  className="relative rounded-2xl overflow-hidden h-28 md:h-32 ring-1 ring-black/5 hover:ring-black/15 hover:-translate-y-0.5 transition-all duration-300 group/tile"
                >
                  {/* ⚡ next/image: تحويل تلقائي AVIF/WebP بمقاس الكارت (كانوا JPG خام ~90KB للواحدة) */}
                  <Image
                    src={t.img}
                    alt={t.area}
                    fill
                    sizes="(max-width: 768px) 45vw, 300px"
                    className="object-cover group-hover/tile:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
                  <div className="absolute inset-0 p-3 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5">
                      <t.icon className="w-3.5 h-3.5 text-[#6FCF97] shrink-0" />
                      <p className="text-[10px] font-black tracking-wider uppercase text-white drop-shadow truncate">{t.area}</p>
                    </div>
                    <div>
                      <p className="text-white/75 text-[10px] mb-0.5 truncate">{t.title}</p>
                      <p className="text-white font-black text-sm md:text-base leading-tight tabular-nums drop-shadow">{t.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-gray-600 text-xs md:text-sm inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2B4521] shrink-0" />
                أسعار {devCount > 0 ? `${devCount} مشروع من المطورين` : 'مشروعات المطورين'} + الريسيل + الإيجارات — العاصمة والتجمع والساحل
              </p>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2B4521] text-white font-bold text-sm group-hover:gap-3 transition-all shadow-lg">
                شوف كل الأسعار
                <ArrowLeft className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* شريط لوجوهات المطورين المتحرك — على شريحة فاتحة جوّه البطاقة */}
          <div className="mt-6 -mx-5 md:-mx-7 -mb-5 md:-mb-7 bg-white border-t border-[#EAE4D7] rounded-t-3xl px-5 md:px-7 pt-4 pb-5 relative">
            <DeveloperLogosMarquee />
          </div>
        </div>
      </div>
    </section>
  )
}
