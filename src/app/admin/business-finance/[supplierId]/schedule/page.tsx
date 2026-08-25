'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Loader2, RefreshCw, CalendarClock, Plus, Trash2,
  Check, X, Play, Eye, EyeOff, AlertCircle, CheckCircle2, Circle,
  Radio, Anchor, LogIn as LogInIcon,
} from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'

/* ============================================================================
   /admin/business-finance/[supplierId]/schedule — «جدول التاسكات اليومي»
   ============================================================================
   🎯 (٢٥ أغسطس ٢٠٢٦) محمد: «عايز أشوف التاسكات دي للمراجعة وعايزها تكون
      updated» ← وبعدها: «محتاج بلان تفصيلية لتاسكات كل فريق بالوقت على
      حسب معاد تسجيل الدخول + الصفحة دي محتاجة تكون منظمة».

   إيه اللي بيتعرض هنا:
     **القالب** اللي بيتولّد منه يوم كل موظف — مش تاسكات يوم بعينه
     (دي في تاب «المهام»، والصورة الحية في «المونيتور»).
     التجميع بالقسم (مبيعات · دعم فني · أوفيس · إشراف · الإدارة) —
     القسم جاي من business_employees.metadata->team.

   المرساة (anchor_mode):
     'clockin' → التاسك بتتولد لحظة أول بصمة حضور وميعادها = الحضور +
       offset_minutes (بسقف ١٧:٤٥). ده الافتراضي — لأن الفريق بيسجّل
       ١٠:٣٠–١٢:٢٤ مش ٩:٠٠، وخطة بساعات حائط ثابتة بتبقى «متأخرة»
       قبل ما اليوم يبدأ.
     'fixed' → ميعاد حائط ثابت (الراحة ١:٠٠).
     الوقت المعروض في الفورم لتاسك clockin هو «لو حضر ٩:٠٠» — بيتحول
     إزاحة عند الحفظ.

   ⚠️ تاريخ الدروس المدفوعة هنا (متلخص — التفاصيل في git log):
     ١) الحارس اتجرب بـSQL بس فقفل الشاشة → الاختبار من متصفح بجلسة حقيقية.
     ٢) اللوحة ليها نظامين دخول (جلسة Supabase + توكن واتساب) → كل
        النداءات بتبعت p_token (شوف financeRpc).
     ٣) supabase-js بتعلّق على قفل navigator.locks في الـPWA → الشاشة دي
        بتستخدم fetch مباشر (financeRpc) — **متجيبش المكتبة هنا تاني**.
     ٤) أي فشل تحميل يظهر بنصّه مع «حاول تاني» — مفيش لودر أبدي.
   ============================================================================ */

type Tpl = {
  id: string; employee_id: string | null; employee_name: string | null
  team: string; title_ar: string; description: string | null; priority: string | null
  due_time: string | null; anchor_mode: 'fixed' | 'clockin'; offset_minutes: number | null
  frequency: string; weekdays: number[] | null
  day_of_month: number | null; is_active: boolean; last_generated_date: string | null
}
type Emp = { id: string; full_name: string; team: string }

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const WORK_WEEK = [0, 1, 2, 3, 4]
const TEAM_ORDER = ['مبيعات', 'دعم فني', 'أوفيس', 'إشراف', 'الإدارة']

