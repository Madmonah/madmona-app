'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Crown, Building2, ListChecks, ChevronLeft, Loader2,
  CheckCircle2, Circle, X, RefreshCw, Plus,
  TrendingUp, Sparkles, AlertCircle, Clock, LogIn, LogOut, Star, QrCode, ShieldCheck,
  Heart, Calendar, UserPlus,
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

export default function TeamOversightPage({
  params,
}: {
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

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
