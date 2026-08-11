'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Briefcase, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, MapPin } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')
const fdate = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }) : '—'

const STATUSES = [
  { value: 'pending',   label: 'منتظرة', color: 'bg-amber-50 text-amber-700' },
  { value: 'active',    label: 'جارية',  color: 'bg-[#2B4521]/10 text-[#2B4521]' },
  { value: 'done',      label: 'خلصت',   color: 'bg-blue-50 text-blue-700' },
  { value: 'cancelled', label: 'ملغية',  color: 'bg-gray-100 text-gray-600' },
]
const sm = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]
const emptyForm = { person_name: '', project_id: '', task: '', location: '', start_date: '', end_date: '', allowance_amount: '', status: 'pending', notes: '' }

export default function AssignmentsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [projects, setProjects] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: list } = await supabase.from('bz_projects').select('id, name').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setProjects(list || [])
    // @ts-expect-error
    const { data } = await supabase.from('bz_assignments').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  const projName = (id: string | null) => id ? (projects.find((p) => p.id === id)?.name || '—') : 'عام'
  const activeCount = rows.filter((r) => r.status === 'active').length
  const allowanceTotal = rows.reduce((s, r) => s + num(r.allowance_amount), 0)

  async function save() {
    if (!form.person_name.trim()) { alert('اكتب اسم الشخص'); return }
    setSaving(true)
    // @ts-expect-error
    await supabase.from('bz_assignments').insert({
      supplier_id: supplierId, project_id: form.project_id || null, person_name: form.person_name.trim(),
      task: form.task.trim() || null, location: form.location.trim() || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
      allowance_amount: num(form.allowance_amount), status: form.status, notes: form.notes.trim() || null,
    })
    setSaving(false); setShowForm(false); setForm({ ...emptyForm }); load()
  }
  async function setStatus(r: any, status: string) {
    // @ts-expect-error
    await supabase.from('bz_assignments').update({ status }).eq('id', r.id)
    load()
  }
  async function remove(r: any) {
    if (!confirm('حذف المأمورية؟')) return
    // @ts-expect-error
    await supabase.from('bz_assignments').delete().eq('id', r.id)
    load()
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#2B4521] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#2B4521] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-1">مقاولات · المأموريات</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><Briefcase className="w-7 h-7 text-[#2B4521]" /> المأموريات</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={() => { setForm({ ...emptyForm }); setShowForm(true) }} className="px-4 py-2 rounded-xl bg-[#2B4521] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> مأمورية</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="مأموريات جارية" value={String(activeCount)} />
          <Stat label="إجمالي البدلات" value={`${money0(allowanceTotal)} ج`} primary />
          <Stat label="إجمالي المأموريات" value={String(rows.length)} />
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><Briefcase className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش مأموريات مسجّلة</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>الاسم</Th><Th>المهمة</Th><Th>المشروع</Th><Th>المكان</Th><Th>من / إلى</Th><Th className="text-left">البدل</Th><Th>الحالة</Th><Th></Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                    <td className="px-3 py-2.5 font-bold text-[#1A2E26]">{r.person_name}</td>
                    <td className="px-3 py-2.5 text-[#1A2E26] max-w-xs">{r.task || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280]">{projName(r.project_id)}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280]">{r.location ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.location}</span> : '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono whitespace-nowrap">{fdate(r.start_date)} · {fdate(r.end_date)}</td>
                    <td className="px-3 py-2.5 text-left font-mono font-black text-[#2B4521]">{r.allowance_amount > 0 ? `${money0(r.allowance_amount)} ج` : '—'}</td>
                    <td className="px-3 py-2.5"><select value={r.status} onChange={(e) => setStatus(r, e.target.value)} className={`text-[10px] font-bold rounded-md px-2 py-1 border-0 ${sm(r.status).color}`}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                    <td className="px-3 py-2.5"><button onClick={() => remove(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <Modal title="مأمورية جديدة" onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel="إضافة">
          <div className="grid grid-cols-2 gap-3">
            <Field label="الاسم *"><input value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} className={inputCls} /></Field>
            <Field label="المشروع"><select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className={inputCls}><option value="">عام (بدون مشروع)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          </div>
          <Field label="المهمة"><input value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} className={inputCls} placeholder="استلام مواد / متابعة موقع..." /></Field>
          <Field label="المكان"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="من"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} /></Field>
            <Field label="إلى"><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="بدل المأمورية (ج)"><input type="number" value={form.allowance_amount} onChange={(e) => setForm({ ...form, allowance_amount: e.target.value })} className={inputCls} /></Field>
            <Field label="الحالة"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          </div>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} /></Field>
        </Modal>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#2B4521] bg-white'
function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>{children}</div> }
function Th({ children, className = '' }: { children?: ReactNode; className?: string }) { return <th className={`px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase text-[#6B7280] ${className}`}>{children}</th> }
function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#2B4521] border-[#2B4521] text-white' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-xl md:text-2xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p></div>
}
function Modal({ title, children, onClose, onSave, saving, saveLabel }: { title: string; children: ReactNode; onClose: () => void; onSave: () => void; saving: boolean; saveLabel: string }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between"><h2 className="text-lg font-black text-[#1A2E26]">{title}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-[#6B7280]" /></button></div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2">
          <button onClick={onSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#2B4521] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {saveLabel}</button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  )
}
