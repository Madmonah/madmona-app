'use client'

import { useEffect, useState, useMemo, use, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Crown, Building2, ListChecks, ChevronLeft, Loader2,
  CheckCircle2, Circle, Clock, AlertTriangle, RefreshCw, Plus,
  TrendingUp, Sparkles,
} from 'lucide-react'

/* ============================================================
   /admin/business-finance/[supplierId]/team
   
   Madmona-as-Admin oversight of a B2B partner's team.
   Shows the hierarchy: Madmona → Owner → Branch managers → Staff
   Each employee has live daily-task completion stats.
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Supplier = {
  id: string
  business_name: string
  industry: string | null
  contract_status: string
}

type Branch = {
  id: string
  name: string
  code: string | null
  status: string
}

type Employee = {
  employee_id: string
  full_name: string
  role: string
  role_ar: string | null
  branch_id: string | null
  branch_name: string | null
  branch_code: string | null
  avatar_initial?: string | null
  today_total_tasks: number
  today_completed: number
  today_pending: number
  week_completion_pct: number | null
}

export default function TeamOversightPage({
  params,
}: {
  params: Promise<{ supplierId: string }>
}) {
  const { supplierId } = use(params)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')

  async function loadAll() {
    setLoading(true)
    // @ts-expect-error
    const { data: sup } = await supabase.from('suppliers')
      .select('id, business_name, industry, contract_status')
      .eq('id', supplierId).single()
    setSupplier(sup as Supplier)

    // @ts-expect-error
    const { data: br } = await supabase.from('supplier_branches')
      .select('id, name, code, status')
      .eq('supplier_id', supplierId).order('code')
    setBranches((br || []) as Branch[])

    // @ts-expect-error
    const { data: emp } = await supabase.from('v_business_team_oversight')
      .select('*').eq('supplier_id', supplierId)
    setEmployees((emp || []) as Employee[])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const id = setInterval(loadAll, 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  async function regenerateTasks() {
    setGenerating(true)
    // @ts-expect-error
    const { data } = await supabase.rpc('generate_tasks_for_supplier_today', {
      p_supplier_id: supplierId,
    })
    setMessage(`✨ ${(data as any)?.tasks_created || 0} task جديد اتعمل`)
    setTimeout(() => setMessage(''), 3000)
    await loadAll()
    setGenerating(false)
  }

  // Group employees by branch
  const owner = useMemo(() => employees.find((e) => e.role === 'owner'), [employees])
  const byBranch = useMemo(() => {
    const map = new Map<string, Employee[]>()
    for (const e of employees) {
      if (e.role === 'owner') continue
      const key = e.branch_id || 'no_branch'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [employees])

  const stats = useMemo(() => {
    const totalEmployees = employees.length
    const totalTasks = employees.reduce((s, e) => s + (e.today_total_tasks || 0), 0)
    const completedTasks = employees.reduce((s, e) => s + (e.today_completed || 0), 0)
    const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    return { totalEmployees, totalTasks, completedTasks, completionPct }
  }, [employees])

  if (loading && !supplier) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (!supplier) return null

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href={`/admin/business-finance/${supplierId}`}
            className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            رجوع للـ finance
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">
                B2B PARTNER · TEAM OVERSIGHT
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
                فريق {supplier.business_name}
              </h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {stats.totalEmployees} موظف · {stats.totalTasks} مهمة اليوم · إنجاز {stats.completionPct}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={regenerateTasks}
                disabled={generating}
                className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${generating ? 'animate-pulse' : ''}`} />
                توليد مهام اليوم
              </button>
              <button
                onClick={loadAll}
                className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                تحديث
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Toast */}
        {message && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 text-sm text-[#1A2E26]">
            {message}
          </div>
        )}

        {/* Hierarchy visualization */}
        <section className="bg-white rounded-3xl border border-gray-100 p-5 md:p-7">
          <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-5">
            🏛️ هيكل الإدارة
          </h2>
          <div className="space-y-4">
            {/* Madmona (top) */}
            <HierNode
              level={0}
              icon={<Crown className="w-5 h-5" />}
              title="Madmona"
              subtitle="ادمن المنصة"
              accent
            />
            {/* Connector line */}
            <Connector />
            {/* Elite Owner */}
            <HierNode
              level={1}
              icon={<Users className="w-5 h-5" />}
              title={owner?.full_name || 'صاحب المكان'}
              subtitle={`${supplier.business_name} · صاحب`}
              taskStats={owner ? {
                done: owner.today_completed,
                total: owner.today_total_tasks,
              } : undefined}
            />
            <Connector />
            {/* Branch managers row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {branches.map((b) => {
                const mgr = employees.find(
                  (e) => e.branch_id === b.id && e.role === 'branch_manager',
                )
                return (
                  <HierNode
                    key={b.id}
                    level={2}
                    compact
                    icon={<Building2 className="w-4 h-4" />}
                    title={b.code || ''}
                    subtitle={mgr?.full_name || 'بدون مدير'}
                    taskStats={mgr ? {
                      done: mgr.today_completed,
                      total: mgr.today_total_tasks,
                    } : undefined}
                  />
                )
              })}
            </div>
          </div>
        </section>

        {/* Stats row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="موظفين" value={stats.totalEmployees} icon={<Users className="w-4 h-4" />} />
          <StatCard label="مهام اليوم" value={stats.totalTasks} icon={<ListChecks className="w-4 h-4" />} />
          <StatCard label="مكتمل" value={stats.completedTasks} icon={<CheckCircle2 className="w-4 h-4" />} tone="positive" />
          <StatCard label="إنجاز" value={`${stats.completionPct}%`} icon={<TrendingUp className="w-4 h-4" />} primary />
        </section>

        {/* Branch sections */}
        {branches.map((b) => {
          const branchEmps = byBranch.get(b.id) || []
          if (branchEmps.length === 0) {
            return (
              <section key={b.id} className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
                <Building2 className="w-8 h-8 text-[#6B7280] opacity-40 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">{b.name}</p>
                <p className="text-xs text-[#6B7280] mt-1">مفيش موظفين مضافين لسه</p>
              </section>
            )
          }
          const branchTasks = branchEmps.reduce((s, e) => s + e.today_total_tasks, 0)
          const branchDone = branchEmps.reduce((s, e) => s + e.today_completed, 0)
          const branchPct = branchTasks > 0 ? Math.round((branchDone / branchTasks) * 100) : 0

          return (
            <section key={b.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="inline-grid place-items-center w-10 h-10 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-[#1A2E26] leading-tight">{b.name}</h3>
                    <p className="text-xs text-[#6B7280]">
                      {branchEmps.length} موظف · {branchTasks} مهمة · إنجاز {branchPct}%
                    </p>
                  </div>
                </div>
                <ProgressRing pct={branchPct} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {branchEmps.map((e) => (
                  <EmployeeCard key={e.employee_id} emp={e} />
                ))}
              </div>
            </section>
          )
        })}

        {/* Bottom info card */}
        <section className="bg-[#1F6F5F] text-white rounded-3xl p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-white/15 flex-shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black mb-2 tracking-tight">
                Madmona كمنصّة إدارة شاملة
              </h3>
              <p className="text-sm text-white/90 leading-relaxed mb-3">
                مش بس وسيط للحجوزات — كمان منصة إدارة. كل موظف، كل مهمة، كل ج بـ يدخل أو يخرج، 
                Madmona شايفاه live. هذه القيمة المضافة اللي بنقدمها لشركائنا.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge>هيكل إدارة كامل</Badge>
                <Badge>Daily tasks تلقائي</Badge>
                <Badge>Live tracking</Badge>
                <Badge>Madmona admin</Badge>
                <Badge>عمولة على gross bookings</Badge>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function HierNode({
  level, icon, title, subtitle, accent, compact, taskStats,
}: {
  level: number
  icon: ReactNode
  title: string
  subtitle: string
  accent?: boolean
  compact?: boolean
  taskStats?: { done: number; total: number }
}) {
  const pct = taskStats && taskStats.total > 0
    ? Math.round((taskStats.done / taskStats.total) * 100)
    : null

  return (
    <div className={`flex items-center gap-3 rounded-2xl border ${
      accent
        ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]'
        : 'bg-white text-[#1A2E26] border-gray-100'
    } ${compact ? 'p-3' : 'p-4'}`}>
      <div className={`inline-grid place-items-center rounded-xl flex-shrink-0 ${
        compact ? 'w-9 h-9' : 'w-11 h-11'
      } ${accent ? 'bg-white/15 text-white' : 'bg-[#1F6F5F]/10 text-[#1F6F5F]'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-black tracking-tight truncate ${
          compact ? 'text-sm' : 'text-base'
        } ${accent ? 'text-white' : 'text-[#1A2E26]'}`}>
          {title}
        </h3>
        <p className={`truncate ${compact ? 'text-[10px]' : 'text-xs'} ${
          accent ? 'text-white/80' : 'text-[#6B7280]'
        }`}>
          {subtitle}
        </p>
      </div>
      {pct !== null && (
        <div className={`text-xs font-bold ${
          accent ? 'text-white' : pct >= 70 ? 'text-[#1F6F5F]' : 'text-[#6B7280]'
        }`}>
          {pct}%
        </div>
      )}
    </div>
  )
}

function Connector() {
  return (
    <div className="flex justify-center">
      <div className="w-px h-4 bg-gray-200" />
    </div>
  )
}

function StatCard({
  label, value, icon, tone, primary,
}: {
  label: string
  value: number | string
  icon: ReactNode
  tone?: 'positive' | 'negative'
  primary?: boolean
}) {
  const toneClass = tone === 'positive' ? 'text-[#1F6F5F]' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${
      primary ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white' : 'bg-white border-gray-100'
    }`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        {icon}
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-black ${primary ? 'text-white' : toneClass}`}>
        {value}
      </p>
    </div>
  )
}

