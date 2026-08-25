'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, RefreshCw, CalendarClock, Plus, Trash2,
  Check, X, Play, Eye, EyeOff, AlertCircle, CheckCircle2, Circle,
} from 'lucide-react'

/* ============================================================================
   /admin/business-finance/[supplierId]/schedule — «جدول التاسكات اليومي»
   ============================================================================
   🎯 (٢٥ أغسطس ٢٠٢٦) محمد: «عايز أشوف التاسكات دي للمراجعة وعايزها تكون
      updated» — بعد ما اتعمل جدول ٩ ص ← ٦ م لفريق مضمونة.

   المشكلة اللي بيحلها:
     الجدول كان متحط في `recurring_task_templates` من الداتابيز على طول —
     يعني أي تعديل (ميعاد غلط · موظف اتنقل قسم · تاسك مالهاش لازمة) لازم
     يعدّي على جلسة SQL. الشاشة دي بتخلي الجدول **مراجَع ومتعدّل من
     الأبليكيشن**: تغيّر الميعاد والعنوان والأولوية والأيام، توقف سطر من
     غير ما تمسحه، تضيف سطر جديد، وتولّد تاسكات النهارده فورًا بعد التعديل.

   الفرق بينها وبين تاب «المهام» (flow-tasks):
     • هنا = **القالب** اللي بيتولّد منه كل يوم (مصدر الجدول).
     • هناك = تاسكات يوم بعينه (اللي اتولدت فعلًا) وحالتها.

   الصلاحية: كل الدوال بتفحص `can_manage_business_team(supplier_id)` جوّه
   الداتابيز — الشاشة مش هي الحارس.
   ============================================================================ */

// 🐞 (٢٥ أغسطس ٢٠٢٦ — محمد: «الصفحة مش بتفتح») **الجذر: العميل الغلط.**
//    الصفحة كانت بتعمل `createClient()` جديد بالمفتاح العام. العميل ده
//    **مالوش جلسة** — التوكن متخزّن في `supabaseBrowser` (اللي بيستخدم
//    safeStorage)، مش في أي عميل جديد بيتعمل على الطاير. يعني كل نداء
//    كان بيروح للداتابيز و`auth.uid()` فيه NULL، فحارس
//    `can_manage_business_team()` يرجّع false → الشاشة تقول «مالكش
//    صلاحية» **لكل الناس، حتى محمد**.
//
//    ⚠️ الدرس (محمد، ٢٥/٨): «لما نعمل تعديل نتأكد من كل تبعياته».
//    أنا اختبرت الحارس بمحاكاة SQL (`set_config('request.jwt.claims')`)
//    وده أثبت إن الدالة صح — بس ماختبرتش المسار اللي الصفحة بتمشي فيه
//    فعلًا. الاختبار الصح لأي شاشة بتنادي RPC فيها حارس = من المتصفح
//    بجلسة حقيقية، مش من SQL.
//
//    نفس النمط الغلط موجود في شاشات أدمن تانية (زي flow-tasks) — بس
//    هناك بيقرا جداول، فبيرجع فاضي من غير رسالة خطأ ومحدش واخد باله.
import { supabaseBrowser } from '@/lib/supabase-browser'

const rpc = supabaseBrowser.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>

type Tpl = {
  id: string; employee_id: string | null; employee_name: string | null
  title_ar: string; description: string | null; priority: string | null
  due_time: string | null; frequency: string; weekdays: number[] | null
  day_of_month: number | null; is_active: boolean; last_generated_date: string | null
}
type Emp = { id: string; full_name: string }

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const WORK_WEEK = [0, 1, 2, 3, 4]

