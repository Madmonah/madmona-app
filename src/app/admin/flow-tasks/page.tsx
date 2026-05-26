'use client'

/* ============================================================
   /admin/flow-tasks
   مهام الـ Flows — اللي بتتولّد من إيميلات الـ handoff
   كل مهمة بخطوات (checklist) نقدر نتابعها ونشطّبها خطوة خطوة
   ============================================================ */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ListChecks, CheckCircle2, Circle, Loader2, RefreshCw, ChevronLeft,
  Trash2, Workflow, Mail, Clock, Plus, X, Save, User,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Step = { id: string; text: string; done: boolean }
type Task = {
  id: string
  pipeline_run_id: string | null
  flow_name: string | null
  title: string
  detail: string | null
  assignee_email: string | null
  assignee_name: string | null
  status: 'pending' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  steps: Step[]
  source: string
  created_at: string
  updated_at: string
  completed_at: string | null
  n_steps: number
  n_done: number
}

const STATUS_META: Record<Task['status'], { label: string; cls: string }> = {
  pending:     { label: 'لسه',     cls: 'bg-gray-100 text-[#6B7280]' },
  in_progress: { label: 'شغّالين', cls: 'bg-amber-50 text-amber-700' },
  done:        { label: 'خلصت ✓',  cls: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
}
const FILTERS: Array<{ key: 'all' | Task['status']; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'لسه' },
  { key: 'in_progress', label: 'شغّالين' },
  { key: 'done', label: 'خلصت' },
]

