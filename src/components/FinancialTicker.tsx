'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Coins, RefreshCw } from 'lucide-react'

// ============================================================================
// FinancialTicker
//
// Live horizontal scrolling ticker showing:
//   - USD/EGP, EUR/EGP, GBP/EGP, SAR/EGP exchange rates
//   - Gold prices per gram (24K, 21K, 18K) in EGP
//
// Auto-refreshes every 5 minutes via /api/financial-data
// Smooth horizontal scroll animation
// ============================================================================

interface CurrencyRate {
  code: string
  name_ar: string
  flag: string
  rate: number
}

interface GoldPrice {
  karat: number
  label: string
  price_per_gram_egp: number
}

interface FinancialData {
  ok: boolean
  currencies: CurrencyRate[]
  gold: GoldPrice[]
  updated_at: string
}

export default function FinancialTicker() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const cacheBust = `?t=${Date.now()}`
        const res = await fetch(`/api/financial-data${cacheBust}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' },
        })
        const json = await res.json()
        if (!cancelled && json.ok) {
          setData(json)
        }
      } catch (e) {
        // silent fail
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    // Refresh every 60 seconds (matches API in-memory cache TTL)
    const interval = setInterval(load, 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (loading || !data) {
    return (
      <div className="bg-gradient-to-l from-[#2B4521] to-[#5A6E3A] text-white py-2 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 text-xs">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span className="font-bold">جاري تحميل أسعار الصرف والذهب...</span>
        </div>
      </div>
    )
  }

  // Build ticker items
  const items: Array<{ icon: string; label: string; value: string; isGold?: boolean }> = []

  data.currencies.forEach(c => {
    items.push({
      icon: c.flag,
      label: c.name_ar,
      value: `${c.rate.toFixed(2)} ج.م`,
    })
  })

  data.gold.forEach(g => {
    items.push({
      icon: '🥇',
      label: g.label,
      value: `${g.price_per_gram_egp.toLocaleString('ar-EG')} ج.م/جم`,
      isGold: true,
    })
  })

  // Duplicate items for seamless infinite scroll
  const tickerItems = [...items, ...items]

  return (
    <div
      className="bg-gradient-to-l from-[#2B4521] via-[#5A6E3A] to-[#2B4521] text-white py-2.5 overflow-hidden border-b border-white/10"
      dir="ltr"
    >
      <div className="max-w-full overflow-hidden relative">
        <div className="flex items-center gap-8 animate-scroll-rtl whitespace-nowrap">
          {/* Live badge stuck to start */}
          <div className="flex items-center gap-2 px-4 flex-shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest">LIVE</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#2FA084]" />
          </div>

          {tickerItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <span className="text-base leading-none">{item.icon}</span>
              <span className={`text-xs font-bold ${item.isGold ? 'text-[#FFD700]' : 'text-white/90'}`} dir="rtl">
                {item.label}:
              </span>
              <span className="text-xs font-black tabular-nums text-white" dir="ltr">
                {item.value}
              </span>
              <span className="text-white/30 mx-2">·</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-rtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll-rtl {
          animation: scroll-rtl 40s linear infinite;
        }
        .animate-scroll-rtl:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