const PRIO: Record<string, { label: string; cls: string }> = {
  high:   { label: 'عاجل',  cls: 'bg-red-50 text-red-600' },
  medium: { label: 'متوسط', cls: 'bg-amber-50 text-amber-700' },
  low:    { label: 'عادي',  cls: 'bg-[#34D399]/10 text-[#059669]' },
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')

// إزاحة بالدقايق → نص مقروء: «مع الحضور» · «+٣٠د» · «+٢س» · «+٢س ٣٠د»
function fmtOffset(mins: number | null): string {
  const m = mins ?? 0
  if (m <= 0) return 'مع الحضور'
  const h = Math.floor(m / 60), r = m % 60
  if (h === 0) return `+${r}د`
  return r === 0 ? `+${h}س` : `+${h}س ${r}د`
}
// الإزاحة ↔ «لو حضر ٩:٠٠» (للفورم)
const offsetToTime = (m: number | null) => {
  const t = 9 * 60 + (m ?? 0)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
const timeToOffset = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return Math.max(0, (h * 60 + m) - 9 * 60)
}

export default function SchedulePage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params

  const [bizName, setBizName] = useState('')
  const [tpls, setTpls] = useState<Tpl[]>([])
  const [emps, setEmps] = useState<Emp[]>([])
  const [todayDone, setTodayDone] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [showOff, setShowOff] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [openEmp, setOpenEmp] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(null)
    try {
      const { data, error } = await financeRpc('get_recurring_tasks', { p_supplier_id: supplierId })
      if (error) { setLoadErr(error.message); return }
      if (!data || data.ok === false) { setDenied(true); return }
      setDenied(false)
      setBizName((data.business_name as string) || '')
      setTpls((data.templates || []) as Tpl[])
      setEmps((data.employees || []) as Emp[])
      setTodayDone((data.today_status || {}) as Record<string, boolean>)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'حصل خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }, [supplierId])

  useEffect(() => { load() }, [load])

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 3500) }

  async function call(fn: string, args: Record<string, unknown>, ok: string) {
    setBusy(fn)
    const { data, error } = await financeRpc(fn, args)
    setBusy(null)
    if (error || (data && data.ok === false)) {
      flash(data?.error || error?.message || 'حصل خطأ')
      return false
    }
    flash(ok)
    await load()
    return true
  }

  // قسم ← موظفين ← تاسكات مرتبة بالإزاحة/الميعاد
  const teams = useMemo(() => {
    const shown = showOff ? tpls : tpls.filter(t => t.is_active)
    const byEmp = new Map<string, { name: string; team: string; rows: Tpl[] }>()
    shown.forEach(t => {
      const key = t.employee_id || '—'
      if (!byEmp.has(key)) byEmp.set(key, { name: t.employee_name || 'من غير موظف', team: t.team || '—', rows: [] })
      byEmp.get(key)!.rows.push(t)
    })
    const sortKey = (t: Tpl) =>
      t.anchor_mode === 'clockin' ? (t.offset_minutes ?? 0) : (t.due_time ? timeToOffset(hhmm(t.due_time)) : 9999)
    byEmp.forEach(g => g.rows.sort((a, b) => sortKey(a) - sortKey(b)))

    const byTeam = new Map<string, [string, { name: string; team: string; rows: Tpl[] }][]>()
    ;[...byEmp.entries()].forEach(e => {
      const tm = e[1].team
      if (!byTeam.has(tm)) byTeam.set(tm, [])
      byTeam.get(tm)!.push(e)
    })
    byTeam.forEach(list => list.sort((a, b) => a[1].name.localeCompare(b[1].name, 'ar')))
    return [...byTeam.entries()].sort((a, b) =>
      (TEAM_ORDER.indexOf(a[0]) + 99 * +(TEAM_ORDER.indexOf(a[0]) < 0))
      - (TEAM_ORDER.indexOf(b[0]) + 99 * +(TEAM_ORDER.indexOf(b[0]) < 0)))
  }, [tpls, showOff])

  const activeCount = tpls.filter(t => t.is_active).length
  const clockinCount = tpls.filter(t => t.is_active && t.anchor_mode === 'clockin').length

  if (loading) {
    return <div className="min-h-screen bg-[#FAFAF7] grid place-items-center" dir="rtl">
      <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
    </div>
  }

  if (loadErr) {
    return <div className="min-h-screen bg-[#FAFAF7] grid place-items-center px-4" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-sm">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
        <p className="font-black text-[#1A2E26]">الجدول مش راضي يتحمّل</p>
        <p className="text-xs text-[#6B7280] mt-2 break-words" dir="auto">{loadErr}</p>
        <button onClick={load} className="mt-5 w-full py-2.5 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black">حاول تاني</button>
      </div>
    </div>
  }

  if (denied) {
    return <div className="min-h-screen bg-[#FAFAF7] grid place-items-center px-4" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-sm">
        <AlertCircle className="w-8 h-8 text-[#b3261e] mx-auto mb-3" />
        <p className="font-black text-[#1A2E26]">مالكش صلاحية على البيزنس ده</p>
        <p className="text-xs text-[#6B7280] mt-1">
          لو لسه مسجلتش دخول بحساب الأبليكيشن، سجّل الأول وبعدين ارجع هنا.
        </p>
        <div className="flex gap-2 mt-5">
          <button onClick={load} className="flex-1 py-2.5 rounded-xl bg-[#FAFAF7] border border-gray-200 text-sm font-bold text-[#1A2E26]">حاول تاني</button>
          <Link href="/login" className="flex-1 py-2.5 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black no-underline grid place-items-center">
            <span className="flex items-center gap-1"><LogInIcon className="w-3.5 h-3.5" /> تسجيل دخول</span>
          </Link>
        </div>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 no-underline">
              <ChevronLeft className="w-3.5 h-3.5" /> رجوع
            </Link>
            <Link href={`/admin/business-finance/${supplierId}/monitor`}
              className="text-xs font-black text-[#059669] flex items-center gap-1.5 no-underline bg-[#34D399]/10 px-3 py-1.5 rounded-full">
              <Radio className="w-3.5 h-3.5" /> افتح المونيتور الحي
            </Link>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">جدول التاسكات اليومي · {bizName}</h1>
              <p className="text-sm text-[#6B7280] mt-1 flex items-center gap-1.5 flex-wrap">
                <Anchor className="w-3.5 h-3.5 text-[#059669]" />
                {clockinCount} تاسك بتبدأ من ساعة ما الموظف يسجّل حضوره · {activeCount - clockinCount} بميعاد ثابت
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowOff(v => !v)}
                className="px-3 py-2 rounded-xl bg-[#FAFAF7] text-xs font-bold text-[#6B7280] flex items-center gap-1.5">
                {showOff ? <><EyeOff className="w-3.5 h-3.5" /> إخفاء الموقوفة</> : <><Eye className="w-3.5 h-3.5" /> الموقوفة</>}
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

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {teams.length === 0 && (
          <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
            <CalendarClock className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش جدول متسجّل</p>
          </div>
        )}

        {teams.map(([teamName, members]) => (
          <section key={teamName}>
            <h2 className="text-xs font-black text-[#6B7280] tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-[#34D399] inline-block" /> {teamName}
              <span className="text-[10px] font-bold text-[#9CA3AF]">
                {members.length} {members.length === 1 ? 'موظف' : 'موظفين'} ·{' '}
                {members.reduce((s, [, g]) => s + g.rows.length, 0)} تاسك
              </span>
            </h2>

            <div className="space-y-3">
              {members.map(([empId, g]) => {
                const open = openEmp === empId
                return (
                  <section key={empId} className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                    <button type="button" onClick={() => setOpenEmp(open ? null : empId)}
                      className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-right">
                      <div className="min-w-0">
                        <h3 className="font-black text-[#1A2E26] text-sm">{g.name}</h3>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">
                          {g.rows.length} تاسك · أولها {fmtOffset(g.rows[0]?.anchor_mode === 'clockin' ? g.rows[0]?.offset_minutes : null)}
                          {g.rows[0]?.anchor_mode !== 'clockin' && g.rows[0]?.due_time ? ` ${hhmm(g.rows[0].due_time)}` : ''}
                        </p>
                      </div>
                      <span className={`text-[#6B7280] text-lg transition-transform ${open ? 'rotate-90' : ''}`}>‹</span>
                    </button>

                    {open && (
                      <>
                        <div className="px-5 pb-3 flex justify-end">
                          <button onClick={() => { setAdding(adding === empId ? null : empId); setEditing(null) }}
                            className="px-3 py-1.5 rounded-full bg-[#FAFAF7] text-xs font-bold text-[#059669] flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> تاسك جديدة
                          </button>
                        </div>

                        {adding === empId && (
                          <RowForm
                            onCancel={() => setAdding(null)}
                            onSave={async (v) => {
                              const ok = await call('recurring_task_add', {
                                p_supplier_id: supplierId, p_employee_id: empId, p_title_ar: v.title,
                                p_frequency: 'weekly', p_description: v.desc || null, p_priority: v.priority,
                                p_due_time: v.time || null, p_weekdays: v.days,
                                p_anchor_mode: v.anchor, p_offset_minutes: v.anchor === 'clockin' && v.time ? timeToOffset(v.time) : null,
                              }, 'اتضافت')
                              if (ok) setAdding(null)
                            }}
                          />
                        )}

                        <div className="divide-y divide-gray-100 border-t border-gray-50">
                          {g.rows.map(t => editing === t.id ? (
                            <RowForm
                              key={t.id}
                              initial={{
                                title: t.title_ar, desc: t.description || '', priority: t.priority || 'medium',
                                time: t.anchor_mode === 'clockin' ? offsetToTime(t.offset_minutes) : hhmm(t.due_time),
                                days: t.weekdays || WORK_WEEK, anchor: t.anchor_mode,
                              }}
                              onCancel={() => setEditing(null)}
                              onSave={async (v) => {
                                const ok = await call('recurring_task_update', {
                                  p_id: t.id, p_title_ar: v.title, p_description: v.desc || null,
                                  p_priority: v.priority,
                                  p_due_time: v.anchor === 'fixed' ? (v.time || null) : (v.time || null),
                                  p_frequency: 'weekly', p_weekdays: v.days,
                                  p_clear_due: !v.time, p_clear_desc: !v.desc,
                                  p_anchor_mode: v.anchor,
                                  p_offset_minutes: v.anchor === 'clockin' && v.time ? timeToOffset(v.time) : null,
                                }, 'اتعدّلت')
                                if (ok) setEditing(null)
                              }}
                            />
                          ) : (
                            <TaskRow key={t.id} t={t}
                              doneToday={todayDone[`${t.employee_id}|${t.title_ar}`]}
                              onEdit={() => { setEditing(t.id); setAdding(null) }}
                              onToggle={() => call('recurring_task_toggle', { p_id: t.id, p_active: !t.is_active }, t.is_active ? 'اتوقفت' : 'اترجّعت')}
                              onDelete={() => call('recurring_task_delete', { p_id: t.id }, 'اتمسحت')}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                )
              })}
            </div>
          </section>
        ))}

        <AddForEmployee
          employees={emps.filter(e => !tpls.some(t => t.employee_id === e.id))}
          onAdd={async (empId, v) => {
            await call('recurring_task_add', {
              p_supplier_id: supplierId, p_employee_id: empId, p_title_ar: v.title,
              p_frequency: 'weekly', p_description: v.desc || null, p_priority: v.priority,
              p_due_time: v.time || null, p_weekdays: v.days,
              p_anchor_mode: v.anchor, p_offset_minutes: v.anchor === 'clockin' && v.time ? timeToOffset(v.time) : null,
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
      <div className="w-[74px] shrink-0 pt-0.5 text-right">
        {t.anchor_mode === 'clockin' ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#059669] bg-[#34D399]/10 px-1.5 py-0.5 rounded-lg tabular-nums whitespace-nowrap">
            <Anchor className="w-3 h-3" /> {fmtOffset(t.offset_minutes)}
          </span>
        ) : (
          <span className="text-sm font-black text-[#1A2E26] tabular-nums">{hhmm(t.due_time) || '—'}</span>
        )}
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
        <button onClick={onEdit} className="px-2.5 py-1 rounded-lg bg-[#FAFAF7] text-[11px] font-bold text-[#059669]">تعديل</button>
        <button onClick={onToggle} className="px-2.5 py-1 rounded-lg bg-[#FAFAF7] text-[11px] font-bold text-[#6B7280]">
          {t.is_active ? 'وقف' : 'شغّل'}
        </button>
        <button onClick={() => { if (confirmDelete()) onDelete() }} className="p-1.5 rounded-lg hover:bg-red-50 text-[#b3261e]">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function confirmDelete() {
  return typeof window === 'undefined' ? false
    : window.confirm('هتمسح التاسك دي من الجدول خالص. لو عايز توقفها مؤقتًا استخدم «وقف».')
}

type FormVal = { title: string; desc: string; priority: string; time: string; days: number[]; anchor: 'fixed' | 'clockin' }

/* ── فورم التعديل/الإضافة ───────────────────────────────────────────── */
function RowForm({ initial, onSave, onCancel }: {
  initial?: FormVal
  onSave: (v: FormVal) => void | Promise<void>; onCancel: () => void
}) {
  const [v, setV] = useState<FormVal>(initial || { title: '', desc: '', priority: 'medium', time: '09:00', days: WORK_WEEK, anchor: 'clockin' })
  const [saving, setSaving] = useState(false)

  const toggleDay = (d: number) =>
    setV(s => ({ ...s, days: s.days.includes(d) ? s.days.filter(x => x !== d) : [...s.days, d].sort() }))

  return (
    <div className="px-5 py-4 bg-[#FAFAF7]/60 border-y border-gray-100 space-y-3">
      {/* المرساة: من الحضور ولا ميعاد ثابت */}
      <div className="flex items-center gap-1.5">
        {([['clockin', 'من ساعة الحضور'], ['fixed', 'ميعاد ثابت']] as const).map(([val, label]) => (
          <button key={val} type="button" onClick={() => setV(s => ({ ...s, anchor: val }))}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black flex items-center gap-1 ${
              v.anchor === val ? 'bg-[#34D399] text-[#04352A]' : 'bg-white border border-gray-200 text-[#6B7280]'}`}>
            {val === 'clockin' && <Anchor className="w-3 h-3" />}{label}
          </button>
        ))}
        <span className="text-[10px] text-[#9CA3AF] mr-1">
          {v.anchor === 'clockin' ? 'اكتب الميعاد كأنه حضر ٩:٠٠ — هيتزحزح مع حضوره الفعلي' : 'بيحصل في الساعة دي مهما كان معاد حضوره'}
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
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
  const [pick, setPick] = useState('')
  if (employees.length === 0) return null
  return (
    <section className="bg-white rounded-3xl border border-dashed border-gray-200 p-5">
      <h2 className="font-black text-[#1A2E26] text-sm">موظفين لسه من غير جدول</h2>
      <div className="flex gap-2 flex-wrap mt-3">
        {employees.map(e => (
          <button key={e.id} onClick={() => setPick(pick === e.id ? '' : e.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              pick === e.id ? 'bg-[#34D399] text-[#04352A]' : 'bg-[#FAFAF7] text-[#6B7280]'}`}>
            {e.full_name} <span className="opacity-60">· {e.team}</span>
          </button>
        ))}
      </div>
      {pick && (
        <div className="mt-3 -mx-5 -mb-5">
          <RowForm onCancel={() => setPick('')} onSave={async (v) => { await onAdd(pick, v); setPick('') }} />
        </div>
      )}
    </section>
  )
}