const PRIO: Record<string, { label: string; cls: string }> = {
  high:   { label: 'عاجل',  cls: 'bg-red-50 text-red-600' },
  medium: { label: 'متوسط', cls: 'bg-amber-50 text-amber-700' },
  low:    { label: 'عادي',  cls: 'bg-[#34D399]/10 text-[#059669]' },
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')

export default function SchedulePage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params

  const [bizName, setBizName] = useState<string>('')
  const [tpls, setTpls] = useState<Tpl[]>([])
  const [emps, setEmps] = useState<Emp[]>([])
  const [todayDone, setTodayDone] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [showOff, setShowOff] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)

  // 🧱 (٢٥/٨) نداء واحد بيرجّع كل حاجة: اسم البيزنس · القالب · الموظفين ·
  //    حالة تاسكات النهارده. قبل كده الشاشة كانت بتقرا `daily_tasks`
  //    و`business_employees` مباشرة — وبوليسي `daily_tasks` هو `is_admin()`
  //    بس، فموظف مضمونة كان يفتح الشاشة ويلاقي عمود «اتعملت/لسه» فاضي
  //    من غير أي رسالة. الصلاحية بقت جوّه الدالة، والشاشة مابتقراش جدول
  //    مباشرة خالص.
  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await rpc('get_recurring_tasks', { p_supplier_id: supplierId })
    if (!data || data.ok === false) { setDenied(true); setLoading(false); return }
    setDenied(false)
    setBizName((data.business_name as string) || '')
    setTpls((data.templates || []) as Tpl[])
    setEmps((data.employees || []) as Emp[])
    setTodayDone((data.today_status || {}) as Record<string, boolean>)
    setLoading(false)
  }, [supplierId])

  useEffect(() => { load() }, [load])

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 3500) }

  async function call(fn: string, args: Record<string, unknown>, ok: string) {
    setBusy(fn)
    const { data, error } = await rpc(fn, args)
    setBusy(null)
    if (error || (data && data.ok === false)) {
      flash(data?.error || error?.message || 'حصل خطأ')
      return false
    }
    flash(ok)
    await load()
    return true
  }

  // تجميع بالموظف، ومرتّب بالميعاد جوّه كل موظف
  const groups = useMemo(() => {
    const shown = showOff ? tpls : tpls.filter(t => t.is_active)
    const byEmp = new Map<string, { name: string; rows: Tpl[] }>()
    shown.forEach(t => {
      const key = t.employee_id || '—'
      if (!byEmp.has(key)) byEmp.set(key, { name: t.employee_name || 'من غير موظف', rows: [] })
      byEmp.get(key)!.rows.push(t)
    })
    byEmp.forEach(g => g.rows.sort((a, b) => (a.due_time || '99').localeCompare(b.due_time || '99')))
    return [...byEmp.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'ar'))
  }, [tpls, showOff])

  const activeCount = tpls.filter(t => t.is_active).length

  if (loading) {
    return <div className="min-h-screen bg-[#FAFAF7] grid place-items-center" dir="rtl">
      <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
    </div>
  }

  if (denied) {
    return <div className="min-h-screen bg-[#FAFAF7] grid place-items-center px-4" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-sm">
        <AlertCircle className="w-8 h-8 text-[#b3261e] mx-auto mb-3" />
        <p className="font-black text-[#1A2E26]">مالكش صلاحية على البيزنس ده</p>
        <p className="text-xs text-[#6B7280] mt-1">الجدول ده بيتفتح بصلاحية إدارة الفريق.</p>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2 no-underline">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">DAILY SCHEDULE</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">جدول التاسكات اليومي · {bizName}</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {activeCount} تاسك شغّالة · بتتولّد كل يوم لوحدها حسب الأيام المحددة
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowOff(v => !v)}
                className="px-3 py-2 rounded-xl bg-[#FAFAF7] text-xs font-bold text-[#6B7280] flex items-center gap-1.5">
                {showOff ? <><EyeOff className="w-3.5 h-3.5" /> إخفاء الموقوفة</> : <><Eye className="w-3.5 h-3.5" /> إظهار الموقوفة</>}
              </button>
              <button onClick={() => call('recurring_tasks_generate_today', { p_supplier_id: supplierId }, 'اتولدت تاسكات النهارده')}
                disabled={busy !== null}
                className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-xs font-black flex items-center gap-1.5 disabled:opacity-50">
                <Play className="w-3.5 h-3.5" /> ولّد تاسكات النهارده
              </button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
          {msg && <p className="mt-3 text-xs font-bold text-[#059669] bg-[#34D399]/10 rounded-xl px-3 py-2">{msg}</p>}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {groups.length === 0 && (
          <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
            <CalendarClock className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش جدول متسجّل للبيزنس ده</p>
            <p className="text-xs text-[#6B7280] mt-1">اختار موظف من تحت وابدأ ضيف تاسكاته بميعادها.</p>
          </div>
        )}

        {groups.map(([empId, g]) => (
          <section key={empId} className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-black text-[#1A2E26]">{g.name}</h2>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  {g.rows.filter(r => r.is_active).length} تاسك ·{' '}
                  {hhmm(g.rows.find(r => r.is_active && r.due_time)?.due_time || null) || '—'} ←{' '}
                  {hhmm([...g.rows].reverse().find(r => r.is_active && r.due_time)?.due_time || null) || '—'}
                </p>
              </div>
              <button onClick={() => { setAdding(adding === empId ? null : empId); setEditing(null) }}
                className="px-3 py-1.5 rounded-full bg-[#FAFAF7] text-xs font-bold text-[#059669] flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> تاسك جديدة
              </button>
            </div>

            {adding === empId && (
              <RowForm
                employees={emps}
                fixedEmployee={empId}
                onCancel={() => setAdding(null)}
                onSave={async (v) => {
                  const ok = await call('recurring_task_add', {
                    p_supplier_id: supplierId, p_employee_id: empId, p_title_ar: v.title,
                    p_frequency: 'weekly', p_description: v.desc || null, p_priority: v.priority,
                    p_due_time: v.time || null, p_weekdays: v.days,
                  }, 'اتضافت')
                  if (ok) setAdding(null)
                }}
              />
            )}

            <div className="divide-y divide-gray-100">
              {g.rows.map(t => editing === t.id ? (
                <RowForm
                  key={t.id}
                  employees={emps}
                  initial={{ title: t.title_ar, desc: t.description || '', priority: t.priority || 'medium', time: hhmm(t.due_time), days: t.weekdays || WORK_WEEK }}
                  onCancel={() => setEditing(null)}
                  onSave={async (v) => {
                    const ok = await call('recurring_task_update', {
                      p_id: t.id, p_title_ar: v.title, p_description: v.desc || null,
                      p_priority: v.priority, p_due_time: v.time || null,
                      p_frequency: 'weekly', p_weekdays: v.days,
                      p_clear_due: !v.time, p_clear_desc: !v.desc,
                    }, 'اتعدّلت')
                    if (ok) setEditing(null)
                  }}
                />
              ) : (
                <TaskRow
                  key={t.id}
                  t={t}
                  doneToday={todayDone[`${t.employee_id}|${t.title_ar}`]}
                  onEdit={() => { setEditing(t.id); setAdding(null) }}
                  onToggle={() => call('recurring_task_toggle', { p_id: t.id, p_active: !t.is_active }, t.is_active ? 'اتوقفت' : 'اترجّعت')}
                  onDelete={() => call('recurring_task_delete', { p_id: t.id }, 'اتمسحت')}
                />
              ))}
            </div>
          </section>
        ))}

        <AddForEmployee
          employees={emps.filter(e => !groups.some(([id]) => id === e.id))}
          onAdd={async (empId, v) => {
            await call('recurring_task_add', {
              p_supplier_id: supplierId, p_employee_id: empId, p_title_ar: v.title,
              p_frequency: 'weekly', p_description: v.desc || null, p_priority: v.priority,
              p_due_time: v.time || null, p_weekdays: v.days,
            }, 'اتضافت')
          }}
        />
      </main>
    </div>
  )
}

