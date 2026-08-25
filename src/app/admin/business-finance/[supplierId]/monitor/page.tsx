'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Loader2, RefreshCw, AlertCircle, Radio,
  CheckCircle2, Clock, Flame, Coffee,
} from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'

/* ============================================================================
   /admin/business-finance/[supplierId]/monitor — «المونيتور»
   ============================================================================
   🎯 (٢٥ أغسطس ٢٠٢٦) محمد: «محتاج أداة تعمل مونيتور».

   شاشة حية بتجاوب على سؤال واحد: **كل واحد في الفريق واقف فين دلوقتي؟**
   حاضر ولا لأ ومن امتى · خلّص كام تاسك من كام · عليه إيه دلوقتي ·
   إيه المتأخر · وآخر حاجة قفلها. بتتحدث لوحدها كل ٦٠ ثانية.

   الداتا كلها من نداء واحد get_team_monitor() — بيقرا من daily_tasks
   وattendance_logs الحية (قاعدة محمد: «التقارير تقرا من داتا حية مش
   جداول ميتة»). الميعاد المعروض جنب كل تاسك محسوب من **حضور صاحبها
   الفعلي** مش من ساعة حائط (anchor_mode='clockin').
   ============================================================================ */

type Member = {
  employee_id: string; name: string; team: string
  clock_in: string | null; present_now: boolean; hours_today: number
  tasks_total: number; tasks_done: number; tasks_overdue: number
  current_task: { title: string; due: string; priority: string } | null
  next_task: { title: string; due: string; priority: string } | null
  last_done: { title: string; at: string } | null
}

const TEAM_ORDER = ['مبيعات', 'دعم فني', 'أوفيس', 'إشراف', 'الإدارة']

