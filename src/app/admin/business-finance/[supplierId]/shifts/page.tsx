'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Calendar, Clock, Save, X, Users, Building2 } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const DAYS = [
  { idx: 6, label: 'السبت' },
  { idx: 0, label: 'الأحد' },
  { idx: 1, label: 'الاثنين' },
  { idx: 2, label: 'الثلاثاء' },
  { idx: 3, label: 'الأربعاء' },
  { idx: 4, label: 'الخميس' },
  { idx: 5, label: 'الجمعة' },
]

export default function ShiftsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEmployee, setEditingEmployee] = useState<any>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: br } = await supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).order('code')
    setBranches(br || [])
    // @ts-expect-error
    let q = supabase.from('business_employees').select('id, full_name, role_ar, branch_id').eq('supplier_id', supplierId).eq('status', 'active')
    if (branchFilter) q = q.eq('branch_id', branchFilter)
    const { data: emp } = await q.order('full_name')
    setEmployees(emp || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, branchFilter])

  if (!supplier) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · SHIFTS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">مواعيد العمل · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">جدول الورديات الأسبوعي لكل موظف</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Branch filter */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Building2 className="w-3.5 h-3.5 text-[#6B7280]" />
            <button onClick={() => setBranchFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!branchFilter ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>كل الفروع</button>
            {branches.map(b => (
              <button key={b.id} onClick={() => setBranchFilter(b.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${branchFilter === b.id ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>{b.name}</button>
            ))}
          </div>
        </section>

        {/* Employees list */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-[#FAFAF7] border-b border-gray-100">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">{employees.length} موظف</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
            ) : employees.length === 0 ? (
              <div className="py-12 text-center"><Users className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm font-bold text-[#1A2E26]">مفيش موظفين</p></div>
            ) : employees.map(e => (
              <button key={e.id} onClick={() => setEditingEmployee(e)} className="w-full text-right px-4 py-3 flex items-center gap-3 hover:bg-[#FAFAF7]/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center font-black">{e.full_name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A2E26]">{e.full_name}</p>
                  <p className="text-[10px] text-[#6B7280]">{e.role_ar} · {branches.find(b => b.id === e.branch_id)?.name || '—'}</p>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-[#FAFAF7] text-[#FA8125] text-xs font-bold flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> الورديات</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {editingEmployee && (
        <ShiftsModal supplierId={supplierId} employee={editingEmployee} onClose={() => setEditingEmployee(null)} />
      )}
    </div>
  )
}

function ShiftsModal({ supplierId, employee, onClose }: any) {
  const [shifts, setShifts] = useState<Record<number, { start: string; end: string; off: boolean }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data } = await supabase.rpc('admin_get_employee_shifts', { p_employee_id: employee.id })
    const map: Record<number, { start: string; end: string; off: boolean }> = {}
    DAYS.forEach(d => { map[d.idx] = { start: '11:00', end: '23:00', off: false } })
    ;(data || []).forEach((s: any) => {
      map[s.day_of_week] = {
        start: (s.start_time || '11:00').slice(0, 5),
        end: (s.end_time || '23:00').slice(0, 5),
        off: s.is_day_off,
      }
    })
    setShifts(map)
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [employee.id])

  function updateDay(idx: number, patch: any) {
    setShifts({ ...shifts, [idx]: { ...shifts[idx], ...patch } })
  }

  async function save() {
    setSaving(true)
    const payload = DAYS.map(d => ({
      day_of_week: d.idx,
      start_time: shifts[d.idx]?.start + ':00',
      end_time: shifts[d.idx]?.end + ':00',
      is_day_off: shifts[d.idx]?.off || false,
    }))
    await rpcSafe(supabase, 'admin_set_employee_shifts', {
      p_supplier_id: supplierId,
      p_employee_id: employee.id,
      p_shifts: payload,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <p className="text-[10px] font-bold tracking-wider uppercase text-[#FA8125]">مواعيد العمل</p>
            <h2 className="text-lg font-black text-[#1A2E26]">{employee.full_name}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-2">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
          ) : (
            <>
              {DAYS.map(d => {
                const shift = shifts[d.idx] || { start: '11:00', end: '23:00', off: false }
                return (
                  <div key={d.idx} className={`rounded-xl border p-3 ${shift.off ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#1A2E26] w-16">{d.label}</span>
                      {shift.off ? (
                        <span className="flex-1 text-center text-xs text-[#6B7280] font-bold">إجازة</span>
                      ) : (
                        <div className="flex-1 flex items-center gap-2 justify-center">
                          <input type="time" value={shift.start} onChange={e => updateDay(d.idx, { start: e.target.value })} className="px-2 py-1 rounded-lg bg-[#FAFAF7] text-xs font-mono" />
                          <span className="text-[#6B7280]">→</span>
                          <input type="time" value={shift.end} onChange={e => updateDay(d.idx, { end: e.target.value })} className="px-2 py-1 rounded-lg bg-[#FAFAF7] text-xs font-mono" />
                        </div>
                      )}
                      <button onClick={() => updateDay(d.idx, { off: !shift.off })} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${shift.off ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#6B7280]'}`}>
                        {shift.off ? 'شغّال' : 'إجازة'}
                      </button>
                    </div>
                  </div>
                )
              })}
              <button onClick={save} disabled={saving} className="w-full mt-3 py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><Save className="w-4 h-4" /> احفظ الجدول</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
