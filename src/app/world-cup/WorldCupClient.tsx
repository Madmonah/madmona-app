'use client'

// ============================================================
// /world-cup — client renderer
// Live scores auto-refresh every 45s from /api/world-cup.
// Sections: لايف دلوقتي → النهارده → بكرة وبعده → نتايج أمس
// + Madmona food cross-sell CTA (اطلب أكل الماتش).
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Trophy, RefreshCw, Radio, CalendarDays, History, UtensilsCrossed, Share2, ArrowRight } from 'lucide-react'

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
type ApiPayload = { ok: boolean; source: string | null; updated_at: string; matches: WcMatch[] }

const REFRESH_MS = 45_000

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function timeStr(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch { return '' }
}

function dayLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return '' }
}

export default function WorldCupClient() {
  const [data, setData] = useState<ApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [shared, setShared] = useState(false)

  async function load(silent = false) {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch('/api/world-cup', { cache: 'no-store' })
      const j = (await res.json()) as ApiPayload
      setData(j)
    } catch { /* keep last data */ }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load(true)
    const t = setInterval(() => load(true), REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  const groups = useMemo(() => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 86400_000)
    const live: WcMatch[] = []
    const today: WcMatch[] = []
    const upcoming: WcMatch[] = []
    const past: WcMatch[] = []
    for (const m of data?.matches || []) {
      const d = new Date(m.utc_date)
      if (m.status === 'live') live.push(m)
      else if (sameDay(d, now)) today.push(m)
      else if (d > now) upcoming.push(m)
      else if (m.status === 'finished' && (sameDay(d, yesterday) || d > yesterday)) past.push(m)
    }
    return { live, today, upcoming: upcoming.slice(0, 8), past: past.slice(-8).reverse() }
  }, [data])

  const hasEgypt = useMemo(
    () => (data?.matches || []).some((m) => m.home.name_ar === 'مصر' || m.away.name_ar === 'مصر'),
    [data],
  )

  async function share() {
    const txt = 'تابع نتايج كأس العالم 2026 لايف على مضمونة ⚽\nhttps://madmonacairo.com/world-cup'
    try {
      if (navigator.share) await navigator.share({ text: txt })
      else {
        await navigator.clipboard.writeText(txt)
        setShared(true)
        setTimeout(() => setShared(false), 1500)
      }
    } catch { /* cancelled */ }
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FAFAF7] text-[#0A0A0A] pb-16">
      {/* header */}
      <header className="bg-gradient-to-l from-[#FA8125] via-[#F98F2A] to-[#2FA084] text-white">
        <div className="max-w-3xl mx-auto px-5 pt-6 pb-7">
          <div className="flex items-center justify-between gap-3">
            <Link href="/pulse" className="w-9 h-9 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center transition">
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={share}
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full text-[11px] font-black transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shared ? 'اتنسخ ✓' : 'شير'}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#FFD700]" />
            </div>
            <div>
              <h1 className="text-xl font-black">كأس العالم 2026 ⚽</h1>
              <p className="text-xs font-bold text-white/80 mt-0.5">
                النتايج لايف — بتتحدث لوحدها كل دقيقة
                {refreshing && <RefreshCw className="inline w-3 h-3 mr-1.5 animate-spin" />}
              </p>
            </div>
          </div>
          {hasEgypt && (
            <p className="mt-3 text-[11px] font-black bg-white/15 rounded-xl px-3 py-2 inline-block">
              🇪🇬 مصر في المونديال — ماتشاتها معلّمة تحت
            </p>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-3 space-y-5">
        {loading && (
          <div className="bg-white rounded-3xl shadow-soft p-10 text-center">
            <RefreshCw className="w-6 h-6 text-[#FA8125] animate-spin mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-500">بنجيب النتايج...</p>
          </div>
        )}

        {!loading && (!data?.ok || (data?.matches?.length ?? 0) === 0) && (
          <div className="bg-white rounded-3xl shadow-soft p-8 text-center">
            <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h2 className="font-black text-gray-900 mb-1">النتايج مش متاحة دلوقتي</h2>
            <p className="text-xs font-bold text-gray-500 leading-relaxed">
              في مشكلة مؤقتة في مصدر البيانات — جرب تاني بعد دقيقة.
            </p>
            <button
              onClick={() => load()}
              className="mt-4 inline-flex items-center gap-2 bg-[#FA8125] text-white px-5 py-2.5 rounded-xl text-sm font-black"
            >
              <RefreshCw className="w-4 h-4" /> حدّث
            </button>
          </div>
        )}

        {/* LIVE */}
        {groups.live.length > 0 && (
          <Section
            icon={<Radio className="w-4 h-4 text-red-500" />}
            title="لايف دلوقتي 🔴"
            live
          >
            {groups.live.map((m) => <MatchRow key={m.id} m={m} />)}
          </Section>
        )}

        {/* TODAY */}
        {groups.today.length > 0 && (
          <Section icon={<CalendarDays className="w-4 h-4 text-[#FA8125]" />} title="ماتشات النهارده">
            {groups.today.map((m) => <MatchRow key={m.id} m={m} />)}
          </Section>
        )}

        {/* FOOD CROSS-SELL */}
        <div className="bg-gradient-to-l from-[#d4a017]/15 via-[#2FA084]/10 to-[#FA8125]/10 border border-[#FA8125]/15 rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-soft flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-6 h-6 text-[#FA8125]" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-sm text-gray-900">الماتش من غير أكل؟ 🍕</h3>
              <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                اطلب أكل الماتش من مطاعم مضمونة — والدليفري يوصلك قبل صافرة البداية
              </p>
            </div>
            <Link
              href="/marketplace?category=food-general"
              className="bg-[#FA8125] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all flex-shrink-0"
            >
              اطلب دلوقتي
            </Link>
          </div>
        </div>

        {/* UPCOMING */}
        {groups.upcoming.length > 0 && (
          <Section icon={<CalendarDays className="w-4 h-4 text-[#2FA084]" />} title="الجاي قريب">
            {groups.upcoming.map((m) => <MatchRow key={m.id} m={m} showDay />)}
          </Section>
        )}

        {/* RESULTS */}
        {groups.past.length > 0 && (
          <Section icon={<History className="w-4 h-4 text-gray-400" />} title="آخر النتايج">
            {groups.past.map((m) => <MatchRow key={m.id} m={m} showDay />)}
          </Section>
        )}

        {data?.updated_at && (
          <p className="text-center text-[10px] font-bold text-gray-400">
            آخر تحديث: {timeStr(data.updated_at)} · بيتحدث تلقائياً
          </p>
        )}
      </main>
    </div>
  )
}