/* ── سطر واحد في الجدول ─────────────────────────────────────────────── */
function TaskRow({ t, doneToday, onEdit, onToggle, onDelete }: {
  t: Tpl; doneToday: boolean | undefined
  onEdit: () => void; onToggle: () => void; onDelete: () => void
}) {
  const prio = PRIO[(t.priority || 'medium').toLowerCase()] || PRIO.medium
  const days = t.frequency === 'daily' ? 'كل يوم'
    : (t.weekdays || []).length === 5 && WORK_WEEK.every(d => (t.weekdays || []).includes(d)) ? 'الأحد–الخميس'
    : (t.weekdays || []).map(d => DAYS[d]).join(' · ') || '—'

  return (
    <div className={`px-5 py-3 flex items-start gap-3 ${t.is_active ? '' : 'opacity-45'}`}>
      <div className="w-14 shrink-0 pt-0.5">
        <span className="text-sm font-black text-[#1A2E26] tabular-nums">{hhmm(t.due_time) || '—'}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-[#1A2E26]">{t.title_ar}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prio.cls}`}>{prio.label}</span>
          {doneToday === true && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#34D399]/10 text-[#059669] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> اتعملت النهارده
            </span>
          )}
          {doneToday === false && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF7] text-[#6B7280] flex items-center gap-1">
              <Circle className="w-3 h-3" /> لسه
            </span>
          )}
        </div>
        {t.description && <p className="text-xs text-[#6B7280] mt-1">{t.description}</p>}
        <p className="text-[11px] text-[#6B7280] mt-1">{days}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} title="تعديل"
          className="px-2.5 py-1 rounded-lg bg-[#FAFAF7] text-[11px] font-bold text-[#059669]">تعديل</button>
        <button onClick={onToggle} title={t.is_active ? 'إيقاف' : 'تشغيل'}
          className="px-2.5 py-1 rounded-lg bg-[#FAFAF7] text-[11px] font-bold text-[#6B7280]">
          {t.is_active ? 'وقف' : 'شغّل'}
        </button>
        <button onClick={() => { if (confirmDelete()) onDelete() }} title="مسح"
          className="p-1.5 rounded-lg hover:bg-red-50 text-[#b3261e]"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