export default function MonitorPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [team, setTeam] = useState<Member[]>([])
  const [now, setNow] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(async () => {
    const { data, error } = await financeRpc('get_team_monitor', { p_supplier_id: supplierId })
    if (error) { setErr(error.message); setLoading(false); return }
    if (!data || data.ok === false) { setErr(data?.error || 'مالكش صلاحية'); setLoading(false); return }
    setErr(null)
    setTeam((data.team || []) as Member[])
    setNow(data.now || '')
    setLoading(false)
  }, [supplierId])

  // تحديث تلقائي كل دقيقة — من غير ما يقطع اللي بيتفرج (مفيش لودر تاني)
  useEffect(() => { load() }, [load, tick])
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const groups = useMemo(() => {
    const by = new Map<string, Member[]>()
    team.forEach(m => { if (!by.has(m.team)) by.set(m.team, []); by.get(m.team)!.push(m) })
    return [...by.entries()].sort((a, b) =>
      (TEAM_ORDER.indexOf(a[0]) + 99 * +(TEAM_ORDER.indexOf(a[0]) < 0))
      - (TEAM_ORDER.indexOf(b[0]) + 99 * +(TEAM_ORDER.indexOf(b[0]) < 0)))
  }, [team])

  const present = team.filter(m => m.present_now).length
  const totDone = team.reduce((s, m) => s + m.tasks_done, 0)
  const totAll = team.reduce((s, m) => s + m.tasks_total, 0)
  const totLate = team.reduce((s, m) => s + m.tasks_overdue, 0)

  if (loading) {
    return <div className="min-h-screen bg-[#FAFAF7] grid place-items-center" dir="rtl">
      <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
    </div>
  }

  if (err) {
    return <div className="min-h-screen bg-[#FAFAF7] grid place-items-center px-4" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-sm">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
        <p className="font-black text-[#1A2E26]">المونيتور مش راضي يتحمّل</p>
        <p className="text-xs text-[#6B7280] mt-2 break-words" dir="auto">{err}</p>
        <button onClick={() => { setLoading(true); load() }}
          className="mt-5 w-full py-2.5 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black">حاول تاني</button>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="bg-[#04352A] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`}
            className="text-xs font-bold text-[#34D399]/80 hover:text-[#34D399] flex items-center gap-1 mb-2 no-underline">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-60" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#34D399]" />
              </span>
              <h1 className="text-xl md:text-2xl font-black text-white">المونيتور</h1>
              <span className="text-[11px] font-bold text-[#34D399]/70">الساعة {now} · بيتحدث لوحده كل دقيقة</span>
            </div>
            <button onClick={() => setTick(x => x + 1)} className="p-2 rounded-xl bg-white/10">
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { n: `${present}/${team.length}`, l: 'حاضرين دلوقتي' },
              { n: `${totDone}/${totAll}`, l: 'تاسكات اتقفلت' },
              { n: String(totLate), l: 'متأخرة', warn: totLate > 0 },
              { n: `${totAll ? Math.round(100 * totDone / totAll) : 0}%`, l: 'إنجاز اليوم' },
            ].map((s, i) => (
              <div key={i} className={`rounded-2xl px-3 py-2.5 ${s.warn ? 'bg-[#b3261e]' : 'bg-white/10'}`}>
                <p className="text-lg font-black text-white tabular-nums">{s.n}</p>
                <p className="text-[10px] font-bold text-white/60">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {groups.map(([teamName, members]) => (
          <section key={teamName}>
            <h2 className="text-xs font-black text-[#6B7280] tracking-widest mb-2 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[#059669]" /> {teamName}
              <span className="text-[10px] font-bold text-[#9CA3AF]">
                {members.filter(m => m.present_now).length}/{members.length} حاضر
              </span>
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {members.map(m => <MemberCard key={m.employee_id} m={m} />)}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

function MemberCard({ m }: { m: Member }) {
  const pct = m.tasks_total ? Math.round(100 * m.tasks_done / m.tasks_total) : 0
  const isBreak = m.current_task?.title?.startsWith('☕')

  return (
    <div className={`bg-white rounded-3xl border p-4 ${m.present_now ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-70'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${m.present_now ? 'bg-[#34D399]' : 'bg-gray-300'}`} />
          <h3 className="font-black text-[#1A2E26] text-sm truncate">{m.name}</h3>
        </div>
        <span className="text-[11px] font-bold text-[#6B7280] tabular-nums shrink-0">
          {m.clock_in ? `حضر ${m.clock_in} · ${m.hours_today}س` : 'ماحضرش النهارده'}
        </span>
      </div>

      {/* شريط الإنجاز */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-[#FAFAF7] overflow-hidden">
          <div className="h-full rounded-full bg-[#34D399] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-black text-[#1A2E26] tabular-nums">{m.tasks_done}/{m.tasks_total}</span>
        {m.tasks_overdue > 0 && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 flex items-center gap-1">
            <Flame className="w-3 h-3" /> {m.tasks_overdue} متأخرة
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-[12px]">
        {m.current_task && (
          <p className="flex items-start gap-1.5">
            {isBreak ? <Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                     : <Clock className="w-3.5 h-3.5 text-[#b3261e] shrink-0 mt-0.5" />}
            <span className="text-[#1A2E26]">
              <b>دلوقتي ({m.current_task.due}):</b> {m.current_task.title}
            </span>
          </p>
        )}
        {m.next_task && (
          <p className="flex items-start gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#6B7280] shrink-0 mt-0.5" />
            <span className="text-[#6B7280]"><b>الجاي ({m.next_task.due}):</b> {m.next_task.title}</span>
          </p>
        )}
        {m.last_done && (
          <p className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
            <span className="text-[#6B7280]"><b>آخر إنجاز ({m.last_done.at}):</b> {m.last_done.title}</span>
          </p>
        )}
        {!m.current_task && !m.next_task && m.tasks_done === m.tasks_total && m.tasks_total > 0 && (
          <p className="text-[#059669] font-bold">✅ خلّص كل تاسكات اليوم</p>
        )}
      </div>
    </div>
  )
}
