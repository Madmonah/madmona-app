'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { safeStorage } from '@/lib/safe-storage'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'
import {
  ChevronLeft, Loader2, RefreshCw, Calculator, Play, CheckCircle2,
  DollarSign, Plus, X, Wallet, Calendar as CalendarIcon, Lock,
  Pencil, Check, Search, History,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

export default function PayrollPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [runs, setRuns] = useState<any[]>([])
  const [selectedRun, setSelectedRun] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showStart, setShowStart] = useState(false)
  const [showAdvance, setShowAdvance] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: rs } = await supabase.rpc('admin_list_payroll_runs', { p_supplier_id: supplierId })
    setRuns(rs?.runs || [])
    // @ts-expect-error
    const { data: emp } = await supabase.from('business_employees').select('id, full_name, role_ar, salary_egp').eq('supplier_id', supplierId).eq('status', 'active').order('salary_egp', { ascending: false })
    setEmployees(emp || [])
    setLoading(false)
  }

  async function loadRun(runId: string) {
    // @ts-expect-error
    const { data } = await supabase.rpc('admin_get_payroll_run', { p_run_id: runId })
    setSelectedRun(data)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  if (!supplier) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#2B4521] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-1">B2B PARTNER · PAYROLL</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">المرتبات · {supplier?.business_name}</h1>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowAdvance(true)} className="px-4 py-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26] text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4" /> تسجيل سلفة
              </button>
              <button onClick={() => setShowStart(true)} className="px-4 py-2 rounded-xl bg-[#2B4521] text-white text-sm font-bold flex items-center gap-2">
                <Play className="w-4 h-4" /> Run شهر جديد
              </button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Base salaries management */}
        <SalariesSection supplierId={supplierId} employees={employees} loading={loading} onChanged={load} />

        {/* Runs list */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-[#FAFAF7] border-b border-gray-100">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">جلسات المرتبات</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#2B4521] animate-spin inline" /></div>
            ) : runs.length === 0 ? (
              <div className="py-12 text-center">
                <Calculator className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">لسه ما عملتش Run مرتبات</p>
                <button onClick={() => setShowStart(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#2B4521] text-white text-sm font-bold">ابدأ أول Run</button>
              </div>
            ) : runs.map((r: any) => (
              <button key={r.id} onClick={() => loadRun(r.id)} className="w-full text-right grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-[#FAFAF7] transition-colors text-sm">
                <div className="col-span-3 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#2B4521]" />
                  <p className="font-bold text-[#1A2E26]">{MONTHS_AR[r.month - 1]} {r.year}</p>
                </div>
                <div className="col-span-2"><StatusBadge status={r.status} /></div>
                <div className="col-span-2 text-center">
                  <p className="text-[10px] text-[#6B7280]">المرتبات</p>
                  <p className="font-mono font-bold">{Number(r.total_base || 0).toLocaleString()}</p>
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-[10px] text-[#6B7280]">العمولات</p>
                  <p className="font-mono font-bold text-[#2B4521]">+{Number(r.total_commissions || 0).toLocaleString()}</p>
                </div>
                <div className="col-span-3 text-center">
                  <p className="text-[10px] text-[#6B7280]">الصافي</p>
                  <p className="font-black font-mono text-lg text-[#1A2E26]">{Number(r.total_net || 0).toLocaleString()} ج</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Selected run detail */}
        {selectedRun && (
          <PayrollRunDetail run={selectedRun} onClose={() => setSelectedRun(null)} onChanged={() => { load(); setSelectedRun(null) }} />
        )}
      </main>

      {showStart && (
        <StartRunModal supplierId={supplierId} onClose={() => setShowStart(false)} onSaved={() => { setShowStart(false); load() }} />
      )}
      {showAdvance && (
        <AddAdvanceModal supplierId={supplierId} employees={employees} onClose={() => setShowAdvance(false)} onSaved={() => setShowAdvance(false)} />
      )}
    </div>
  )
}

function SalariesSection({ supplierId, employees, loading, onChanged }: any) {
  const [editId, setEditId] = useState<string | null>(null)
  const [val, setVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [q, setQ] = useState('')
  const [showHist, setShowHist] = useState(false)

  const filtered = (employees || []).filter((e: any) =>
    !q.trim() || (e.full_name || '').toLowerCase().includes(q.trim().toLowerCase()))
  const totalBase = (employees || []).reduce((s: number, e: any) => s + Number(e.salary_egp || 0), 0)

  function startEdit(e: any) { setEditId(e.id); setVal(String(e.salary_egp || 0)); setMsg(null) }

  async function save(empId: string) {
    const token = typeof window !== 'undefined' ? safeStorage.get('madmona_token') : null
    if (!token) { setMsg({ text: 'سجّل دخول الأول', ok: false }); return }
    const newSalary = parseFloat(val)
    if (isNaN(newSalary) || newSalary < 0) { setMsg({ text: 'مبلغ غير صالح', ok: false }); return }
    setSaving(true)
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('admin_set_employee_salary', {
      p_token: token, p_employee_id: empId, p_new_salary: newSalary,
    })
    if (data?.ok) {
      setMsg({ text: `✓ اتعدّل من ${Number(data.old_salary || 0).toLocaleString()} لـ ${Number(data.new_salary).toLocaleString()} ج`, ok: true })
      setEditId(null)
      onChanged()
    } else {
      setMsg({ text: data?.error || 'خطأ في التعديل', ok: false })
    }
    setSaving(false)
    setTimeout(() => setMsg(null), 3500)
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-[#FAFAF7] border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#2B4521]" />
          <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">المرتبات الأساسية</h3>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHist(true)} className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-[#1A2E26] text-xs font-bold flex items-center gap-1.5 hover:border-[#2B4521] transition-colors">
            <History className="w-3.5 h-3.5 text-[#2B4521]" /> سجل التغييرات
          </button>
          <div className="text-left">
            <p className="text-[10px] text-[#6B7280]">إجمالي شهري</p>
            <p className="font-black font-mono text-[#1A2E26]">{totalBase.toLocaleString()} ج</p>
          </div>
        </div>
      </div>

      {showHist && <SalaryHistoryModal supplierId={supplierId} onClose={() => setShowHist(false)} />}

      {msg && (
        <div className={`px-4 py-2 text-xs font-bold ${msg.ok ? 'bg-[#2B4521]/10 text-[#2B4521]' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      <div className="px-4 py-2.5 border-b border-gray-100">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="دوّر على موظف بالاسم..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#2B4521] animate-spin inline" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#6B7280]">مفيش موظفين</div>
        ) : filtered.map((e: any) => (
          <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1A2E26] truncate">{e.full_name}</p>
              <p className="text-[10px] text-[#6B7280]">{e.role_ar || '—'}</p>
            </div>
            {editId === e.id ? (
              <div className="flex items-center gap-2">
                <input type="number" value={val} onChange={ev => setVal(ev.target.value)} autoFocus
                  onKeyDown={ev => { if (ev.key === 'Enter') save(e.id); if (ev.key === 'Escape') setEditId(null) }}
                  className="w-28 px-3 py-1.5 rounded-lg bg-[#FAFAF7] text-sm font-mono text-left border border-[#2B4521]" />
                <button onClick={() => save(e.id)} disabled={saving}
                  className="p-1.5 rounded-lg bg-[#2B4521] text-white disabled:opacity-50" title="حفظ">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg bg-[#FAFAF7] text-[#6B7280]" title="إلغاء">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-black font-mono text-[#1A2E26] text-sm">{Number(e.salary_egp || 0).toLocaleString()} ج</span>
                <button onClick={() => startEdit(e)}
                  className="p-1.5 rounded-lg bg-[#FAFAF7] hover:bg-[#2B4521]/10 text-[#2B4521] transition-colors" title="تعديل المرتب">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 bg-[#FAFAF7] border-t border-gray-100">
        <p className="text-[10px] text-[#6B7280]">💡 أي تعديل بيتسجّل في سجل التغييرات (مين غيّر وامتى). التعديل متاح للمالك والإدارة بس.</p>
      </div>
    </section>
  )
}

function SalaryHistoryModal({ supplierId, onClose }: any) {
  const [hist, setHist] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const token = typeof window !== 'undefined' ? safeStorage.get('madmona_token') : null
      if (!token) { setLoading(false); return }
      // @ts-expect-error rpc typing
      const { data } = await supabase.rpc('admin_list_salary_history', { p_token: token, p_supplier_id: supplierId })
      setHist(data?.ok ? data.history : [])
      setLoading(false)
    })()
  }, [supplierId])

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl md:mx-4 max-h-[85vh] flex flex-col shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26] flex items-center gap-2">
            <History className="w-5 h-5 text-[#2B4521]" /> سجل تغييرات المرتبات
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#2B4521] animate-spin inline" /></div>
          ) : hist.length === 0 ? (
            <div className="py-12 text-center">
              <History className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش تغييرات لسه</p>
              <p className="text-xs text-[#6B7280] mt-1">أي تعديل للمرتبات هيظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hist.map((h: any, i: number) => {
                const up = Number(h.new_salary) >= Number(h.old_salary || 0)
                return (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1A2E26]">{h.employee}</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {h.changed_by} ({h.changed_by_role === 'platform_admin' ? 'أدمن مضمونة' : 'الإدارة'}) · {new Date(h.changed_at).toLocaleString('ar-EG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="text-[#6B7280] line-through">{Number(h.old_salary || 0).toLocaleString()}</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-[#6B7280]" />
                      <span className={`font-black ${up ? 'text-[#2B4521]' : 'text-red-600'}`}>{Number(h.new_salary).toLocaleString()} ج</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PayrollRunDetail({ run, onClose, onChanged }: any) {
  const [closing, setClosing] = useState(false)
  const r = run.run
  const items = run.items || []

  async function closeRun() {
    if (!confirm('متأكد عاوز تقفل الـ Run؟ هـ يعلم كل السلف والعمولات على إنها اتسددت.')) return
    setClosing(true)
    await rpcSafe(supabase, 'admin_close_payroll_run', { p_run_id: r.id })
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-5xl md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black text-[#1A2E26]">مرتبات {MONTHS_AR[r.month - 1]} {r.year}</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">{items.length} موظف · صافي {Number(r.total_net || 0).toLocaleString()} ج</p>
          </div>
          <div className="flex gap-2">
            {r.status !== 'paid' && (
              <button onClick={closeRun} disabled={closing} className="px-4 py-2 rounded-xl bg-[#2B4521] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                <Lock className="w-4 h-4" /> {closing ? 'جاري الإقفال...' : 'اقفل + ادفع'}
              </button>
            )}
            <button onClick={onClose} className="p-2"><X className="w-5 h-5 text-[#6B7280]" /></button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            <Mini label="المرتبات" value={r.total_base} />
            <Mini label="السلف" value={r.total_advances} negative />
            <Mini label="الخصومات" value={r.total_deductions} negative />
            <Mini label="العمولات" value={r.total_commissions} positive />
            <Mini label="الصافي" value={r.total_net} primary />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAF7]">
                  <tr className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">
                    <th className="text-right px-3 py-2">الموظف</th>
                    <th className="text-center px-3 py-2">الأساسي</th>
                    <th className="text-center px-3 py-2">سلف</th>
                    <th className="text-center px-3 py-2">عمولات</th>
                    <th className="text-center px-3 py-2">bonus</th>
                    <th className="text-center px-3 py-2">الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it: any) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2">
                        <p className="font-bold text-[#1A2E26]">{it.employee_name}</p>
                        <p className="text-[10px] text-[#6B7280]">{it.role_ar} · {it.branch_name || '—'}</p>
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{Number(it.base_salary).toLocaleString()}</td>
                      <td className="px-3 py-2 text-center font-mono text-red-600">{it.advances > 0 ? `-${Number(it.advances).toLocaleString()}` : '—'}</td>
                      <td className="px-3 py-2 text-center font-mono text-[#2B4521]">{it.commissions > 0 ? `+${Number(it.commissions).toLocaleString()}` : '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{it.bonuses > 0 ? `+${Number(it.bonuses).toLocaleString()}` : '—'}</td>
                      <td className="px-3 py-2 text-center font-black font-mono text-[#1A2E26]">{Number(it.net_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StartRunModal({ supplierId, onClose, onSaved }: any) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [saving, setSaving] = useState(false)

  async function start() {
    setSaving(true)
    // @ts-expect-error
    const { data, error } = await supabase.rpc('admin_start_payroll_run', { p_supplier_id: supplierId, p_month: month, p_year: year })
    if (error) alert(error.message)
    else if (data?.success) onSaved()
    setSaving(false)
  }

  return (
    <Modal onClose={onClose} title="ابدأ Run مرتبات">
      <Field label="الشهر">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
          {MONTHS_AR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </Field>
      <Field label="السنة">
        <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
      </Field>
      <div className="bg-[#2B4521]/5 border border-[#2B4521]/20 rounded-xl p-3 text-xs text-[#1A2E26]">
        <p className="font-bold mb-1">⚙️ هـ يحصل إيه:</p>
        <ul className="space-y-0.5 list-disc mr-4 text-[#6B7280]">
          <li>هـ يضيف كل الموظفين النشيطين</li>
          <li>هـ يخصم السلف المعلقة</li>
          <li>هـ يضيف العمولات الغير مدفوعة</li>
          <li>هـ يحسب الصافي تلقائي</li>
        </ul>
      </div>
      <button onClick={start} disabled={saving} className="w-full py-3 rounded-xl bg-[#2B4521] text-white font-black text-sm disabled:opacity-50">
        {saving ? 'جاري الحساب...' : 'ابدأ Run'}
      </button>
    </Modal>
  )
}

function AddAdvanceModal({ supplierId, employees, onClose, onSaved }: any) {
  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!employeeId || !amount) return alert('اكمل البيانات')
    setSaving(true)
    await rpcSafe(supabase, 'admin_record_advance', {
      p_supplier_id: supplierId,
      p_employee_id: employeeId,
      p_amount: parseFloat(amount),
      p_notes: notes || null,
    })
    alert('السلفة اتسجلت')
    onSaved()
  }

  return (
    <Modal onClose={onClose} title="تسجيل سلفة موظف">
      <Field label="الموظف">
        <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
          <option value="">اختار موظف...</option>
          {employees.map((e: any) => <option key={e.id} value={e.id}>{e.full_name} ({e.role_ar})</option>)}
        </select>
      </Field>
      <Field label="المبلغ (ج)">
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
      </Field>
      <Field label="ملاحظات (اختياري)">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
      </Field>
      <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#2B4521] text-white font-black text-sm disabled:opacity-50">
        {saving ? 'جاري الحفظ...' : 'سجل السلفة'}
      </button>
    </Modal>
  )
}

function Modal({ onClose, title, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) {
  return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div>
}

function Mini({ label, value, positive, negative, primary }: any) {
  const cls = primary ? 'bg-[#2B4521] text-white' : 'bg-white'
  const textCls = primary ? 'text-white' : positive ? 'text-[#2B4521]' : negative ? 'text-red-600' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-xl border border-gray-100 p-3 ${cls}`}>
      <p className={`text-[10px] font-bold uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p>
      <p className={`text-lg font-black font-mono ${textCls}`}>{Number(value || 0).toLocaleString()}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'مسودة', cls: 'bg-gray-100 text-gray-700' },
    calculating: { label: 'جاري الحساب', cls: 'bg-amber-50 text-amber-700' },
    ready: { label: 'جاهز', cls: 'bg-[#2B4521]/10 text-[#2B4521]' },
    paid: { label: 'مدفوع ✓', cls: 'bg-[#2B4521] text-white' },
    cancelled: { label: 'ملغي', cls: 'bg-red-50 text-red-600' },
  }
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700' }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.cls}`}>{s.label}</span>
}

function Loader() {
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#2B4521] animate-spin" /></div>
}
