'use client'

import { safeStorage } from '@/lib/safe-storage'

/* Manager console — /me/team
   Visible only to employees whose business_employees.role is admin or branch_manager
   (gated server-side by madmona_mgr_* RPCs via the madmona token).
   Lets a manager: review + fix attendance, and add/edit basic employee data
   (name / phone / branch / role label) + weekly shifts.
   Salaries shown/editable ONLY to managers with the 'salaries' permission; PINs never exposed.
   Scope: admin = whole supplier, branch_manager = own branch. */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, ArrowRight, Users, CalendarClock, Search, Plus, Pencil, X,
  MinusCircle, CheckCircle2, CalendarDays, Save, Wallet, KeyRound,
  Boxes, Package2, Link2, Trash2,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const token = () => (typeof window !== 'undefined' ? safeStorage.get('madmona_token') : null)
const hhmm = (iso: string | null) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false }) } catch { return '' }
}
const todayCairo = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export default function ManagerConsole() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [tab, setTab] = useState<'attendance' | 'employees' | 'bom'>('attendance')
  const [mgr, setMgr] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [bom, setBom] = useState<any>(null)   // { can_edit, services, products }; null = no BOM access

  const loadBom = useCallback(async () => {
    const { data } = await supabase.rpc('madmona_mgr_bom', { p_token: token() })
    setBom(data?.ok ? data : null)
  }, [])

  const loadEmployees = useCallback(async () => {
    const { data } = await supabase.rpc('madmona_mgr_employees', { p_token: token() })
    if (!data?.ok) { setDenied(true); return false }
    setMgr(data.manager); setBranches(data.branches || []); setEmployees(data.employees || [])
    return true
  }, [])

  useEffect(() => {
    const t = token()
    if (!t) { router.push('/login'); return }
    ;(async () => { const ok = await loadEmployees(); if (ok) await loadBom(); setLoading(false); if (!ok) setTimeout(() => router.push('/me'), 1800) })()
  }, [router, loadEmployees, loadBom])

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></div>

  if (denied) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center bg-white rounded-3xl p-8 border border-gray-100 max-w-sm">
        <p className="font-black text-[#1A2E26] mb-1">مالكش صلاحية إدارة</p>
        <p className="text-sm text-[#6B7280]">بنرجّعك للوحة شغلك...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-[#34D399] text-[#04352A]">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70">إدارة الموظفين</p>
            <h1 className="text-xl font-black">{mgr?.name}</h1>
            <p className="text-[11px] text-white/80 mt-0.5">{mgr?.scope === 'all' ? 'كل الفروع' : 'فرعك'} · {employees.length} موظف</p>
          </div>
          <Link href="/me" className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold flex items-center gap-1.5">
            رجوع <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-2">
          <button onClick={() => setTab('attendance')} className={`flex-1 py-3 text-sm font-black border-b-2 transition-all flex items-center justify-center gap-1.5 ${tab === 'attendance' ? 'border-white text-white' : 'border-transparent text-white/60'}`}>
            <CalendarClock className="w-4 h-4" /> الحضور
          </button>
          <button onClick={() => setTab('employees')} className={`flex-1 py-3 text-sm font-black border-b-2 transition-all flex items-center justify-center gap-1.5 ${tab === 'employees' ? 'border-white text-white' : 'border-transparent text-white/60'}`}>
            <Users className="w-4 h-4" /> الموظفين
          </button>
          {bom && (
            <button onClick={() => setTab('bom')} className={`flex-1 py-3 text-sm font-black border-b-2 transition-all flex items-center justify-center gap-1.5 ${tab === 'bom' ? 'border-white text-white' : 'border-transparent text-white/60'}`}>
              <Link2 className="w-4 h-4" /> الخدمات والمنتجات
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {tab === 'attendance' && <AttendanceTab />}
        {tab === 'employees' && <EmployeesTab branches={branches} scope={mgr?.scope} employees={employees} reload={loadEmployees} canViewSalary={mgr?.can_view_salary} canEditSalary={mgr?.can_edit_salary} canViewPin={mgr?.can_view_pin} />}
        {tab === 'bom' && <BomTab bom={bom} reload={loadBom} />}
      </main>
    </div>
  )
}

/* ───────────────────────── ATTENDANCE ───────────────────────── */
function AttendanceTab() {
  const [date, setDate] = useState(todayCairo())
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const { data } = await supabase.rpc('madmona_mgr_attendance', { p_token: token(), p_date: d })
    setRows(data?.rows || []); setLoading(false)
  }, [])
  useEffect(() => { load(date) }, [date, load])

  const present = rows.filter((r) => r.state === 'in' || r.state === 'out').length
  const absent = rows.filter((r) => r.marked_absent).length
  const none = rows.filter((r) => r.state === 'none' && !r.marked_absent).length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="text-[12px] font-bold text-[#6B7280]">اليوم</label>
        <input type="date" value={date} max={todayCairo()} onChange={(e) => setDate(e.target.value)}
          className="w-full mt-1 h-11 rounded-xl border border-gray-200 px-3 text-[14px] font-bold" dir="ltr" />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#34D399]/8 py-2"><p className="text-[18px] font-black text-[#059669]">{present}</p><p className="text-[10px] text-[#6B7280]">حضروا</p></div>
          <div className="rounded-xl bg-red-50 py-2"><p className="text-[18px] font-black text-red-600">{absent}</p><p className="text-[10px] text-[#6B7280]">غياب</p></div>
          <div className="rounded-xl bg-[#FAFAF7] py-2"><p className="text-[18px] font-black text-[#6B7280]">{none}</p><p className="text-[10px] text-[#6B7280]">مسجّلش</p></div>
        </div>
      </div>

      {loading ? <div className="py-10 text-center"><Loader2 className="w-6 h-6 text-[#059669] animate-spin mx-auto" /></div> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <AttendanceRow key={r.employee_id} r={r} date={date}
              open={editing === r.employee_id}
              onOpen={() => setEditing(editing === r.employee_id ? null : r.employee_id)}
              onSaved={() => { setEditing(null); load(date) }} />
          ))}
        </div>
      )}
    </div>
  )
}

