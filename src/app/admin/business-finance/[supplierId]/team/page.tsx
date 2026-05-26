'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Crown, Building2, ListChecks, ChevronLeft, Loader2,
  CheckCircle2, Circle, X, RefreshCw, Plus,
  TrendingUp, Sparkles, AlertCircle, Clock, LogIn, LogOut, Star, QrCode, ShieldCheck,
  Heart, Calendar, UserPlus, Power, Pause, Pencil, Trash2, Save, Settings2,
  Workflow, Play, ArrowUp, ArrowDown,
  Search, Mail,
} from 'lucide-react'

/* ============================================================
   /admin/business-finance/[supplierId]/team
   
   - Hierarchy view (Madmona → Owner → Branch managers)
   - Employee cards (click to open task modal)
   - Modal: see + check off employee's daily tasks live
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// الـ AI agents + الـ Flows دول تيم مضمونة الداخلي — يظهروا بس على أكونت مضمونة نفسها،
// مش على أي مورّد تاني زي Elite. (لاحقاً ممكن نعمل تيم AI خاص بكل مورّد)
const MADMONA_SUPPLIER_ID = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'

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

type Task = {
  id: string
  title_ar: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'overdue'
  due_time: string | null
  completed_at: string | null
  notes: string | null
  is_auto_generated: boolean
}

type AiAgent = {
  agent_name: string
  display_name: string | null
  team: string
  enabled: boolean
  status: string | null
  task: string | null
  n_tasks: number
}

type StepType = 'agent' | 'ai' | 'choice' | 'email' | 'drive'
type FlowStep = {
  type?: StepType
  agent?: string
  prompt?: string
  output_key?: string
  options_key?: string
  to?: string[]
  cc?: string[]
  subject?: string
  body?: string
  drive_title?: string
  note?: string
}
type Flow = {
  id: string
  name: string
  description: string | null
  enabled: boolean
  schedule_cron: string | null
  steps: FlowStep[]
  n_steps: number
  last_run: {
    status: string | null; started_at: string | null; completed_at: string | null
    error: string | null; total_steps?: number; current_step?: number
  } | null
}

type RosterPerson = {
  employee_id?: string
  name: string
  email: string | null
  phone?: string | null
  has_email?: boolean
  role_ar?: string | null
}
type Roster = {
  owner: { name: string; email: string | null; has_email: boolean; always_cc: string[] }
  employees: RosterPerson[]
}

const AI_TEAM_META: Record<string, { label: string }> = {
  sales: { label: '💰 المبيعات' },
  operations: { label: '💼 العمليات' },
  marketing: { label: '📣 الماركتنج' },
  creative: { label: '🎨 الإبداع' },
  intelligence: { label: '📊 الذكاء' },
  strategic: { label: '🧠 الاستراتيجية' },
  growth: { label: '🤝 النمو' },
  support: { label: '🛠️ الدعم' },
}

const STEP_TYPE_META: Record<StepType, { label: string; icon: string; chip: string }> = {
  agent: { label: 'موظف AI', icon: '🤖', chip: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
  ai: { label: 'مهمة AI', icon: '🧠', chip: 'bg-[#2FA084]/12 text-[#1F6F5F]' },
  choice: { label: 'قرارك إنت', icon: '⏸', chip: 'bg-[#D4A017]/15 text-[#8a6a0a]' },
  email: { label: 'إيميل', icon: '📧', chip: 'bg-purple-50 text-purple-700' },
  drive: { label: 'حفظ Drive', icon: '💾', chip: 'bg-gray-100 text-[#6B7280]' },
}
function stepType(s: FlowStep): StepType { return (s.type || (s.agent ? 'agent' : 'agent')) as StepType }
function stepLabel(s: FlowStep, nameOf?: (an: string) => string): string {
  const t = stepType(s)
  if (t === 'agent') return nameOf ? nameOf(s.agent || '') : (s.agent || 'agent')
  if (t === 'ai') return s.output_key || 'مهمة AI'
  if (t === 'choice') return s.output_key || 'قرارك'
  if (t === 'email') return s.subject || 'إيميل'
  if (t === 'drive') return s.drive_title || 'Drive'
  return 'step'
}

export default function TeamOversightPage({
  params,
}: {
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const isMadmona = supplierId === MADMONA_SUPPLIER_ID
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [aiAgents, setAiAgents] = useState<AiAgent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [flows, setFlows] = useState<Flow[]>([])
  const [builderFlow, setBuilderFlow] = useState<Flow | 'new' | null>(null)
  const [runningFlow, setRunningFlow] = useState<string | null>(null)
  const [flowMsg, setFlowMsg] = useState('')
  const [roster, setRoster] = useState<Roster | null>(null)
  const [agentSearch, setAgentSearch] = useState('')
  const [commsOpen, setCommsOpen] = useState(false)
  const [choiceModal, setChoiceModal] = useState<{ run_id: string; flow_name: string; options: Array<{ id?: string; label?: string }>; output_key: string } | null>(null)
  const [resuming, setResuming] = useState(false)

  async function toggleAgent(agent_name: string, active: boolean) {
    setAiAgents((prev) => prev.map((a) =>
      a.agent_name === agent_name ? { ...a, enabled: active, status: active ? 'active' : 'on_leave' } : a))
    await fetch('/api/admin/agent-flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', agent_name, active }),
    })
    await loadAll()
  }

  async function flowCall(body: Record<string, unknown>) {
    const r = await fetch('/api/admin/flow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return r.json().catch(() => ({}))
  }
  async function runFlow(id: string) {
    setRunningFlow(id); setFlowMsg('')
    const fname = flows.find((f) => f.id === id)?.name || 'flow'
    const r = await flowCall({ action: 'run', id })
    setRunningFlow(null)
    if (r?.error) { setFlowMsg(`❌ ${r.error}`) }
    else if (r?.status === 'awaiting_owner') {
      setChoiceModal({ run_id: r.run_id, flow_name: fname, options: r.options || [], output_key: r.output_key || 'choice' })
      setFlowMsg('⏸ الـ flow مستنّي قرارك')
    } else {
      const res = (r?.results || []) as Array<{ success: boolean }>
      const ok = res.filter((x) => x.success).length
      setFlowMsg(`✅ خلص: ${ok}/${res.length} نجح`)
    }
    setTimeout(() => setFlowMsg(''), 6000)
    await loadAll()
  }
  async function resumeFlow(run_id: string, choice: unknown) {
    setResuming(true)
    const r = await flowCall({ action: 'resume', run_id, choice })
    setResuming(false)
    if (r?.status === 'awaiting_owner') {
      setChoiceModal((cm) => cm ? { ...cm, run_id: r.run_id, options: r.options || [], output_key: r.output_key || 'choice' } : cm)
      setFlowMsg('⏸ فيه قرار تاني مستنّيك')
    } else {
      setChoiceModal(null)
      if (r?.error) setFlowMsg(`❌ ${r.error}`)
      else {
        const res = (r?.results || []) as Array<{ success: boolean }>
        const ok = res.filter((x) => x.success).length
        setFlowMsg(`✅ كمّل: ${ok}/${res.length} نجح`)
      }
    }
    setTimeout(() => setFlowMsg(''), 6000)
    await loadAll()
  }
  async function toggleFlow(id: string, enabled: boolean) {
    setFlows((prev) => prev.map((f) => f.id === id ? { ...f, enabled } : f))
    await flowCall({ action: 'toggle', id, enabled }); await loadAll()
  }
  async function deleteFlow(id: string) {
    if (!confirm('تحذف الـ flow ده؟')) return
    await flowCall({ action: 'delete', id }); await loadAll()
  }

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

    // الـ AI workforce + flows + comms روستر = تيم مضمونة الداخلي بس
    if (supplierId === MADMONA_SUPPLIER_ID) {
      // @ts-expect-error
      const { data: ai } = await supabase.rpc('get_agents_structure')
      setAiAgents((ai || []) as AiAgent[])
      // @ts-expect-error
      const { data: fl } = await supabase.rpc('get_flows')
      setFlows((fl || []) as Flow[])
      // @ts-expect-error
      const { data: rs } = await supabase.rpc('get_comms_roster')
      setRoster((rs || null) as Roster | null)
    } else {
      setAiAgents([]); setFlows([]); setRoster(null)
    }

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

  const aiByTeam = useMemo(() => {
    const q = agentSearch.trim().toLowerCase()
    const src = q
      ? aiAgents.filter((a) =>
          (a.display_name || '').toLowerCase().includes(q) ||
          a.agent_name.toLowerCase().includes(q) ||
          a.team.toLowerCase().includes(q) ||
          (a.task || '').toLowerCase().includes(q))
      : aiAgents
    const map = new Map<string, AiAgent[]>()
    for (const a of src) {
      if (!map.has(a.team)) map.set(a.team, [])
      map.get(a.team)!.push(a)
    }
    for (const arr of map.values()) arr.sort((x, y) => Number(y.enabled) - Number(x.enabled))
    return [...map.entries()].sort(
      (a, b) => b[1].filter((x) => x.enabled).length - a[1].filter((x) => x.enabled).length
    )
  }, [aiAgents, agentSearch])
  const aiActive = useMemo(() => aiAgents.filter((a) => a.enabled).length, [aiAgents])

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
            <div className="flex items-center gap-2 flex-wrap">
              <Link
              href={`/admin/business-finance/${supplierId}/team/bulk-add`}
              className="px-4 py-2 rounded-xl bg-[#1A2E26] hover:opacity-90 text-sm font-bold text-white flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              إضافة موظفين Bulk
            </Link>
            <Link
              href={`/admin/business-finance/${supplierId}/team/manage`}
              className="px-4 py-2 rounded-xl bg-[#1A2E26] hover:opacity-90 text-sm font-bold text-white flex items-center gap-2 transition-colors"
            >
              <Users className="w-4 h-4" />
              إدارة الأرقام والفروع
            </Link>
            <Link
              href={`/admin/business-finance/${supplierId}/customers`}
                className="px-4 py-2 rounded-xl bg-[#1F6F5F] hover:opacity-90 text-sm font-bold text-white flex items-center gap-2 transition-colors"
              >
                <Heart className="w-4 h-4" />
                العملاء
              </Link>
              <Link
                href={`/admin/business-finance/${supplierId}/appointments`}
                className="px-4 py-2 rounded-xl bg-[#1F6F5F] hover:opacity-90 text-sm font-bold text-white flex items-center gap-2 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                المواعيد
              </Link>
              <Link
                href={`/admin/business-finance/${supplierId}/ratings`}
                className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2 transition-colors"
              >
                <Star className="w-4 h-4" />
                التقييمات
              </Link>
              <Link
                href={`/admin/business-finance/${supplierId}/qr-posters`}
                className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                QR ملصقات
              </Link>
              <Link
                href={`/admin/business-finance/${supplierId}/attendance`}
                className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                سجل الحضور
              </Link>
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
        {message && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 text-sm text-[#1A2E26]">
            {message}
          </div>
        )}

        {/* Hint banner */}
        <div className="bg-[#1F6F5F]/5 border border-[#1F6F5F]/20 rounded-2xl p-3 text-xs text-[#1A2E26] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#1F6F5F] flex-shrink-0" />
          <span>اضغط على أي كارت موظف عشان تشوف مهامه + تقدر تشطبها</span>
        </div>

        {/* Hierarchy */}
        <section className="bg-white rounded-3xl border border-gray-100 p-5 md:p-7">
          <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-5">
            🏛️ هيكل الإدارة
          </h2>
          <div className="space-y-4">
            <HierNode level={0} icon={<Crown className="w-5 h-5" />} title="Madmona" subtitle="ادمن المنصة" accent />
            <Connector />
            <HierNode level={1}
              icon={<Users className="w-5 h-5" />}
              title={owner?.full_name || 'صاحب المكان'}
              subtitle={`${supplier.business_name} · صاحب`}
              taskStats={owner ? { done: owner.today_completed, total: owner.today_total_tasks } : undefined}
              onClick={owner ? () => setSelectedEmployee(owner) : undefined}
            />
            <Connector />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {branches.map((b) => {
                const mgr = employees.find((e) => e.branch_id === b.id && e.role === 'branch_manager')
                return (
                  <HierNode key={b.id} level={2} compact
                    icon={<Building2 className="w-4 h-4" />}
                    title={b.code || ''}
                    subtitle={mgr?.full_name || 'بدون مدير'}
                    taskStats={mgr ? { done: mgr.today_completed, total: mgr.today_total_tasks } : undefined}
                    onClick={mgr ? () => setSelectedEmployee(mgr) : undefined}
                  />
                )
              })}
            </div>
          </div>
        </section>

        {isMadmona && (<>
        {/* AI WORKFORCE هيكل (تيم مضمونة الداخلي — مش بيظهر لأي مورّد تاني) */}
        <section className="bg-white rounded-3xl border border-gray-100 p-5 md:p-7">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
            <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">
              🤖 موظفين الـ AI — الهيكل الكامل
            </h2>
            <span className="text-xs font-bold text-[#6B7280]">
              {aiActive} شغّال · {aiAgents.length - aiActive} في إجازة
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              placeholder="دوّر على موظف AI… (اسم / فريق / شغلانة)"
              className="w-full pr-9 pl-9 py-2 text-sm rounded-xl border border-gray-200 bg-[#FAFAF7] text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
            />
            {agentSearch && (
              <button onClick={() => setAgentSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A2E26]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Brain node — العقل */}
          <div
            className="rounded-2xl p-4 mb-5 text-white flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg,#D4A017 0%,#2FA084 55%,#1F6F5F 100%)' }}
          >
            <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-white/20 flex-shrink-0 text-xl">🧠</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-base">محمد — العقل</h3>
              <p className="text-xs text-white/85">بيدّي الأوامر · الـ agents بتنفّذ وترفعله</p>
            </div>
          </div>

          {aiByTeam.length === 0 ? (
            <p className="text-xs text-[#6B7280] text-center py-6">جاري التحميل…</p>
          ) : (
            <div className="space-y-5">
              {aiByTeam.map(([team, list]) => {
                const meta = AI_TEAM_META[team] || { label: team }
                const act = list.filter((a) => a.enabled).length
                return (
                  <div key={team}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-black text-[#1A2E26]">{meta.label}</span>
                      <span className="text-[10px] text-[#6B7280]">{act}/{list.length} شغّال</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {list.map((a) => (
                        <AgentChip
                          key={a.agent_name}
                          a={a}
                          onToggle={toggleAgent}
                          onOpen={() => setSelectedAgent(a.agent_name)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* AGENT FLOWS — سلاسل شغل */}
        <section className="bg-white rounded-3xl border border-gray-100 p-5 md:p-7">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">
                🔗 الـ Flows — سلاسل شغل
              </h2>
              <p className="text-xs text-[#6B7280] mt-1">رتّب كذا agent ورا بعض في flow واحد وشغّله بضغطة</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/custody"
                className="px-3 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> العهدة
              </Link>
              <Link
                href="/admin/flow-tasks"
                className="px-3 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2"
              >
                <ListChecks className="w-4 h-4" /> المهام
              </Link>
              <button
                onClick={() => setCommsOpen(true)}
                className="px-3 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2"
              >
                <Mail className="w-4 h-4" /> إيميلات الفريق
              </button>
              <button
                onClick={() => setBuilderFlow('new')}
                className="px-4 py-2 rounded-xl bg-[#1F6F5F] hover:opacity-90 text-sm font-bold text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> flow جديد
              </button>
            </div>
          </div>

          {flowMsg && (
            <div className="mb-3 text-xs font-bold text-[#1A2E26] bg-[#1F6F5F]/5 border border-[#1F6F5F]/20 rounded-xl px-3 py-2">{flowMsg}</div>
          )}

          {flows.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
              <Workflow className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش flows لسه</p>
              <p className="text-xs text-[#6B7280] mt-1">اعمل أول flow: مثلاً صياد المؤجرين → تأهيل → تواصل</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {flows.map((f) => (
                <FlowCard
                  key={f.id}
                  f={f}
                  running={runningFlow === f.id}
                  onRun={() => runFlow(f.id)}
                  onToggle={() => toggleFlow(f.id, !f.enabled)}
                  onEdit={() => setBuilderFlow(f)}
                  onDelete={() => deleteFlow(f.id)}
                />
              ))}
            </div>
          )}
        </section>
        </>)}

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="موظفين" value={stats.totalEmployees} icon={<Users className="w-4 h-4" />} />
          <StatCard label="مهام اليوم" value={stats.totalTasks} icon={<ListChecks className="w-4 h-4" />} />
          <StatCard label="مكتمل" value={stats.completedTasks} icon={<CheckCircle2 className="w-4 h-4" />} tone="positive" />
          <StatCard label="إنجاز" value={`${stats.completionPct}%`} icon={<TrendingUp className="w-4 h-4" />} primary />
        </section>

        {/* Branches */}
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
                  <EmployeeCard
                    key={e.employee_id}
                    emp={e}
                    onClick={() => setSelectedEmployee(e)}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {/* Bottom Madmona positioning */}
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
                Madmona شايفاه live.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge>هيكل إدارة كامل</Badge>
                <Badge>Daily tasks تلقائي</Badge>
                <Badge>Live tracking</Badge>
                <Badge>عمولة على gross</Badge>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Task modal */}
      {selectedEmployee && (
        <TaskModal
          employee={selectedEmployee}
          supplierName={supplier.business_name}
          onClose={() => setSelectedEmployee(null)}
          onRefresh={loadAll}
        />
      )}

      {/* Agent flow modal — تعديل شغل موظف الـ AI */}
      {selectedAgent && (
        <AgentModal
          agentName={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onChanged={loadAll}
        />
      )}

      {/* Flow builder */}
      {builderFlow && (
        <FlowBuilder
          flow={builderFlow === 'new' ? null : builderFlow}
          agents={aiAgents}
          roster={roster}
          onClose={() => setBuilderFlow(null)}
          onSaved={async () => { setBuilderFlow(null); await loadAll() }}
        />
      )}

      {/* Owner choice (flow paused) */}
      {choiceModal && (
        <ChoiceModal
          data={choiceModal}
          resuming={resuming}
          onPick={(choice) => resumeFlow(choiceModal.run_id, choice)}
          onClose={() => setChoiceModal(null)}
        />
      )}

      {/* Team emails settings */}
      {commsOpen && (
        <CommsModal
          roster={roster}
          onClose={() => setCommsOpen(false)}
          onSaved={async () => { await loadAll() }}
        />
      )}
    </div>
  )
}

/* ============================================================
   TASK MODAL
   ============================================================ */
function TaskModal({
  employee, supplierName, onClose, onRefresh,
}: {
  employee: Employee
  supplierName: string
  onClose: () => void
  onRefresh: () => void
}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [attendance, setAttendance] = useState<{ clock_in_at: string | null; clock_out_at: string | null; hours_worked: number | null } | null>(null)

  async function loadTasks() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    // @ts-expect-error
    const { data } = await supabase.from('daily_tasks')
      .select('id, title_ar, description, priority, status, due_time, completed_at, notes, is_auto_generated')
      .eq('employee_id', employee.employee_id)
      .eq('task_date', today)
      .order('priority', { ascending: false })
      .order('created_at')
    setTasks((data || []) as Task[])
    
    // Load today's attendance
    // @ts-expect-error
    const { data: att } = await supabase.from('attendance_logs')
      .select('clock_in_at, clock_out_at, hours_worked')
      .eq('employee_id', employee.employee_id)
      .eq('date', today)
      .maybeSingle()
    setAttendance(att as any)
    
    setLoading(false)
  }

  async function clockIn() {
    // @ts-expect-error
    await supabase.rpc('admin_clock_in', { p_employee_id: employee.employee_id })
    await loadTasks()
  }

  async function clockOut() {
    // @ts-expect-error
    await supabase.rpc('admin_clock_out', { p_employee_id: employee.employee_id })
    await loadTasks()
  }

  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.employee_id])

  async function toggleTask(task: Task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null } : t))
    // @ts-expect-error
    await supabase.rpc('admin_update_task_status', { p_task_id: task.id, p_status: newStatus })
    onRefresh()
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return
    // @ts-expect-error
    await supabase.rpc('admin_add_task', {
      p_employee_id: employee.employee_id,
      p_title_ar: newTaskTitle.trim(),
      p_priority: 'medium',
    })
    setNewTaskTitle('')
    setAdding(false)
    await loadTasks()
    onRefresh()
  }

  async function deleteTask(taskId: string) {
    if (!confirm('متأكد من حذف المهمة؟')) return
    // @ts-expect-error
    await supabase.from('daily_tasks').delete().eq('id', taskId)
    await loadTasks()
    onRefresh()
  }

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'completed').length,
  }
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center gap-3">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] font-black text-base flex-shrink-0">
            {employee.avatar_initial || employee.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-black text-[#1A2E26] truncate">{employee.full_name}</h2>
            <p className="text-xs text-[#6B7280] truncate">
              {employee.role_ar} · {employee.branch_name || supplierName}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <ProgressRing pct={pct} />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#6B7280] hover:text-[#1A2E26] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Attendance widget */}
          <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#1F6F5F]" />
              <div>
                <p className="text-xs font-bold text-[#1A2E26]">
                  {attendance?.clock_in_at
                    ? `دخل الساعة ${new Date(attendance.clock_in_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
                    : 'لسه ما سجلش حضور'}
                </p>
                {attendance?.clock_out_at && (
                  <p className="text-[10px] text-[#6B7280]">
                    خرج {new Date(attendance.clock_out_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    {attendance.hours_worked && ` · ${attendance.hours_worked} ساعة`}
                  </p>
                )}
              </div>
            </div>
            {!attendance?.clock_in_at ? (
              <button onClick={clockIn} className="px-3 py-1.5 rounded-lg bg-[#1F6F5F] text-white text-xs font-bold flex items-center gap-1">
                <LogIn className="w-3.5 h-3.5" />
                سجل حضور
              </button>
            ) : !attendance?.clock_out_at ? (
              <button onClick={clockOut} className="px-3 py-1.5 rounded-lg bg-[#FAFAF7] hover:bg-gray-100 text-[#1A2E26] text-xs font-bold flex items-center gap-1 border border-gray-200">
                <LogOut className="w-3.5 h-3.5" />
                سجل انصراف
              </button>
            ) : (
              <span className="text-[10px] font-bold text-[#1F6F5F]">اتسجل ✓</span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <ListChecks className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش مهام لليوم</p>
              <p className="text-xs text-[#6B7280] mt-1">اضف مهمة من فوق أو رجع الـ team page وأضغط "توليد مهام"</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))
          )}

          {/* Add task */}
          {adding ? (
            <div className="bg-white rounded-2xl border-2 border-[#1F6F5F] p-3 flex items-center gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
                placeholder="عنوان المهمة..."
                autoFocus
                className="flex-1 px-2 py-1.5 text-sm bg-transparent text-[#1A2E26] focus:outline-none placeholder-[#6B7280]"
              />
              <button
                onClick={addTask}
                disabled={!newTaskTitle.trim()}
                className="px-3 py-1.5 rounded-lg bg-[#1F6F5F] text-white text-xs font-bold disabled:opacity-50"
              >
                اضف
              </button>
              <button
                onClick={() => { setAdding(false); setNewTaskTitle('') }}
                className="text-[#6B7280] hover:text-[#1A2E26] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full p-3 rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#1F6F5F] text-[#6B7280] hover:text-[#1F6F5F] text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              اضف مهمة
            </button>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 border-t border-gray-100 bg-white text-xs text-[#6B7280] flex items-center justify-between">
          <span>{stats.done}/{stats.total} مكتمل</span>
          <span>اضغط على الدائرة عشان تشطب</span>
        </footer>
      </div>
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const isDone = task.status === 'completed'
  const priorityColor =
    task.priority === 'high' ? 'bg-red-500' :
    task.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-300'

  return (
    <div className={`bg-white rounded-2xl border p-3 md:p-4 flex items-start gap-3 group transition-all ${
      isDone ? 'border-[#1F6F5F]/30 bg-[#1F6F5F]/5' : 'border-gray-100 hover:shadow-sm'
    }`}>
      {/* Checkbox */}
      <button onClick={onToggle} className="flex-shrink-0 mt-0.5 transition-transform active:scale-90">
        {isDone ? (
          <CheckCircle2 className="w-6 h-6 text-[#1F6F5F]" />
        ) : (
          <Circle className="w-6 h-6 text-gray-300 hover:text-[#1F6F5F] transition-colors" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${priorityColor}`} />
          <p className={`text-sm leading-relaxed flex-1 ${
            isDone ? 'text-[#6B7280] line-through' : 'text-[#1A2E26] font-medium'
          }`}>
            {task.title_ar}
          </p>
        </div>
        {!task.is_auto_generated && (
          <p className="text-[10px] text-[#6B7280] mt-1 mr-3.5">يدوي</p>
        )}
        {task.completed_at && isDone && (
          <p className="text-[10px] text-[#1F6F5F] mt-1 mr-3.5">
            ✓ {new Date(task.completed_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Delete (only show on manual tasks) */}
      {!task.is_auto_generated && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-red-600 transition-all p-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function HierNode({
  level, icon, title, subtitle, accent, compact, taskStats, onClick,
}: {
  level: number
  icon: ReactNode
  title: string
  subtitle: string
  accent?: boolean
  compact?: boolean
  taskStats?: { done: number; total: number }
  onClick?: () => void
}) {
  const pct = taskStats && taskStats.total > 0
    ? Math.round((taskStats.done / taskStats.total) * 100)
    : null

  const Wrapper: any = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border w-full text-right ${
        accent
          ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]'
          : `bg-white text-[#1A2E26] border-gray-100 ${onClick ? 'hover:border-[#1F6F5F] hover:shadow-sm cursor-pointer' : ''}`
      } ${compact ? 'p-3' : 'p-4'} transition-all`}
    >
      <div className={`inline-grid place-items-center rounded-xl flex-shrink-0 ${
        compact ? 'w-9 h-9' : 'w-11 h-11'
      } ${accent ? 'bg-white/15 text-white' : 'bg-[#1F6F5F]/10 text-[#1F6F5F]'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-right">
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
    </Wrapper>
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

function EmployeeCard({ emp, onClick }: { emp: Employee; onClick: () => void }) {
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
    <button
      onClick={onClick}
      className="w-full text-right rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-[#1F6F5F] transition-all"
    >
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
        {emp.today_total_tasks > 0 && (
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1F6F5F] transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {emp.week_completion_pct !== null && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px]">
          <span className="text-[#6B7280]">٧ أيام</span>
          <span className="font-mono font-bold text-[#1A2E26]">{emp.week_completion_pct}%</span>
        </div>
      )}
    </button>
  )
}

function ProgressRing({ pct }: { pct: number }) {
  const circ = 2 * Math.PI * 18
  const offset = circ - (pct / 100) * circ
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="#E5E7EB" strokeWidth="3" />
        <circle cx="22" cy="22" r="18" fill="none" stroke="#1F6F5F" strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
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

function AgentChip({ a, onToggle, onOpen }: {
  a: AiAgent
  onToggle: (agent_name: string, active: boolean) => void
  onOpen: () => void
}) {
  const on = a.enabled
  const subtitle = a.task && a.task !== a.display_name ? a.task : a.agent_name
  return (
    <div className={`rounded-2xl border p-3 flex items-start gap-2.5 transition-all ${
      on ? 'bg-white border-[#1F6F5F]/30' : 'bg-[#FAFAF7] border-gray-100 opacity-70'
    }`}>
      <button
        onClick={onOpen}
        title="تعديل شغل الموظف"
        className={`inline-grid place-items-center w-9 h-9 rounded-lg flex-shrink-0 text-sm transition-transform active:scale-90 ${
          on ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'bg-gray-100 text-[#6B7280]'
        }`}
      >🤖</button>
      <button onClick={onOpen} className="flex-1 min-w-0 text-right">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${on ? 'bg-[#1F6F5F]' : 'bg-gray-300'}`} />
          <h4 className="text-sm font-black text-[#1A2E26] leading-tight truncate">{a.display_name || a.agent_name}</h4>
        </div>
        <p className="text-[10px] text-[#6B7280] mt-0.5 truncate" dir="ltr">{subtitle}</p>
      </button>
      <div className="flex flex-col items-stretch gap-1 flex-shrink-0">
        <button
          onClick={() => onToggle(a.agent_name, !on)}
          title={on ? 'نوّم الـ agent' : 'شغّل الـ agent'}
          className={`px-2 py-1 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-colors ${
            on
              ? 'bg-[#1F6F5F]/10 text-[#1F6F5F] hover:bg-red-50 hover:text-red-600'
              : 'bg-[#1F6F5F] text-white hover:opacity-90'
          }`}
        >
          {on ? <Pause className="w-3 h-3" /> : <Power className="w-3 h-3" />}
          {on ? 'نوّم' : 'شغّل'}
        </button>
        <button
          onClick={onOpen}
          title="تعديل الشغل"
          className="px-2 py-1 rounded-lg text-[9px] font-bold text-[#6B7280] hover:text-[#1A2E26] hover:bg-gray-100 flex items-center justify-center gap-1 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          تعديل
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   AGENT MODAL — تعديل شغل موظف الـ AI
   (تشغيل/تنويم + المعاد + الوصف + التاسكات)
   ============================================================ */
type AgentTask = { id: string; title_ar: string; priority: string | null; active: boolean }
type AgentDetail = {
  agent_name: string
  display_name: string | null
  team: string
  enabled: boolean
  status: string | null
  description: string | null
  schedule_cron: string | null
  employee_id: string | null
  run_count: number
  success_count: number
  error_count: number
  tasks: AgentTask[]
}

function AgentModal({ agentName, onClose, onChanged }: {
  agentName: string
  onClose: () => void
  onChanged: () => void
}) {
  const [d, setD] = useState<AgentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [desc, setDesc] = useState('')
  const [cron, setCron] = useState('')
  const [newTask, setNewTask] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    // @ts-expect-error rpc untyped
    const { data } = await supabase.rpc('get_agent_detail', { p_agent_name: agentName })
    const det = data as AgentDetail | null
    setD(det)
    setDesc(det?.description || '')
    setCron(det?.schedule_cron || '')
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [agentName])

  async function call(body: Record<string, unknown>) {
    const r = await fetch('/api/admin/agent-flow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return r.ok
  }

  async function toggle() {
    if (!d) return
    setSaving(true)
    await call({ action: 'toggle', agent_name: d.agent_name, active: !d.enabled })
    await load(); onChanged(); setSaving(false)
  }
  async function saveMeta() {
    if (!d) return
    setSaving(true)
    await call({ action: 'update_meta', agent_name: d.agent_name, description: desc, schedule_cron: cron })
    setMsg('اتسجّل ✓'); setTimeout(() => setMsg(''), 2000)
    await load(); onChanged(); setSaving(false)
  }
  async function addTask() {
    if (!d || !newTask.trim()) return
    setSaving(true)
    await call({ action: 'add_task', agent_name: d.agent_name, title_ar: newTask.trim() })
    setNewTask('')
    await load(); onChanged(); setSaving(false)
  }
  async function toggleTask(t: AgentTask) {
    setSaving(true)
    await call({ action: 'update_task', task_id: t.id, active: !t.active })
    await load(); onChanged(); setSaving(false)
  }
  async function delTask(t: AgentTask) {
    if (!confirm('تحذف المهمة دي؟')) return
    setSaving(true)
    await call({ action: 'delete_task', task_id: t.id })
    await load(); onChanged(); setSaving(false)
  }

  const on = d?.enabled
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-xl md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center gap-3">
          <div className={`inline-grid place-items-center w-11 h-11 rounded-xl flex-shrink-0 text-lg ${
            on ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'bg-gray-100 text-[#6B7280]'
          }`}>🤖</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-black text-[#1A2E26] truncate">{d?.display_name || agentName}</h2>
            <p className="text-xs text-[#6B7280] truncate" dir="ltr">{agentName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#6B7280] hover:text-[#1A2E26]">
            <X className="w-5 h-5" />
          </button>
        </header>

        {loading || !d ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Status + counters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#1A2E26]">{on ? 'شغّال دلوقتي' : 'في إجازة'}</p>
                <p className="text-[10px] text-[#6B7280] mt-0.5">
                  {d.run_count} تشغيلة · {d.success_count} نجاح · {d.error_count} غلط
                </p>
              </div>
              <button
                onClick={toggle} disabled={saving}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 ${
                  on ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-[#1F6F5F] text-white hover:opacity-90'
                }`}
              >
                {on ? <Pause className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                {on ? 'نوّم' : 'شغّل'}
              </button>
            </div>

            {/* Schedule + description */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3" /> المعاد (cron)
                </label>
                <input
                  type="text" value={cron} onChange={(e) => setCron(e.target.value)} dir="ltr"
                  placeholder="@daily / @hourly / 0 6 * * *"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-[#FAFAF7] text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] flex items-center gap-1 mb-1">
                  <Settings2 className="w-3 h-3" /> شغله / الوصف
                </label>
                <textarea
                  value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                  placeholder="بيعمل إيه الموظف ده…"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-[#FAFAF7] text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] resize-none"
                />
              </div>
              <button
                onClick={saveMeta} disabled={saving}
                className="w-full py-2 rounded-xl bg-[#1A2E26] text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:opacity-90"
              >
                <Save className="w-4 h-4" /> {saving ? 'جاري الحفظ…' : 'احفظ التعديلات'}{msg && <span className="text-[#6FCF97]"> · {msg}</span>}
              </button>
            </div>

            {/* Tasks */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
              <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] flex items-center gap-1 mb-1">
                <ListChecks className="w-3 h-3" /> مهام الموظف
              </p>
              {d.tasks.length === 0 ? (
                <p className="text-xs text-[#6B7280] py-2 text-center">مفيش مهام محددة</p>
              ) : d.tasks.map((t) => (
                <div key={t.id} className={`flex items-center gap-2 rounded-xl border p-2.5 ${
                  t.active ? 'border-gray-100' : 'border-gray-100 opacity-50'
                }`}>
                  <button onClick={() => toggleTask(t)} className="flex-shrink-0 active:scale-90 transition-transform">
                    {t.active ? <CheckCircle2 className="w-5 h-5 text-[#1F6F5F]" /> : <Circle className="w-5 h-5 text-gray-300" />}
                  </button>
                  <span className={`flex-1 text-sm ${t.active ? 'text-[#1A2E26] font-medium' : 'text-[#6B7280] line-through'}`}>{t.title_ar}</span>
                  <button onClick={() => delTask(t)} className="text-[#6B7280] hover:text-red-600 p-1 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
                  placeholder="مهمة جديدة…"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-[#FAFAF7] text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]"
                />
                <button onClick={addTask} disabled={!newTask.trim() || saving}
                  className="px-3 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> اضف
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   FLOW CARD + FLOW BUILDER — سلاسل شغل الـ agents
   ============================================================ */
function FlowCard({ f, running, onRun, onToggle, onEdit, onDelete }: {
  f: Flow; running: boolean
  onRun: () => void; onToggle: () => void; onEdit: () => void; onDelete: () => void
}) {
  const lr = f.last_run
  const lrColor = !lr ? 'text-[#6B7280] bg-gray-100'
    : lr.status === 'completed' ? 'text-[#1F6F5F] bg-[#1F6F5F]/10'
    : lr.status === 'running' ? 'text-amber-700 bg-amber-50'
    : 'text-red-600 bg-red-50'
  const lrLabel = !lr ? 'ما اشتغلش'
    : lr.status === 'completed' ? 'تمام ✓'
    : lr.status === 'running' ? 'شغّال…'
    : lr.status === 'completed_with_errors' ? 'فيه أخطاء'
    : (lr.status || '—')
  return (
    <div className={`rounded-2xl border p-4 ${f.enabled ? 'border-[#1F6F5F]/30 bg-white' : 'border-gray-100 bg-[#FAFAF7] opacity-80'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-[#1A2E26] truncate">{f.name}</h4>
          {f.description && <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">{f.description}</p>}
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold flex-shrink-0 ${lrColor}`}>{lrLabel}</span>
      </div>
      <div className="flex items-center flex-wrap gap-1 mb-3">
        {f.steps.slice(0, 6).map((s, i) => {
          const t = stepType(s); const m = STEP_TYPE_META[t]
          return (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-[#6B7280]">→</span>}
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold inline-flex items-center gap-1 ${m.chip}`}>
                <span>{m.icon}</span><span className="truncate max-w-[90px]" dir="auto">{stepLabel(s)}</span>
              </span>
            </span>
          )
        })}
        {f.steps.length > 6 && <span className="text-[9px] text-[#6B7280]">+{f.steps.length - 6}</span>}
        {f.steps.length === 0 && <span className="text-[10px] text-[#6B7280]">مفيش خطوات</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onRun} disabled={running || f.steps.length === 0}
          className="flex-1 px-3 py-2 rounded-xl bg-[#1F6F5F] text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:opacity-90">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'بيشتغل…' : 'شغّل دلوقتي'}
        </button>
        <button onClick={onEdit} title="تعديل" className="px-2.5 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-[#1A2E26]"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onToggle} title={f.enabled ? 'تعطيل' : 'تفعيل'} className="px-2.5 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-[#1A2E26]">{f.enabled ? <Pause className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}</button>
        <button onClick={onDelete} title="حذف" className="px-2.5 py-2 rounded-xl bg-[#FAFAF7] hover:bg-red-50 text-[#6B7280] hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

function FlowBuilder({ flow, agents, roster, onClose, onSaved }: {
  flow: Flow | null
  agents: AiAgent[]
  roster: Roster | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(flow?.name || '')
  const [desc, setDesc] = useState(flow?.description || '')
  const [steps, setSteps] = useState<FlowStep[]>(flow?.steps?.length ? flow.steps.map((s) => ({ ...s, type: stepType(s) })) : [])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const agentOptions = useMemo(() =>
    [...agents].sort((a, b) =>
      a.team.localeCompare(b.team) ||
      (a.display_name || a.agent_name).localeCompare(b.display_name || b.agent_name)),
  [agents])

  const people = useMemo(() => {
    const list: { name: string; email: string | null; tag?: string }[] = []
    if (roster?.owner) list.push({ name: `${roster.owner.name} (إنت)`, email: roster.owner.email, tag: 'الأونر' })
    for (const e of roster?.employees || []) list.push({ name: e.name, email: e.email, tag: e.role_ar || '' })
    return list
  }, [roster])

  function defaultStep(t: StepType): FlowStep {
    if (t === 'agent') return { type: 'agent', agent: agentOptions[0]?.agent_name || '' }
    if (t === 'ai') return { type: 'ai', prompt: '', output_key: `ai_${steps.length + 1}` }
    if (t === 'choice') return { type: 'choice', prompt: '', output_key: 'choice' }
    if (t === 'email') return { type: 'email', subject: '', body: '', to: [], cc: [] }
    return { type: 'drive', drive_title: '' }
  }
  function addStep(t: StepType) { setSteps((s) => [...s, defaultStep(t)]) }
  function removeStep(i: number) { setSteps((s) => s.filter((_, idx) => idx !== i)) }
  function move(i: number, dir: -1 | 1) {
    setSteps((s) => {
      const j = i + dir
      if (j < 0 || j >= s.length) return s
      const c = [...s];[c[i], c[j]] = [c[j], c[i]]; return c
    })
  }
  function setStep(i: number, patch: Partial<FlowStep>) {
    setSteps((s) => s.map((st, idx) => idx === i ? { ...st, ...patch } : st))
  }
  function toggleEmail(i: number, field: 'to' | 'cc', email: string) {
    setSteps((s) => s.map((st, idx) => {
      if (idx !== i) return st
      const arr = new Set([...(st[field] || [])])
      if (arr.has(email)) arr.delete(email); else arr.add(email)
      return { ...st, [field]: [...arr] }
    }))
  }
  const nameOf = (an: string) => agents.find((a) => a.agent_name === an)?.display_name || an

  function cleanForSave(): FlowStep[] {
    const out: FlowStep[] = []
    steps.forEach((s, i) => {
      const t = stepType(s)
      if (t === 'agent' && s.agent) out.push({ type: 'agent', agent: s.agent, output_key: s.output_key || undefined })
      else if (t === 'ai' && (s.prompt || '').trim()) out.push({ type: 'ai', prompt: s.prompt, output_key: (s.output_key || `ai_${i + 1}`).trim() })
      else if (t === 'choice' && ((s.prompt || '').trim() || s.options_key)) out.push({ type: 'choice', prompt: s.prompt || undefined, options_key: s.options_key || undefined, output_key: (s.output_key || 'choice').trim() })
      else if (t === 'email' && (s.subject || '').trim() && ((s.to || []).length || (s.cc || []).length)) out.push({ type: 'email', subject: s.subject, body: s.body || '', to: s.to || [], cc: s.cc || [] })
      else if (t === 'drive') out.push({ type: 'drive', drive_title: (s.drive_title || '').trim() || 'مخرجات' })
    })
    return out
  }

  async function save() {
    if (!name.trim()) { setErr('اكتب اسم الـ flow'); return }
    const clean = cleanForSave()
    if (clean.length === 0) { setErr('ضيف خطوة صالحة واحدة على الأقل'); return }
    setSaving(true); setErr('')
    const body = flow
      ? { action: 'update', id: flow.id, name, description: desc, steps: clean }
      : { action: 'create', name, description: desc, steps: clean }
    const r = await fetch('/api/admin/flow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setSaving(false)
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j?.error || 'فشل الحفظ'); return }
    onSaved()
  }

  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-[#FAFAF7] text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center gap-3">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] flex-shrink-0"><Workflow className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-black text-[#1A2E26]">{flow ? 'تعديل flow' : 'flow جديد'}</h2>
            <p className="text-xs text-[#6B7280]">رتّب الخطوات: موظف AI · مهمة AI · قرارك · إيميل · حفظ</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#6B7280] hover:text-[#1A2E26]"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1 block">اسم الـ flow</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: محرّك محتوى الماركتنج"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]" />
          </div>
          <div>
            <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1 block">وصف (اختياري)</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="بيعمل إيه الـ flow ده"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]" />
          </div>

          <div>
            <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-2 block">الخطوات (بالترتيب)</label>
            <div className="space-y-2">
              {steps.map((s, i) => {
                const t = stepType(s); const m = STEP_TYPE_META[t]
                return (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-grid place-items-center w-6 h-6 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] text-[10px] font-black flex-shrink-0">{i + 1}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${m.chip}`}><span>{m.icon}</span>{m.label}</span>
                      <div className="flex-1" />
                      <div className="flex flex-col flex-shrink-0">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-[#6B7280] hover:text-[#1A2E26] disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="p-0.5 text-[#6B7280] hover:text-[#1A2E26] disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                      <button onClick={() => removeStep(i)} className="p-1 text-[#6B7280] hover:text-red-600 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    {t === 'agent' && (
                      <select value={s.agent || ''} onChange={(e) => setStep(i, { agent: e.target.value })} className={inputCls}>
                        {agentOptions.map((a) => (
                          <option key={a.agent_name} value={a.agent_name}>{(AI_TEAM_META[a.team]?.label || a.team)} · {a.display_name || a.agent_name}</option>
                        ))}
                      </select>
                    )}

                    {t === 'ai' && (<>
                      <textarea value={s.prompt || ''} onChange={(e) => setStep(i, { prompt: e.target.value })} rows={2} placeholder="المهمة… مثلاً: حلّل الـ algorithm الأنسب لكل منصة للموضوع {{chosen_topic}}" className={`${inputCls} resize-none`} />
                      <input value={s.output_key || ''} onChange={(e) => setStep(i, { output_key: e.target.value })} placeholder="اسم الناتج (مثلاً: algorithm)" dir="ltr" className={`${inputCls} font-mono text-xs`} />
                    </>)}

                    {t === 'choice' && (<>
                      <textarea value={s.prompt || ''} onChange={(e) => setStep(i, { prompt: e.target.value })} rows={2} placeholder="التعليمات اللي تطلّع الاختيارات… مثلاً: هاتلي أعلى ٥ مواضيع trend في مصر والعالم" className={`${inputCls} resize-none`} />
                      <input value={s.output_key || ''} onChange={(e) => setStep(i, { output_key: e.target.value })} placeholder="اسم اختيارك (مثلاً: chosen_topic)" dir="ltr" className={`${inputCls} font-mono text-xs`} />
                      <p className="text-[10px] text-[#6B7280]">⏸ الـ flow هيقف هنا ويستنّى اختيارك قبل ما يكمّل</p>
                    </>)}

                    {t === 'email' && (<>
                      <input value={s.subject || ''} onChange={(e) => setStep(i, { subject: e.target.value })} placeholder="عنوان الإيميل (يقبل {{chosen_topic}})" className={inputCls} />
                      <textarea value={s.body || ''} onChange={(e) => setStep(i, { body: e.target.value })} rows={3} placeholder="نص الإيميل… تقدر تحط {{algorithm}} أو {{keywords}} وهيتعوّضوا بالناتج" className={`${inputCls} resize-none`} />
                      <div>
                        <p className="text-[10px] font-bold text-[#6B7280] mb-1">لمين (TO)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {people.length === 0 && <span className="text-[10px] text-[#6B7280]">حمّل الفريق…</span>}
                          {people.map((p, k) => {
                            const sel = !!p.email && (s.to || []).includes(p.email)
                            return (
                              <button key={k} disabled={!p.email} onClick={() => p.email && toggleEmail(i, 'to', p.email)}
                                title={p.email || 'محتاج إيميل'}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${!p.email ? 'opacity-40 border-gray-200 text-[#6B7280]' : sel ? 'bg-[#1F6F5F] text-white border-[#1F6F5F]' : 'bg-white border-gray-200 text-[#1A2E26] hover:border-[#1F6F5F]'}`}>
                                {p.name}{!p.email && ' ⚠'}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#6B7280] mb-1">نسخة (CC)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {people.map((p, k) => {
                            const sel = !!p.email && (s.cc || []).includes(p.email)
                            return (
                              <button key={k} disabled={!p.email} onClick={() => p.email && toggleEmail(i, 'cc', p.email)}
                                title={p.email || 'محتاج إيميل'}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${!p.email ? 'opacity-40 border-gray-200 text-[#6B7280]' : sel ? 'bg-[#2FA084] text-white border-[#2FA084]' : 'bg-white border-gray-200 text-[#1A2E26] hover:border-[#2FA084]'}`}>
                                {p.name}{!p.email && ' ⚠'}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {people.some((p) => !p.email) && <p className="text-[10px] text-[#D4A017]">⚠ فيه ناس مفيش ليها إيميل — ضيفه من "إيميلات الفريق"</p>}
                    </>)}

                    {t === 'drive' && (
                      <input value={s.drive_title || ''} onChange={(e) => setStep(i, { drive_title: e.target.value })} placeholder="اسم الملف اللي هيتحفظ (مثلاً: خطة نشر {{chosen_topic}})" className={inputCls} />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-1.5">
              {(['agent', 'ai', 'choice', 'email', 'drive'] as StepType[]).map((t) => {
                const m = STEP_TYPE_META[t]
                return (
                  <button key={t} onClick={() => addStep(t)}
                    className="p-2 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1F6F5F] text-[#6B7280] hover:text-[#1F6F5F] text-[11px] font-bold flex items-center justify-center gap-1">
                    <span>{m.icon}</span> {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {steps.length > 0 && (
            <div className="bg-[#1F6F5F]/5 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-[#6B7280] mb-1">المعاينة</p>
              <div className="flex items-center flex-wrap gap-1">
                {steps.map((s, i) => {
                  const t = stepType(s); const m = STEP_TYPE_META[t]
                  return (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-[#6B7280]">→</span>}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${m.chip}`}><span>{m.icon}</span>{stepLabel(s, nameOf)}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {err && <p className="text-xs font-bold text-red-600">{err}</p>}
        </div>

        <footer className="px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-[#1A2E26] text-sm font-bold">إلغاء</button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:opacity-90">
            <Save className="w-4 h-4" /> {saving ? 'جاري الحفظ…' : (flow ? 'احفظ التعديلات' : 'اعمل الـ flow')}
          </button>
        </footer>
      </div>
    </div>
  )
}

/* ============================================================
   CHOICE MODAL — وقفة "قرارك إنت"
   ============================================================ */
function ChoiceModal({ data, resuming, onPick, onClose }: {
  data: { run_id: string; flow_name: string; options: Array<{ id?: string; label?: string }>; output_key: string }
  resuming: boolean
  onPick: (choice: string) => void
  onClose: () => void
}) {
  const [custom, setCustom] = useState('')
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resuming ? undefined : onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-lg md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center gap-3">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl flex-shrink-0 text-lg" style={{ background: '#D4A017', color: '#fff' }}>⏸</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-black text-[#1A2E26]">قرارك مطلوب</h2>
            <p className="text-xs text-[#6B7280] truncate">{data.flow_name} · اختار عشان يكمّل</p>
          </div>
          {!resuming && <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#6B7280] hover:text-[#1A2E26]"><X className="w-5 h-5" /></button>}
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {data.options.length === 0 && <p className="text-xs text-[#6B7280] text-center py-3">مفيش اختيارات جاهزة — اكتب اختيارك تحت</p>}
          {data.options.map((o, k) => {
            const label = o?.label ?? JSON.stringify(o)
            return (
              <button key={k} disabled={resuming} onClick={() => onPick(label)}
                className="w-full text-right p-3 rounded-2xl border border-gray-200 bg-white hover:border-[#1F6F5F] hover:shadow-sm text-sm font-bold text-[#1A2E26] disabled:opacity-50 flex items-center gap-2">
                <span className="inline-grid place-items-center w-6 h-6 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] text-[11px] font-black flex-shrink-0">{k + 1}</span>
                <span className="flex-1">{label}</span>
              </button>
            )
          })}
          <div className="pt-2 flex items-center gap-2">
            <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) onPick(custom.trim()) }}
              placeholder="أو اكتب اختيارك…" disabled={resuming}
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]" />
            <button onClick={() => custom.trim() && onPick(custom.trim())} disabled={resuming || !custom.trim()}
              className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1.5">
              {resuming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} كمّل
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   COMMS MODAL — إيميلات الفريق (للـ handoff)
   ============================================================ */
function CommsModal({ roster, onClose, onSaved }: {
  roster: Roster | null
  onClose: () => void
  onSaved: () => void
}) {
  const [ownerEmail, setOwnerEmail] = useState(roster?.owner.email || '')
  const [ownerName, setOwnerName] = useState(roster?.owner.name || '')
  const [alwaysCc, setAlwaysCc] = useState((roster?.owner.always_cc || []).join(', '))
  const [emps, setEmps] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const e of roster?.employees || []) if (e.employee_id) m[e.employee_id] = e.email || ''
    return m
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function saveOwner() {
    setSaving(true)
    // @ts-expect-error rpc untyped
    await supabase.rpc('set_comms_settings', {
      p_owner_email: ownerEmail.trim() || null,
      p_owner_name: ownerName.trim() || null,
      p_always_cc: alwaysCc.split(',').map((x) => x.trim()).filter(Boolean),
    })
    setMsg('اتسجّل ✓'); setTimeout(() => setMsg(''), 2000)
    setSaving(false); onSaved()
  }
  async function saveEmp(id: string) {
    setSaving(true)
    // @ts-expect-error rpc untyped
    await supabase.rpc('set_employee_email', { p_employee_id: id, p_email: (emps[id] || '').trim() || null })
    setMsg('اتسجّل ✓'); setTimeout(() => setMsg(''), 2000)
    setSaving(false); onSaved()
  }

  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-[#FAFAF7] text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]'
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-lg md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center gap-3">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex-shrink-0"><Mail className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-black text-[#1A2E26]">إيميلات الفريق</h2>
            <p className="text-xs text-[#6B7280]">عشان الـ handoff والـ CC يشتغلوا في الـ flows</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#6B7280] hover:text-[#1A2E26]"><X className="w-5 h-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">الأونر (إنت)</p>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="اسمك" className={inputCls} />
            <input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="إيميلك (reply-to)" dir="ltr" className={inputCls} />
            <input value={alwaysCc} onChange={(e) => setAlwaysCc(e.target.value)} placeholder="CC دايماً (مفصولين بفاصلة)" dir="ltr" className={inputCls} />
            <button onClick={saveOwner} disabled={saving} className="w-full py-2 rounded-xl bg-[#1A2E26] text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"><Save className="w-4 h-4" /> احفظ</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">الموظفين</p>
            {(roster?.employees || []).length === 0 && <p className="text-xs text-[#6B7280]">مفيش موظفين</p>}
            {(roster?.employees || []).map((e) => (
              <div key={e.employee_id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A2E26] truncate">{e.name}</p>
                  {e.role_ar && <p className="text-[10px] text-[#6B7280]">{e.role_ar}</p>}
                </div>
                <input value={emps[e.employee_id || ''] || ''} onChange={(ev) => setEmps((m) => ({ ...m, [e.employee_id || '']: ev.target.value }))}
                  placeholder="إيميل" dir="ltr" className="w-40 px-2 py-1.5 text-xs rounded-lg border border-gray-200 bg-[#FAFAF7] text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]" />
                <button onClick={() => saveEmp(e.employee_id || '')} disabled={saving} className="px-2.5 py-1.5 rounded-lg bg-[#1F6F5F] text-white text-xs font-bold disabled:opacity-50"><Save className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          {msg && <p className="text-xs font-bold text-[#1F6F5F] text-center">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
