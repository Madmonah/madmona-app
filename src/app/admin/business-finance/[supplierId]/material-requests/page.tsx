'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { PackageOpen, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, Pencil } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const fdate = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }) : '—'

const STATUSES = [
  { value: 'pending',  label: 'منتظر',  color: 'bg-amber-50 text-amber-700' },
  { value: 'issued',   label: 'تم الصرف', color: 'bg-[#34D399]/10 text-[#059669]' },
  { value: 'rejected', label: 'مرفوض',  color: 'bg-red-50 text-red-600' },
]
const sm = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]
const emptyForm = { id: null as string | null, item: '', quantity: '', unit: '', project_id: '', requested_by: '', request_date: '', status: 'pending', notes: '' }

export default function MaterialRequestsPage({ params }: { params: { supplierId: string } }) {
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
    const { data } = await supabase.from('bz_material_requests').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  const projName = (id: string | null) => id ? (projects.find((p) => p.id === id)?.name || '—') : 'عام'
  const pending = rows.filter((r) => r.status === 'pending').length

  function openAdd() { setForm({ ...emptyForm }); setShowForm(true) }
  function openEdit(r: any) { setForm({ id: r.id, item: r.item || '', quantity: String(r.quantity ?? ''), unit: r.unit || '', project_id: r.project_id || '', requested_by: r.requested_by || '', request_date: r.request_date || '', status: r.status || 'pending', notes: r.notes || '' }); setShowForm(true) }

  async function save() {
    if (!form.item.trim()) { alert('اكتب الصنف'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId, project_id: form.project_id || null, item: form.item.trim(),
      quantity: num(form.quantity), unit: form.unit.trim() || null, requested_by: form.requested_by.trim() || null,
      request_date: form.request_date || null, status: form.status, notes: form.notes.trim() || null,
    }
    if (form.id) {
      await supabase.from('bz_material_requests').update(payload).eq('id', form.id)
    } else {
      await supabase.from('bz_material_requests').insert(payload)
    }
    setSaving(false); setShowForm(false); load()
  }
  async function setStatus(r: any, status: string) {
    await supabase.from('bz_material_requests').update({ status }).eq('id', r.id)
    load()
  }
  async function remove(r: any) {
    if (!confirm('حذف الطلب؟')) return
    await supabase.from('bz_material_requests').delete().eq('id', r.id)
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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">مقاولات · طلبات المواد</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><PackageOpen className="w-7 h-7 text-[#059669]" /> طلبات صرف المواد</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> طلب</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="طلبات منتظرة" value={String(pending)} primary />
          <Stat label="إجمالي الطلبات" value={String(rows.length)} />
          <Stat label="تم الصرف" value={String(rows.filter((r) => r.status === 'issued').length)} />
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><PackageOpen className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش طلبات مسجّلة</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>الصنف</Th><Th className="text-left">الكمية</Th><Th>المشروع</Th><Th>طالب الصرف</Th><Th>التاريخ</Th><Th>الحالة</Th><Th></Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                    <td className="px-3 py-2.5 font-bold text-[#1A2E26]">{r.item}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#1A2E26]">{num(r.quantity).toLocaleString('ar-EG')} {r.unit || ''}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280]">{projName(r.project_id)}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280]">{r.requested_by || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono whitespace-nowrap">{fdate(r.request_date)}</td>
                    <td className="px-3 py-2.5"><select value={r.status} onChange={(e) => setStatus(r, e.target.value)} className={`text-[10px] font-bold rounded-md px-2 py-1 border-0 ${sm(r.status).color}`}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                    <td className="px-3 py-2.5"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => remove(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <Modal title={form.id ? 'تعديل طلب' : 'طلب صرف جديد'} onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={form.id ? 'حفظ' : 'إضافة'}>
          <Field label="الصنف *"><input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} className={inputCls} placeholder="أسمنت / حديد / رمل..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الكمية"><input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} /></Field>
            <Field label="الوحدة"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls} placeholder="شيكارة / طن / م٣" /></Field>
          </div>
          <Field label="المشروع"><select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className={inputCls}><option value="">عام (بدون مشروع)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="طالب الصرف"><input value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} className={inputCls} /></Field>
            <Field label="التاريخ"><input type="date" value={form.request_date} onChange={(e) => setForm({ ...form, request_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="الحالة"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
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
