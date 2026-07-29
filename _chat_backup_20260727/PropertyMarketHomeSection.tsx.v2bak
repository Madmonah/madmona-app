// src/components/PropertyMarketHomeSection.tsx
// =====================================================================
// 📊 قسم بورصة العقارات في الهوم — يجيب أرقام مختارة من
// property_market_items ويعرضها كستريب لايف + CTA لصفحة البورصة.
// Server component — بيخفي نفسه تماماً لو مفيش داتا (fail-safe).
// v2 (9 Jul 2026): + كارت الساحل الشمالي + دعم الإيجار بالليلة
// =====================================================================
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { TrendingUp, ArrowLeft, RefreshCcw, Landmark, MapPin, KeyRound, Umbrella } from 'lucide-react'

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
    },
    cairoMeter && {
      icon: MapPin,
      area: 'التجمع الخامس',
      title: cairoMeter.title,
      value: fmtRange(cairoMeter),
    },
    sahelRent && {
      icon: Umbrella,
      area: 'الساحل — الصيف',
      title: sahelRent.title,
      value: fmtRange(sahelRent),
    },
    cairoRent && {
      icon: KeyRound,
      area: 'إيجارات التجمع',
      title: cairoRent.title,
      value: fmtRange(cairoRent),
    },
  ].filter(Boolean) as Array<{ icon: typeof Landmark; area: string; title: string; value: string }>

  if (tiles.length === 0) return null

  return (
    <section className="relative pb-8 md:pb-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section header — نفس نمط NEWS HUB */}
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1F6F5F] text-white flex items-center justify-center shadow-soft">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#1F6F5F]">LIVE MARKET</p>
              <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">بورصة عقارات مضمونة 📊</h2>
            </div>
          </div>
          {lastUpdateLabel && (
            <p className="text-[11px] md:text-xs text-gray-500 inline-flex items-center gap-1.5">
              <RefreshCcw className="w-3 h-3 text-[#2FA084]" />
              آخر تحديث: {lastUpdateLabel}
            </p>
          )}
        </div>

        {/* البطاقة الخضراء */}
        <Link href="/real-estate/market" className="block no-underline group">
          <div className="bg-[#1F6F5F] rounded-3xl p-5 md:p-7 shadow-card overflow-hidden relative">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {tiles.map((t) => (
                <div key={t.area} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <t.icon className="w-3.5 h-3.5 text-[#6FCF97]" />
                    <p className="text-[10px] font-bold tracking-wider uppercase text-white/70">{t.area}</p>
                  </div>
                  <p className="text-white/80 text-xs mb-1">{t.title}</p>
                  <p className="text-white font-black text-base md:text-lg leading-tight">{t.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-white/80 text-xs md:text-sm">
                أسعار {devCount > 0 ? `${devCount} مشروع من المطورين` : 'مشروعات المطورين'} + الريسيل + الإيجارات + فرص معروضة 🔥 — العاصمة والتجمع والساحل
              </p>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#1F6F5F] font-bold text-sm group-hover:gap-3 transition-all">
                شوف كل الأسعار
                <ArrowLeft className="w-4 h-4" />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}
