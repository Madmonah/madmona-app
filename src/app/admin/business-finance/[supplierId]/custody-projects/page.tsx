'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Coins, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, Pencil } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')

const TYPES = [
  { value: 'cash',      label: 'نقدية' },
  { value: 'items',     label: 'أصناف' },
  { value: 'equipment', label: 'معدة' },
]
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label || t
const STATUSES = [
  { value: 'open',    label: 'مفتوحة', color: 'bg-amber-50 text-amber-700' },
  { value: 'settled', label: 'مُسوّاة', color: 'bg-[#34D399]/10 text-[#059669]' },
]
const sm = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]
const emptyForm = { id: null as string | null, holder_name: '', project_id: '', custody_type: 'cash', description: '', amount: '', settled_amount: '', issue_date: '', status: 'open', notes: '' }

export default function CustodyProjectsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [projects, setProjects] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  async function load() {
    setLoading(true)
    const { data: list } = await supabase.from('bz_projects').select('id, name').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setProjects(list || [])
    const { data } = await supabase.from('bz_custody').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  const projName = (id: string | null) => id ? (projects.find((p) => p.id === id)?.name || '—') : 'عام'
  const openOutstanding = rows.filter((r) => r.status === 'open').reduce((s, r) => s + (num(r.amount) - num(r.settled_amount)), 0)
  const openCount = rows.filter((r) => r.status === 'open').length

  function openAdd() { setForm({ ...emptyForm }); setShowForm(true) }
  function openEdit(r: any) { setForm({ id: r.id, holder_name: r.holder_name || '', project_id: r.project_id || '', custody_type: r.custody_type || 'cash', description: r.description || '', amount: String(r.amount ?? ''), settled_amount: String(r.settled_amount ?? ''), issue_date: r.issue_date || '', status: r.status || 'open', notes: r.notes || '' }); setShowForm(true) }

  async function save() {
    if (!form.holder_name.trim()) { alert('اكتب اسم صاحب العهدة'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId, project_id: form.project_id || null, holder_name: form.holder_name.trim(),
      custody_type: form.custody_type, description: form.description.trim() || null,
      amount: num(form.amount), settled_amount: num(form.settled_amount),
      issue_date: form.issue_date || null, status: form.status, notes: form.notes.trim() || null,
    }
    if (form.id) {
      await supabase.from('bz_custody').update(payload).eq('id', form.id)
    } else {
      await supabase.from('bz_custody').insert(payload)
    }
    setSaving(false); setShowForm(false); load()
  }
  async function remove(r: any) {
    if (!confirm('حذف العهدة؟')) return
    await supabase.from('bz_custody').delete().eq('id', r.id)
    load()
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">مقاولات · العُهد</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><Coins className="w-7 h-7 text-[#059669]" /> العُهد</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> عهدة جديدة</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="عُهد مفتوحة" value={String(openCount)} />
          <Stat label="المتبقّي على العُهد المفتوحة" value={`${money0(openOutstanding)} ج`} primary />
          <Stat label="إجمالي العُهد" value={String(rows.length)} />
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><Coins className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش عُهد مسجّلة</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>صاحب العهدة</Th><Th>النوع</Th><Th>المشروع</Th><Th className="text-left">القيمة</Th><Th className="text-left">المُسوّى</Th><Th className="text-left">المتبقّي</Th><Th>الحالة</Th><Th></Th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const remaining = num(r.amount) - num(r.settled_amount)
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                      <td className="px-3 py-2.5 font-bold text-[#1A2E26]">{r.holder_name}{r.description && <span className="block text-[10px] text-[#6B7280] font-normal">{r.description}</span>}</td>
                      <td className="px-3 py-2.5 text-xs text-[#6B7280]">{typeLabel(r.custody_type)}</td>
                      <td className="px-3 py-2.5 text-xs text-[#6B7280]">{projName(r.project_id)}</td>
                      <td className="px-3 py-2.5 text-left font-mono text-[#1A2E26]">{money0(r.amount)}</td>
                      <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{money0(r.settled_amount)}</td>
                      <td className="px-3 py-2.5 text-left font-mono font-black text-[#059669]">{money0(remaining)}</td>
                      <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${sm(r.status).color}`}>{sm(r.status).label}</span></td>
                      <td className="px-3 py-2.5"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => remove(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <Modal title={form.id ? 'تعديل عهدة' : 'عهدة جديدة'} onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={form.id ? 'حفظ' : 'إضافة'}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="صاحب العهدة *"><input value={form.holder_name} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} className={inputCls} /></Field>
            <Field label="النوع"><select value={form.custody_type} onChange={(e) => setForm({ ...form, custody_type: e.target.value })} className={inputCls}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          </div>
          <Field label="المشروع"><select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className={inputCls}><option value="">عام (بدون مشروع)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="الوصف"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="عهدة نقدية لمصاريف الموقع..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="قيمة العهدة (ج)"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} /></Field>
            <Field label="المُسوّى/المرتجع (ج)"><input type="number" value={form.settled_amount} onChange={(e) => setForm({ ...form, settled_amount: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ الصرف"><input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className={inputCls} /></Field>
            <Field label="الحالة"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          </div>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} /></Field>
        </Modal>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#059669] bg-white'
function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>{children}</div> }
function Th({ children, className = '' }: { children?: ReactNode; className?: string }) { return <th className={`px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase text-[#6B7280] ${className}`}>{children}</th> }
function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#34D399] border-[#059669] text-[#04352A]' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-xl md:text-2xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p></div>
}
function Modal({ title, children, onClose, onSave, saving, saveLabel }: { title: string; children: ReactNode; onClose: () => void; onSave: () => void; saving: boolean; saveLabel: string }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between"><h2 className="text-lg font-black text-[#1A2E26]">{title}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-[#6B7280]" /></button></div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2">
          <button onClick={onSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {saveLabel}</button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  )
}
