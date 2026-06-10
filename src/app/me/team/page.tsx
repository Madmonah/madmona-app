'use client'

/* Manager console — /me/team
   Visible only to employees whose business_employees.role is admin or branch_manager
   (gated server-side by madmona_mgr_* RPCs via the madmona token).
   Lets a manager: review + fix attendance, and add/edit basic employee data
   (name / phone / branch / role label) + weekly shifts.
   NEVER exposes salaries or PINs. Scope: admin = whole supplier, branch_manager = own branch. */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, ArrowRight, Users, CalendarClock, Search, Plus, Pencil, X,
  MinusCircle, CheckCircle2, CalendarDays, Save,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const token = () => (typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null)
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
  const [tab, setTab] = useState<'attendance' | 'employees'>('attendance')
  const [mgr, setMgr] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])

  const loadEmployees = useCallback(async () => {
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('madmona_mgr_employees', { p_token: token() })
    if (!data?.ok) { setDenied(true); return false }
    setMgr(data.manager); setBranches(data.branches || []); setEmployees(data.employees || [])
    return true
  }, [])

  useEffect(() => {
    const t = token()
    if (!t) { router.push('/login'); return }
    ;(async () => { const ok = await loadEmployees(); setLoading(false); if (!ok) setTimeout(() => router.push('/me'), 1800) })()
  }, [router, loadEmployees])

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>

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
      <header className="bg-[#1F6F5F] text-white">
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {tab === 'attendance'
          ? <AttendanceTab />
          : <EmployeesTab branches={branches} scope={mgr?.scope} employees={employees} reload={loadEmployees} />}
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
    // @ts-expect-error rpc typing
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
          <div className="rounded-xl bg-[#1F6F5F]/8 py-2"><p className="text-[18px] font-black text-[#1F6F5F]">{present}</p><p className="text-[10px] text-[#6B7280]">حضروا</p></div>
          <div className="rounded-xl bg-red-50 py-2"><p className="text-[18px] font-black text-red-600">{absent}</p><p className="text-[10px] text-[#6B7280]">غياب</p></div>
          <div className="rounded-xl bg-[#FAFAF7] py-2"><p className="text-[18px] font-black text-[#6B7280]">{none}</p><p className="text-[10px] text-[#6B7280]">مسجّلش</p></div>
        </div>
      </div>

      {loading ? <div className="py-10 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin mx-auto" /></div> : (
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
    : r.state === 'in' ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1F6F5F]/10 text-[#1F6F5F]">🟢 داخل</span>
    : r.state === 'out' ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A2E26]/8 text-[#1A2E26]">خرج · {Number(r.hours || 0)} س</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">مسجّلش</span>

  async function save(markAbsent: boolean) {
    setBusy(true)
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('madmona_mgr_set_attendance', {
      p_token: token(), p_employee_id: r.employee_id, p_date: date,
      p_clock_in: markAbsent ? null : (cin || null), p_clock_out: markAbsent ? null : (cout || null),
    })
    setBusy(false)
    if (data?.ok) onSaved()
  }

  return (
    <div className={`rounded-2xl border bg-white transition-all ${open ? 'border-[#1F6F5F]' : 'border-gray-100'}`}>
      <button onClick={onOpen} className="w-full p-3.5 flex items-center justify-between text-right">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#1F6F5F]/10 grid place-items-center text-[#1F6F5F] font-black flex-shrink-0">{(r.full_name || '?').slice(0, 1)}</div>
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
            <button onClick={() => save(false)} disabled={busy} className="flex-1 h-10 rounded-xl bg-[#1F6F5F] text-white font-black text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-50">
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
function EmployeesTab({ branches, scope, employees, reload }: any) {
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
        <button onClick={() => setForm({})} className="h-11 px-4 rounded-xl bg-[#1F6F5F] text-white font-black text-[13px] flex items-center gap-1.5"><Plus className="w-4 h-4" /> ضيف</button>
      </div>

      <div className="space-y-2">
        {filtered.map((e: any) => (
          <div key={e.id} className="rounded-2xl border border-gray-100 bg-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#1F6F5F]/10 grid place-items-center text-[#1F6F5F] font-black flex-shrink-0">{(e.full_name || '?').slice(0, 1)}</div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#1A2E26] truncate">{e.full_name}</p>
                <p className="text-[11px] text-[#6B7280] truncate">{e.role_ar || '—'} · {e.branch || 'بدون فرع'}{e.phone ? ` · ${e.phone}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => setShiftFor(e)} className="h-9 px-2.5 rounded-xl bg-[#FAFAF7] text-[#1F6F5F] text-[12px] font-bold flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> الشيفت</button>
              <button onClick={() => setForm(e)} className="h-9 w-9 rounded-xl bg-[#FAFAF7] grid place-items-center text-[#6B7280]"><Pencil className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-[12px] text-[#6B7280] py-8">مفيش موظفين بالبحث ده</p>}
      </div>

      {form && <EmployeeModal employee={form} branches={branches} scope={scope} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload() }} />}
      {shiftFor && <ShiftModal employee={shiftFor} onClose={() => setShiftFor(null)} />}
    </div>
  )
}

function EmployeeModal({ employee, branches, scope, onClose, onSaved }: any) {
  const isNew = !employee.id
  const [name, setName] = useState(employee.full_name || '')
  const [phone, setPhone] = useState(employee.phone || '')
  const [branchId, setBranchId] = useState(employee.branch_id || (branches[0]?.id ?? ''))
  const [roleAr, setRoleAr] = useState(employee.role_ar || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!name.trim()) { setErr('اكتب الاسم'); return }
    setBusy(true); setErr('')
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('madmona_mgr_save_employee', {
      p_token: token(), p_employee_id: employee.id ?? null,
      p_full_name: name, p_phone: phone || null,
      p_branch_id: scope === 'branch' ? null : (branchId || null), p_role_ar: roleAr || null,
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
          {err && <p className="text-[12px] text-red-600 font-bold">{err}</p>}
          {isNew && <p className="text-[11px] text-[#6B7280]">هيتعمل للموظف كود PIN أوتوماتيك للدخول — تقدر تشوفه من لوحة الإدارة.</p>}
          <button onClick={save} disabled={busy} className="w-full h-12 rounded-2xl bg-[#1F6F5F] text-white font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-50">
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
      // @ts-expect-error rpc typing
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
    // @ts-expect-error rpc typing
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
        {loading ? <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin mx-auto" /></div> : (
          <div className="space-y-2">
            {days.map((d) => (
              <div key={d.dow} className={`rounded-2xl border p-3 ${d.off ? 'bg-[#FAFAF7] border-gray-100' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-black text-[#1A2E26]">{DAYS[d.dow]}</span>
                  <button onClick={() => upd(d.dow, { off: !d.off })} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${d.off ? 'bg-red-100 text-red-700' : 'bg-[#1F6F5F]/10 text-[#1F6F5F]'}`}>
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
            <button onClick={save} disabled={busy} className="w-full h-12 rounded-2xl bg-[#1F6F5F] text-white font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 sticky bottom-0">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />} {saved ? 'اتحفظ ✓' : 'حفظ الشيفت'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