function EmployeeCard({ emp }: { emp: Employee }) {
  const pct = emp.today_total_tasks > 0
    ? Math.round((emp.today_completed / emp.today_total_tasks) * 100)
    : null
  const initial = emp.avatar_initial || emp.full_name.charAt(0)

  const statusColor =
    pct === null ? 'bg-gray-100 text-gray-500' :
    pct >= 80 ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' :
    pct >= 40 ? 'bg-amber-50 text-amber-700' :
    'bg-red-50 text-red-700'

  return (
    <div className="rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-[#1F6F5F] transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] font-black text-base flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-[#1A2E26] leading-tight truncate">{emp.full_name}</h4>
          <p className="text-[11px] text-[#6B7280] mt-0.5">{emp.role_ar}</p>
        </div>
        {pct !== null && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusColor}`}>
            {pct}%
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#6B7280]">مهام اليوم</span>
          <span className="font-mono font-bold text-[#1A2E26]">
            {emp.today_completed}/{emp.today_total_tasks}
          </span>
        </div>
        {/* Progress bar */}
        {emp.today_total_tasks > 0 && (
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1F6F5F] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {emp.week_completion_pct !== null && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px]">
          <span className="text-[#6B7280]">٧ أيام</span>
          <span className="font-mono font-bold text-[#1A2E26]">{emp.week_completion_pct}%</span>
        </div>
      )}
    </div>
  )
}

function ProgressRing({ pct }: { pct: number }) {
  const circ = 2 * Math.PI * 18
  const offset = circ - (pct / 100) * circ
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="#E5E7EB" strokeWidth="3" />
        <circle
          cx="22" cy="22" r="18" fill="none"
          stroke="#1F6F5F" strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#1A2E26]">
        {pct}%
      </span>
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-md bg-white/15 text-white text-[10px] font-bold tracking-wider">
      {children}
    </span>
  )
}