// 🗑️ المسح بيشيل القالب من الجدول خالص. الإيقاف بيسيبه ومايولّدش —
//    وده الأنسب لتاسك موسمية. بنسأل الأول عشان مفيش تراجع.
function confirmDelete() {
  return typeof window === 'undefined' ? false
    : window.confirm('هتمسح التاسك دي من الجدول خالص. لو عايز توقفها مؤقتًا استخدم «وقف» بدل المسح.')
}

type FormVal = { title: string; desc: string; priority: string; time: string; days: number[] }

/* ── فورم التعديل/الإضافة ───────────────────────────────────────────── */
function RowForm({ initial, onSave, onCancel }: {
  employees: Emp[]; fixedEmployee?: string; initial?: FormVal
  onSave: (v: FormVal) => void | Promise<void>; onCancel: () => void
}) {
  const [v, setV] = useState<FormVal>(initial || { title: '', desc: '', priority: 'medium', time: '', days: WORK_WEEK })
  const [saving, setSaving] = useState(false)

  const toggleDay = (d: number) =>
    setV(s => ({ ...s, days: s.days.includes(d) ? s.days.filter(x => x !== d) : [...s.days, d].sort() }))

  return (
    <div className="px-5 py-4 bg-[#FAFAF7]/60 border-y border-gray-100 space-y-3">
      <div className="flex gap-2 flex-wrap">
        {/* الميعاد 16px على الموبايل عشان iOS مايزوّمش — قاعدة مقفولة */}
        <input type="time" value={v.time} onChange={e => setV(s => ({ ...s, time: e.target.value }))}
          className="w-28 px-3 py-2 rounded-xl border border-gray-200 text-[16px] md:text-sm font-bold tabular-nums" />
        <input value={v.title} onChange={e => setV(s => ({ ...s, title: e.target.value }))}
          placeholder="عنوان التاسك — يبان للموظف زي ما هو"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-gray-200 text-[16px] md:text-sm" />
        <select value={v.priority} onChange={e => setV(s => ({ ...s, priority: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-gray-200 text-[16px] md:text-sm font-bold">
          <option value="high">عاجل</option>
          <option value="medium">متوسط</option>
          <option value="low">عادي</option>
        </select>
      </div>

      <input value={v.desc} onChange={e => setV(s => ({ ...s, desc: e.target.value }))}
        placeholder="شرح صغير (اختياري) — بيظهر تحت العنوان في شاشة الموظف"
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[16px] md:text-sm" />

      <div className="flex items-center gap-1.5 flex-wrap">
        {DAYS.map((d, i) => (
          <button key={i} type="button" onClick={() => toggleDay(i)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              v.days.includes(i) ? 'bg-[#34D399] text-[#04352A]' : 'bg-white border border-gray-200 text-[#6B7280]'}`}>
            {d}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={saving || !v.title.trim() || v.days.length === 0}
          onClick={async () => { setSaving(true); await onSave({ ...v, title: v.title.trim() }); setSaving(false) }}
          className="px-4 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-xs font-black flex items-center gap-1.5 disabled:opacity-40">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} حفظ
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-[#6B7280] flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" /> إلغاء
        </button>
        {v.days.length === 0 && <span className="text-[11px] font-bold text-[#b3261e]">اختار يوم واحد على الأقل</span>}
      </div>
    </div>
  )
}

/* ── إضافة أول تاسك لموظف لسه مالوش جدول ────────────────────────────── */
function AddForEmployee({ employees, onAdd }: {
  employees: Emp[]
  onAdd: (employeeId: string, v: FormVal) => void | Promise<void>
}) {
  const [pick, setPick] = useState<string>('')

  if (employees.length === 0) return null

  return (
    <section className="bg-white rounded-3xl border border-dashed border-gray-200 p-5">
      <h2 className="font-black text-[#1A2E26] text-sm">موظفين لسه من غير جدول</h2>
      <p className="text-xs text-[#6B7280] mt-1 mb-3">
        {employees.length} موظف مالهمش أي تاسك متكررة. اختار واحد وابدأ أول تاسك ليه.
      </p>
      <div className="flex gap-2 flex-wrap">
        {employees.map(e => (
          <button key={e.id} onClick={() => setPick(pick === e.id ? '' : e.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              pick === e.id ? 'bg-[#34D399] text-[#04352A]' : 'bg-[#FAFAF7] text-[#6B7280]'}`}>
            {e.full_name}
          </button>
        ))}
      </div>
      {pick && (
        <div className="mt-3 -mx-5 -mb-5">
          <RowForm
            employees={employees}
            fixedEmployee={pick}
            onCancel={() => setPick('')}
            onSave={async (v) => { await onAdd(pick, v); setPick('') }}
          />
        </div>
      )}
    </section>
  )
}
