'use client'

// ============================================================
// src/components/WorldCupHomeSection.tsx
// Full World Cup live widget on the HOME page (Jul 5 2026).
// Shows match details inline: live (with minute), today, next,
// and latest results — auto-refresh 60s. Links to /world-cup.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Trophy, Radio, ChevronLeft, UtensilsCrossed } from 'lucide-react'

type WcTeam = { name: string; name_ar: string; crest: string | null; score: number | null; penalties?: number | null }
type WcMatch = {
  id: string
  stage: string | null
  group: string | null
  status: 'live' | 'finished' | 'scheduled'
  minute: string | null
  utc_date: string
  home: WcTeam
  away: WcTeam
}
type ApiPayload = { ok: boolean; matches: WcMatch[] }

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function timeStr(iso: string) {
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true }) } catch { return '' }
}
function dayStr(iso: string) {
  try { return new Date(iso).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' }) } catch { return '' }
}

export default function WorldCupHomeSection() {
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let stop = false
    const load = async () => {
      try {
        const r = await fetch('/api/world-cup', { cache: 'no-store' })
        const j = (await r.json()) as ApiPayload
        if (!stop) setData(j)
      } catch { /* keep last */ }
      if (!stop) setLoaded(true)
    }
    load()
    const t = setInterval(load, 60_000)
    return () => { stop = true; clearInterval(t) }
  }, [])

  const view = useMemo(() => {
    const now = new Date()
    const ms = data?.matches || []
    const live = ms.filter((m) => m.status === 'live')
    const today = ms.filter((m) => m.status !== 'live' && sameDay(new Date(m.utc_date), now))
    const next = ms.filter((m) => m.status === 'scheduled' && !sameDay(new Date(m.utc_date), now) && new Date(m.utc_date) > now).slice(0, 2)
    const results = ms.filter((m) => m.status === 'finished' && !sameDay(new Date(m.utc_date), now)).slice(-2).reverse()
    return { live, today, next, results }
  }, [data])

  // still loading or nothing at all → light fallback link (never a blank hole)
  if (!loaded || !data?.ok || (data?.matches?.length ?? 0) === 0) {
    if (!loaded) return null
    return (
      <Link
        href="/world-cup"
        className="flex items-center gap-3 bg-gradient-to-l from-[#34D399] to-[#2FA084] text-white rounded-2xl px-4 py-3.5 shadow-lg hover:-translate-y-0.5 transition-all"
      >
        <span className="text-2xl">⚽</span>
        <span className="flex-1 text-sm font-black">نتايج كأس العالم 2026 لايف</span>
        <ChevronLeft className="w-4 h-4" />
      </Link>
    )
  }

  const rows: { label: string; m: WcMatch; live?: boolean }[] = [
    ...view.live.map((m) => ({ label: 'لايف', m, live: true })),
    ...view.today.map((m) => ({ label: 'النهارده', m })),
    ...view.next.map((m) => ({ label: dayStr(m.utc_date), m })),
    ...view.results.map((m) => ({ label: dayStr(m.utc_date), m })),
  ].slice(0, 6)

  return (
    <section className="bg-white rounded-3xl shadow-lg overflow-hidden border border-[#059669]/10">
      {/* header */}
      <div className="bg-gradient-to-l from-[#34D399] to-[#2FA084] text-white px-4 py-3 flex items-center gap-2.5">
        <Trophy className="w-5 h-5 text-[#FFD700]" />
        <h2 className="flex-1 text-sm font-black">كأس العالم 2026 — لايف ⚽</h2>
        {view.live.length > 0 && (
          <span className="inline-flex items-center gap-1 bg-red-500 text-[10px] font-black px-2 py-0.5 rounded-full">
            <Radio className="w-3 h-3" /> {view.live.length} لايف
          </span>
        )}
        <Link href="/world-cup" className="inline-flex items-center gap-0.5 bg-white/15 hover:bg-white/25 text-[11px] font-black px-2.5 py-1 rounded-full transition">
          الكل <ChevronLeft className="w-3 h-3" />
        </Link>
      </div>

      {/* matches */}
      <div className="divide-y divide-gray-50">
        {rows.map(({ label, m, live }) => {
          const isEgypt = m.home.name_ar === 'مصر' || m.away.name_ar === 'مصر'
          const played = m.status !== 'scheduled'
          return (
            <Link
              key={m.id}
              href="/world-cup"
              className={`flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50/70 transition ${isEgypt ? 'bg-[#34D399]/5' : ''}`}
            >
              {/* label */}
              <span className={`w-14 flex-shrink-0 text-[9px] font-black text-center px-1 py-1 rounded-lg leading-tight ${
                live ? 'bg-red-50 text-red-500' : m.status === 'finished' ? 'bg-gray-100 text-gray-400' : 'bg-[#34D399]/8 text-[#059669]'
              }`}>
                {live ? (m.minute || 'لايف 🔴') : label}
              </span>

              {/* home */}
              <span className="flex-1 flex items-center gap-1.5 min-w-0 justify-end">
                <span className="text-[11px] font-black text-gray-800 truncate">{m.home.name_ar}</span>
                {m.home.crest && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.home.crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                )}
              </span>

              {/* score / time */}
              <span className="w-14 flex-shrink-0 text-center">
                {played ? (
                  <span className={`text-sm font-black tabular ${live ? 'text-red-500' : 'text-gray-900'}`} dir="ltr">
                    {m.home.score ?? 0}-{m.away.score ?? 0}
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-[#059669] tabular">{timeStr(m.utc_date)}</span>
                )}
              </span>

              {/* away */}
              <span className="flex-1 flex items-center gap-1.5 min-w-0">
                {m.away.crest && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.away.crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                )}
                <span className="text-[11px] font-black text-gray-800 truncate">{m.away.name_ar}</span>
              </span>
            </Link>
          )
        })}
      </div>

      {/* food cross-sell footer */}
      <Link
        href="/marketplace?category=food-general"
        className="flex items-center gap-2 px-4 py-2.5 bg-[#FAFAF7] hover:bg-[#34D399]/5 transition border-t border-gray-100"
      >
        <UtensilsCrossed className="w-4 h-4 text-[#d4a017]" />
        <span className="flex-1 text-[11px] font-black text-gray-700">اطلب أكل الماتش من مطاعم مضمونة — يوصلك قبل الصافرة 🍕</span>
        <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
      </Link>
    </section>
  )
}