function AttendanceRow({ r, date, open, onOpen, onSaved }: any) {
  const [cin, setCin] = useState(hhmm(r.clock_in_at))
  const [cout, setCout] = useState(hhmm(r.clock_out_at))
  const [busy, setBusy] = useState(false)
  useEffect(() => { setCin(hhmm(r.clock_in_at)); setCout(hhmm(r.clock_out_at)) }, [r.clock_in_at, r.clock_out_at, open])

  const chip = r.marked_absent
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">غياب</span>
    : r.state === 'in' ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#34D399]/10 text-[#059669]">🟢 داخل</span>
    : r.state === 'out' ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A2E26]/8 text-[#1A2E26]">خرج · {Number(r.hours || 0)} س</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">مسجّلش</span>

  async function save(markAbsent: boolean) {
    setBusy(true)
    const { data } = await supabase.rpc('madmona_mgr_set_attendance', {
      p_token: token(), p_employee_id: r.employee_id, p_date: date,
      p_clock_in: markAbsent ? null : (cin || null), p_clock_out: markAbsent ? null : (cout || null),
    })
    setBusy(false)
    if (data?.ok) onSaved()
  }

  return (
    <div className={`rounded-2xl border bg-white transition-all ${open ? 'border-[#059669]' : 'border-gray-100'}`}>
      <button onClick={onOpen} className="w-full p-3.5 flex items-center justify-between text-right">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#34D399]/10 grid place-items-center text-[#059669] font-black flex-shrink-0">{(r.full_name || '?').slice(0, 1)}</div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#1A2E26] truncate">{r.full_name}</p>
            <p className="text-[11px] text-[#6B7280] truncate">{r.branch || '—'}{r.clock_in_at ? ` · ${hhmm(r.clock_in_at)}${r.clock_out_at ? '→' + hhmm(r.clock_out_at) : ''}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">{chip}<Pencil className="w-3.5 h-3.5 text-[#6B7280]" /></div>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="text-[11px] text-[#6B7280]">دخول<input type="time" value={cin} onChange={(e) => setCin(e.target.value)} className="w-full mt-1 h-10 rounded-xl border border-gray-200 px-2 text-[14px]" dir="ltr" /></label>
            <label className="text-[11px] text-[#6B7280]">خروج<input type="time" value={cout} onChange={(e) => setCout(e.target.value)} className="w-full mt-1 h-10 rounded-xl border border-gray-200 px-2 text-[14px]" dir="ltr" /></label>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => save(false)} disabled={busy} className="flex-1 h-10 rounded-xl bg-[#34D399] text-[#04352A] font-black text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
            </button>
            <button onClick={() => save(true)} disabled={busy} className="h-10 px-3 rounded-xl bg-red-50 text-red-600 font-black text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-50">
              <MinusCircle className="w-4 h-4" /> غياب
            </button>
          </div>
          <p className="text-[10px] text-[#6B7280] mt-2">سيب الخانتين فاضيين واضغط غياب · أو املا الدخول بس لو لسه شغّال.</p>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── EMPLOYEES ───────────────────────── */
function EmployeesTab({ branches, scope, employees, reload, canViewSalary, canEditSalary, canViewPin }: any) {
  const [q, setQ] = useState('')
  const [form, setForm] = useState<any | null>(null)
  const [shiftFor, setShiftFor] = useState<any | null>(null)

  const filtered = employees.filter((e: any) =>
    !q || (e.full_name || '').includes(q) || (e.phone || '').includes(q) || (e.role_ar || '').includes(q))

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر باسم أو تليفون"
            className="w-full h-11 rounded-xl border border-gray-200 pr-9 pl-3 text-[14px]" />
        </div>
        <button onClick={() => setForm({})} className="h-11 px-4 rounded-xl bg-[#34D399] text-[#04352A] font-black text-[13px] flex items-center gap-1.5"><Plus className="w-4 h-4" /> ضيف</button>
      </div>

      <div className="space-y-2">
        {filtered.map((e: any) => (
          <div key={e.id} className="rounded-2xl border border-gray-100 bg-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#34D399]/10 grid place-items-center text-[#059669] font-black flex-shrink-0">{(e.full_name || '?').slice(0, 1)}</div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#1A2E26] truncate">{e.full_name}</p>
                <p className="text-[11px] text-[#6B7280] truncate">{e.role_ar || '—'} · {e.branch || 'بدون فرع'}{e.phone ? ` · ${e.phone}` : ''}</p>
                {canViewSalary && e.salary != null && <p className="text-[11px] font-bold text-[#059669] truncate flex items-center gap-1"><Wallet className="w-3 h-3" /> {Number(e.salary).toLocaleString('en-US')} ج</p>}
                {canViewPin && e.pin && <p className="text-[11px] font-mono font-bold text-[#1A2E26] truncate flex items-center gap-1"><KeyRound className="w-3 h-3" /> PIN {e.pin}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => setShiftFor(e)} className="h-9 px-2.5 rounded-xl bg-[#FAFAF7] text-[#059669] text-[12px] font-bold flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> الشيفت</button>
              <button onClick={() => setForm(e)} className="h-9 w-9 rounded-xl bg-[#FAFAF7] grid place-items-center text-[#6B7280]"><Pencil className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-[12px] text-[#6B7280] py-8">مفيش موظفين بالبحث ده</p>}
      </div>

      {form && <EmployeeModal employee={form} branches={branches} scope={scope} canViewSalary={canViewSalary} canEditSalary={canEditSalary} canViewPin={canViewPin} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload() }} />}
      {shiftFor && <ShiftModal employee={shiftFor} onClose={() => setShiftFor(null)} />}
    </div>
  )
}

function EmployeeModal({ employee, branches, scope, canViewSalary, canEditSalary, canViewPin, onClose, onSaved }: any) {
  const isNew = !employee.id
  const [name, setName] = useState(employee.full_name || '')
  const [phone, setPhone] = useState(employee.phone || '')
  const [branchId, setBranchId] = useState(employee.branch_id || (branches[0]?.id ?? ''))
  const [roleAr, setRoleAr] = useState(employee.role_ar || '')
  const [salary, setSalary] = useState(employee.salary != null ? String(employee.salary) : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!name.trim()) { setErr('اكتب الاسم'); return }
    setBusy(true); setErr('')
    const { data } = await supabase.rpc('madmona_mgr_save_employee', {
      p_token: token(), p_employee_id: employee.id ?? null,
      p_full_name: name, p_phone: phone || null,
      p_branch_id: scope === 'branch' ? null : (branchId || null), p_role_ar: roleAr || null,
      p_salary_egp: canEditSalary ? (salary.trim() === '' ? null : Number(salary)) : null,
    })
    setBusy(false)
    if (data?.ok) onSaved(); else setErr(data?.error || 'حصل خطأ')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-[#1A2E26]">{isNew ? 'موظف جديد' : 'تعديل الموظف'}</h3>
          <button onClick={onClose} className="text-[#6B7280]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <label className="block text-[12px] font-bold text-[#6B7280]">الاسم<input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 h-11 rounded-xl border border-gray-200 px-3 text-[14px]" /></label>
          <label className="block text-[12px] font-bold text-[#6B7280]">التليفون<input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full mt-1 h-11 rounded-xl border border-gray-200 px-3 text-[14px]" dir="ltr" /></label>
          <label className="block text-[12px] font-bold text-[#6B7280]">المسمى الوظيفي<input value={roleAr} onChange={(e) => setRoleAr(e.target.value)} placeholder="مثلاً: مصفف شعر" className="w-full mt-1 h-11 rounded-xl border border-gray-200 px-3 text-[14px]" /></label>
          {scope !== 'branch' && (
            <label className="block text-[12px] font-bold text-[#6B7280]">الفرع
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full mt-1 h-11 rounded-xl border border-gray-200 px-3 text-[14px] bg-white">
                <option value="">— بدون فرع —</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}
          {canViewSalary && (
            <label className="block text-[12px] font-bold text-[#6B7280]">المرتب الشهري (جنيه)
              <input type="number" inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value)}
                disabled={!canEditSalary} placeholder="0"
                className="w-full mt-1 h-11 rounded-xl border border-gray-200 px-3 text-[14px] disabled:bg-[#FAFAF7] disabled:text-[#6B7280]" dir="ltr" />
              {!canEditSalary && <span className="text-[10px] text-[#6B7280]">للعرض بس</span>}
            </label>
          )}
          {canViewPin && !isNew && employee.pin && (
            <label className="block text-[12px] font-bold text-[#6B7280]">كود الدخول (PIN)
              <input value={employee.pin} readOnly
                className="w-full mt-1 h-11 rounded-xl border border-gray-200 px-3 text-[14px] font-mono bg-[#FAFAF7] text-[#1A2E26]" dir="ltr" />
            </label>
          )}
          {err && <p className="text-[12px] text-red-600 font-bold">{err}</p>}
          {isNew && <p className="text-[11px] text-[#6B7280]">هيتعمل للموظف كود PIN أوتوماتيك للدخول{canViewPin ? ' — هيظهر في القايمة بعد الحفظ.' : ' — تقدر تشوفه من لوحة الإدارة.'}</p>}
          <button onClick={save} disabled={busy} className="w-full h-12 rounded-2xl bg-[#34D399] text-[#04352A] font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {isNew ? 'ضيف الموظف' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ShiftModal({ employee, onClose }: any) {
  const [days, setDays] = useState<any[]>(() => DAYS.map((_, dow) => ({ dow, off: false, start: '', end: '' })))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('madmona_mgr_get_shifts', { p_token: token(), p_employee_id: employee.id })
      const map: Record<number, any> = {}
      ;(data?.shifts || []).forEach((s: any) => { map[s.dow] = s })
      setDays(DAYS.map((_, dow) => map[dow]
        ? { dow, off: !!map[dow].off, start: map[dow].off ? '' : (map[dow].start || ''), end: map[dow].off ? '' : (map[dow].end || '') }
        : { dow, off: false, start: '', end: '' }))
      setLoading(false)
    })()
  }, [employee.id])

  function upd(dow: number, patch: any) { setDays((ds) => ds.map((d) => d.dow === dow ? { ...d, ...patch } : d)); setSaved(false) }

  async function save() {
    setBusy(true)
    const payload = days
      .filter((d) => d.off || (d.start && d.end))
      .map((d) => ({ dow: d.dow, off: d.off, start: d.start, end: d.end }))
    const { data } = await supabase.rpc('madmona_mgr_set_shifts', { p_token: token(), p_employee_id: employee.id, p_shifts: payload })
    setBusy(false); if (data?.ok) setSaved(true)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="text-lg font-black text-[#1A2E26]">شيفت {employee.full_name}</h3><p className="text-[11px] text-[#6B7280]">المواعيد الأسبوعية</p></div>
          <button onClick={onClose} className="text-[#6B7280]"><X className="w-5 h-5" /></button>
        </div>
        {loading ? <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-[#059669] animate-spin mx-auto" /></div> : (
          <div className="space-y-2">
            {days.map((d) => (
              <div key={d.dow} className={`rounded-2xl border p-3 ${d.off ? 'bg-[#FAFAF7] border-gray-100' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-black text-[#1A2E26]">{DAYS[d.dow]}</span>
                  <button onClick={() => upd(d.dow, { off: !d.off })} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${d.off ? 'bg-red-100 text-red-700' : 'bg-[#34D399]/10 text-[#059669]'}`}>
                    {d.off ? 'إجازة' : 'شغل'}
                  </button>
                </div>
                {!d.off && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <label className="text-[10px] text-[#6B7280]">من<input type="time" value={d.start} onChange={(e) => upd(d.dow, { start: e.target.value })} className="w-full mt-1 h-9 rounded-lg border border-gray-200 px-2 text-[13px]" dir="ltr" /></label>
                    <label className="text-[10px] text-[#6B7280]">لـ<input type="time" value={d.end} onChange={(e) => upd(d.dow, { end: e.target.value })} className="w-full mt-1 h-9 rounded-lg border border-gray-200 px-2 text-[13px]" dir="ltr" /></label>
                  </div>
                )}
              </div>
            ))}
            <button onClick={save} disabled={busy} className="w-full h-12 rounded-2xl bg-[#34D399] text-[#04352A] font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 sticky bottom-0">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />} {saved ? 'اتحفظ ✓' : 'حفظ الشيفت'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ────────── SERVICES <-> PRODUCTS (BOM) ────────── */
function BomTab({ bom, reload }: any) {
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [addFor, setAddFor] = useState<any | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const services = (bom?.services || []) as any[]
  const products = (bom?.products || []) as any[]
  const canEdit = !!bom?.can_edit
  const filtered = services.filter((s) => !q || (s.name_ar || '').includes(q))

  async function unlink(serviceId: string, productId: string) {
    setBusyKey(serviceId + productId)
    const { data } = await supabase.rpc('madmona_mgr_unlink_product', { p_token: token(), p_service_id: serviceId, p_product_id: productId })
    setBusyKey(null)
    if (data?.ok) reload()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[13px] font-bold text-[#1A2E26]">ربط الخدمات بالمنتجات</p>
        <p className="text-[11px] text-[#6B7280] mt-0.5">حدّد كل خدمة بتستهلك أنهي منتجات وبكميات قد إيه — عشان المخزون ينخصم أوتوماتيك مع كل حجز.</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر على خدمة"
          className="w-full h-11 rounded-xl border border-gray-200 pr-9 pl-3 text-[14px]" />
      </div>

      <div className="space-y-2">
        {filtered.map((s) => {
          const linked = (s.products || []) as any[]
          const open = openId === s.id
          return (
            <div key={s.id} className={`rounded-2xl border bg-white transition-all ${open ? 'border-[#059669]' : 'border-gray-100'}`}>
              <button onClick={() => setOpenId(open ? null : s.id)} className="w-full p-3.5 flex items-center justify-between text-right">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#34D399]/10 grid place-items-center text-[#059669] flex-shrink-0"><Boxes className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#1A2E26] truncate">{s.name_ar}</p>
                    <p className="text-[11px] text-[#6B7280] truncate">{linked.length ? `${linked.length} منتج مربوط` : 'مفيش منتجات مربوطة'}{s.price_egp != null ? ` · ${Number(s.price_egp).toLocaleString('en-US')} ج` : ''}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FAFAF7] text-[#6B7280] flex-shrink-0">{linked.length}</span>
              </button>

              {open && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-100 space-y-2">
                  {linked.length === 0 && <p className="text-[12px] text-[#6B7280] py-2">لسه مفيش منتجات مربوطة. اضغط «أضف منتج».</p>}
                  {linked.map((p) => (
                    <div key={p.product_id} className="flex items-center justify-between gap-2 rounded-xl bg-[#FAFAF7] px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[#1A2E26] truncate flex items-center gap-1"><Package2 className="w-3 h-3 text-[#6B7280]" /> {p.name_ar}
                          {p.is_optional && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">اختياري</span>}
                        </p>
                        <p className="text-[11px] text-[#6B7280]">{Number(p.quantity)} {p.unit || ''}</p>
                      </div>
                      {canEdit && (
                        <button onClick={() => unlink(s.id, p.product_id)} disabled={busyKey === s.id + p.product_id}
                          className="h-8 w-8 rounded-lg bg-white grid place-items-center text-red-500 disabled:opacity-50 flex-shrink-0">
                          {busyKey === s.id + p.product_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  ))}
                  {canEdit && (
                    <button onClick={() => setAddFor(s)} className="w-full h-10 rounded-xl bg-[#34D399]/8 text-[#059669] font-black text-[13px] flex items-center justify-center gap-1.5">
                      <Plus className="w-4 h-4" /> أضف منتج
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="text-center text-[12px] text-[#6B7280] py-8">مفيش خدمات بالبحث ده</p>}
      </div>

      {addFor && <AddProductModal service={addFor} products={products} onClose={() => setAddFor(null)} onSaved={() => { setAddFor(null); reload() }} />}
    </div>
  )
}

function AddProductModal({ service, products, onClose, onSaved }: any) {
  const [q, setQ] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('1')
  const [optional, setOptional] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const linkedIds = new Set((service.products || []).map((p: any) => p.product_id))
  const filtered = (products as any[]).filter((p) => !linkedIds.has(p.id) && (!q || (p.name_ar || '').includes(q)))

  async function save() {
    if (!productId) { setErr('اختار منتج الأول'); return }
    const n = Number(qty)
    if (!n || n <= 0) { setErr('اكتب كمية صح'); return }
    setBusy(true); setErr('')
    const { data } = await supabase.rpc('madmona_mgr_link_product', {
      p_token: token(), p_service_id: service.id, p_product_id: productId, p_quantity: n, p_is_optional: optional,
    })
    setBusy(false)
    if (data?.ok) onSaved(); else setErr(data?.error || 'حصل خطأ')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="text-lg font-black text-[#1A2E26]">أضف منتج</h3><p className="text-[11px] text-[#6B7280]">للخدمة: {service.name_ar}</p></div>
          <button onClick={onClose} className="text-[#6B7280]"><X className="w-5 h-5" /></button>
        </div>

        <div className="relative mb-2">
          <Search className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر على منتج"
            className="w-full h-11 rounded-xl border border-gray-200 pr-9 pl-3 text-[14px]" />
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
          {filtered.slice(0, 80).map((p) => (
            <button key={p.id} onClick={() => setProductId(p.id)}
              className={`w-full text-right px-3 py-2 rounded-xl border text-[13px] font-bold flex items-center justify-between ${productId === p.id ? 'border-[#059669] bg-[#34D399]/5 text-[#059669]' : 'border-gray-200 text-[#1A2E26]'}`}>
              <span className="truncate">{p.name_ar}</span>
              <span className="text-[10px] text-[#6B7280] flex-shrink-0">{p.unit || ''}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-[12px] text-[#6B7280] py-4">مفيش منتجات متاحة</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-[#6B7280]">الكمية المستهلكة
            <input type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)}
              className="w-full mt-1 h-11 rounded-xl border border-gray-200 px-3 text-[14px]" dir="ltr" />
          </label>
          <button onClick={() => setOptional(!optional)} type="button"
            className={`mt-5 h-11 rounded-xl font-bold text-[12px] ${optional ? 'bg-amber-100 text-amber-700' : 'bg-[#FAFAF7] text-[#6B7280]'}`}>
            {optional ? 'اختياري ✓' : 'اختياري؟'}
          </button>
        </div>

        {err && <p className="text-[12px] text-red-600 font-bold mt-2">{err}</p>}
        <button onClick={save} disabled={busy || !productId} className="w-full h-12 mt-3 rounded-2xl bg-[#34D399] text-[#04352A] font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} اربط المنتج
        </button>
      </div>
    </div>
  )
}