export default function FlowTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | Task['status']>('all')
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error rpc untyped
    const { data } = await supabase.rpc('get_flow_tasks')
    setTasks((Array.isArray(data) ? data : []) as Task[])
    setLoading(false)
  }
  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  async function toggleStep(taskId: string, stepId: string, done: boolean) {
    // optimistic
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t
      const steps = t.steps.map((s) => s.id === stepId ? { ...s, done } : s)
      const n_done = steps.filter((s) => s.done).length
      const status: Task['status'] = n_done === 0 ? 'pending' : n_done === steps.length ? 'done' : 'in_progress'
      return { ...t, steps, n_done, status }
    }))
    // @ts-expect-error rpc untyped
    await supabase.rpc('flow_task_toggle_step', { p_id: taskId, p_step_id: stepId, p_done: done })
  }

  async function setStatus(taskId: string, status: Task['status']) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t))
    // @ts-expect-error rpc untyped
    await supabase.rpc('flow_task_set_status', { p_id: taskId, p_status: status })
    await load()
  }

  async function del(taskId: string) {
    if (!confirm('تحذف المهمة دي؟')) return
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    // @ts-expect-error rpc untyped
    await supabase.rpc('flow_task_delete', { p_id: taskId })
  }

  const filtered = useMemo(
    () => filter === 'all' ? tasks : tasks.filter((t) => t.status === filter),
    [tasks, filter]
  )
  // group by flow
  const groups = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of filtered) {
      const key = t.flow_name || 'بدون سلسلة'
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(t)
    }
    return [...m.entries()]
  }, [filtered])

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const steps = tasks.reduce((s, t) => s + (t.n_steps || 0), 0)
    const stepsDone = tasks.reduce((s, t) => s + (t.n_done || 0), 0)
    return { total, done, steps, stepsDone }
  }, [tasks])

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href="/admin/business-finance/c8b7b9d7-6178-4d0c-abdf-66f34b628e9d/team"
            className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للفريق
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">FLOW · TASKS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">مهام الـ Flows</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {stats.total} مهمة · {stats.done} خلصت · {stats.stepsDone}/{stats.steps} خطوة متشطّبة
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAdding(true)}
                className="px-4 py-2 rounded-xl bg-[#1F6F5F] hover:opacity-90 text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4" /> مهمة يدوي
              </button>
              <button onClick={load}
                className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 border border-gray-200 text-sm font-bold text-[#1A2E26] flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
              </button>
            </div>
          </div>

          {/* filters */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filter === f.key ? 'bg-[#1A2E26] text-white' : 'bg-[#FAFAF7] text-[#6B7280] hover:bg-gray-100'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* hint */}
        <div className="bg-[#1F6F5F]/5 border border-[#1F6F5F]/20 rounded-2xl p-3 text-xs text-[#1A2E26] flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#1F6F5F] flex-shrink-0" />
          <span>كل إيميل handoff من الـ Flows بيتحوّل تلقائياً لمهام بخطوات هنا — شطّب الخطوة لما تخلص</span>
        </div>

        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <ListChecks className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" />
            <p className="text-base font-bold text-[#1A2E26]">مفيش مهام لسه</p>
            <p className="text-sm text-[#6B7280] mt-1">شغّل أي flow فيه خطوة إيميل، والمهام هتظهر هنا بخطواتها</p>
          </div>
        ) : (
          groups.map(([flow, list]) => (
            <section key={flow} className="space-y-3">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-[#1F6F5F]" />
                <h2 className="text-sm font-black text-[#1A2E26]">{flow}</h2>
                <span className="text-[10px] text-[#6B7280]">{list.length} مهمة</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((t) => (
                  <TaskCard key={t.id} t={t} onToggleStep={toggleStep} onSetStatus={setStatus} onDelete={del} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {adding && <AddTaskModal onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await load() }} />}
    </div>
  )
}

function TaskCard({ t, onToggleStep, onSetStatus, onDelete }: {
  t: Task
  onToggleStep: (taskId: string, stepId: string, done: boolean) => void
  onSetStatus: (taskId: string, status: Task['status']) => void
  onDelete: (taskId: string) => void
}) {
  const sm = STATUS_META[t.status]
  const pct = t.n_steps > 0 ? Math.round((t.n_done / t.n_steps) * 100) : (t.status === 'done' ? 100 : 0)
  return (
    <div className={`rounded-2xl border p-4 bg-white ${t.status === 'done' ? 'border-[#1F6F5F]/30' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`text-sm font-black flex-1 ${t.status === 'done' ? 'text-[#6B7280]' : 'text-[#1A2E26]'}`}>{t.title}</h3>
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold flex-shrink-0 ${sm.cls}`}>{sm.label}</span>
      </div>

      {t.detail && <p className="text-xs text-[#6B7280] mb-2 leading-relaxed">{t.detail}</p>}

      {/* progress */}
      {t.n_steps > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-[#6B7280] mb-1">
            <span>{t.n_done}/{t.n_steps} خطوة</span><span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1F6F5F] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* steps */}
      <div className="space-y-1.5 mb-3">
        {t.steps.length === 0 ? (
          <p className="text-[11px] text-[#6B7280]">مفيش خطوات محددة</p>
        ) : t.steps.map((s) => (
          <button key={s.id} onClick={() => onToggleStep(t.id, s.id, !s.done)}
            className="w-full flex items-start gap-2 text-right group">
            <span className="flex-shrink-0 mt-0.5 transition-transform active:scale-90">
              {s.done ? <CheckCircle2 className="w-4 h-4 text-[#1F6F5F]" /> : <Circle className="w-4 h-4 text-gray-300 group-hover:text-[#1F6F5F]" />}
            </span>
            <span className={`text-xs leading-relaxed flex-1 ${s.done ? 'text-[#6B7280] line-through' : 'text-[#1A2E26]'}`}>{s.text}</span>
          </button>
        ))}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          {t.assignee_email && (
            <span className="text-[10px] text-[#6B7280] flex items-center gap-1 truncate" dir="ltr">
              <User className="w-3 h-3 flex-shrink-0" /> {t.assignee_email}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {t.status !== 'done' ? (
            <button onClick={() => onSetStatus(t.id, 'done')}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#1F6F5F]/10 text-[#1F6F5F] hover:bg-[#1F6F5F] hover:text-white transition-colors flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> خلصت
            </button>
          ) : (
            <button onClick={() => onSetStatus(t.id, 'pending')}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#FAFAF7] text-[#6B7280] hover:bg-gray-100 transition-colors flex items-center gap-1">
              <Clock className="w-3 h-3" /> رجّعها
            </button>
          )}
          <button onClick={() => onDelete(t.id)}
            className="px-2 py-1 rounded-lg bg-[#FAFAF7] hover:bg-red-50 text-[#6B7280] hover:text-red-600 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AddTaskModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [stepsText, setStepsText] = useState('')
  const [flowName, setFlowName] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    const steps = stepsText.split('\n').map((x) => x.trim()).filter(Boolean)
      .map((text, k) => ({ id: `st_${k + 1}`, text, done: false }))
    // @ts-expect-error rpc untyped
    await supabase.rpc('flow_task_add', {
      p_title: title.trim(),
      p_steps: steps,
      p_flow_name: flowName.trim() || null,
      p_source: 'manual',
    })
    setSaving(false)
    onSaved()
  }

  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-[#FAFAF7] text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F]'
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-lg md:mx-4 shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center gap-3">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] flex-shrink-0"><Plus className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-[#1A2E26]">مهمة يدوي</h2>
            <p className="text-xs text-[#6B7280]">كل سطر في الخطوات = خطوة منفصلة</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#6B7280] hover:text-[#1A2E26]"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-4 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المهمة" className={inputCls} />
          <input value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="السلسلة (اختياري)" className={inputCls} />
          <textarea value={stepsText} onChange={(e) => setStepsText(e.target.value)} rows={5}
            placeholder={'الخطوات — كل سطر خطوة:\nخطوة ١\nخطوة ٢\nخطوة ٣'} className={`${inputCls} resize-none`} />
          <button onClick={save} disabled={saving || !title.trim()}
            className="w-full py-2.5 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} احفظ المهمة
          </button>
        </div>
      </div>
    </div>
  )
}