function Section({ icon, title, live = false, children }: {
  icon: React.ReactNode; title: string; live?: boolean; children: React.ReactNode
}) {
  return (
    <section className={`bg-white rounded-3xl shadow-soft overflow-hidden ${live ? 'ring-2 ring-red-400/40' : ''}`}>
      <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-black text-gray-900">{title}</h2>
        {live && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </section>
  )
}

function MatchRow({ m, showDay = false }: { m: WcMatch; showDay?: boolean }) {
  const isEgypt = m.home.name_ar === 'مصر' || m.away.name_ar === 'مصر'
  const played = m.status !== 'scheduled'
  return (
    <div className={`px-4 py-3.5 ${isEgypt ? 'bg-[#FA8125]/5' : ''}`}>
      {(m.stage || m.group || showDay) && (
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5 text-center">
          {[m.stage, m.group, showDay ? dayLabel(m.utc_date) : null].filter(Boolean).join(' · ')}
        </p>
      )}
      <div className="flex items-center gap-2">
        <TeamCell t={m.home} align="right" />
        <div className="flex-shrink-0 w-[74px] text-center">
          {played ? (
            <div>
              <p className="text-lg font-black tabular text-gray-900 leading-none" dir="ltr">
                {m.home.score ?? 0} - {m.away.score ?? 0}
              </p>
              {(m.home.penalties != null && m.away.penalties != null) && (
                <p className="text-[9px] font-bold text-gray-400 mt-0.5" dir="ltr">
                  ({m.home.penalties}-{m.away.penalties}) ركلات
                </p>
              )}
              {m.status === 'live' ? (
                <p className="text-[10px] font-black text-red-500 mt-0.5 animate-pulse" dir="ltr">{m.minute || 'LIVE'}</p>
              ) : (
                <p className="text-[9px] font-bold text-gray-400 mt-0.5">انتهت</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm font-black text-[#FA8125] tabular">{timeStr(m.utc_date)}</p>
              <p className="text-[9px] font-bold text-gray-400 mt-0.5">لسه</p>
            </div>
          )}
        </div>
        <TeamCell t={m.away} align="left" />
      </div>
    </div>
  )
}

function TeamCell({ t, align }: { t: WcTeam; align: 'right' | 'left' }) {
  return (
    <div className={`flex-1 flex items-center gap-2 min-w-0 ${align === 'left' ? 'flex-row-reverse' : ''}`}>
      {t.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.crest} alt={t.name_ar} className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
      ) : (
        <span className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0" />
      )}
      <span className={`text-xs font-black text-gray-800 truncate ${align === 'left' ? 'text-left' : 'text-right'} flex-1`}>
        {t.name_ar}
      </span>
    </div>
  )
}
