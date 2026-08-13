'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Wrench, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, Pencil, MapPin } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')

const OWNERSHIP = [
  { value: 'owned',  label: 'مملوكة' },
  { value: 'rented', label: 'مستأجرة' },
]
const ownLabel = (o: string) => OWNERSHIP.find((x) => x.value === o)?.label || o
const STATUSES = [
  { value: 'available',   label: 'متاحة',     color: 'bg-[#FA8125]/10 text-[#FA8125]' },
  { value: 'in_use',      label: 'قيد الاستخدام', color: 'bg-blue-50 text-blue-700' },
  { value: 'maintenance', label: 'صيانة',     color: 'bg-amber-50 text-amber-700' },
  { value: 'idle',        label: 'متوقفة',    color: 'bg-gray-100 text-gray-600' },
]
const sm = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]
const emptyForm = { id: null as string | null, name: '', asset_no: '', category: '', ownership: 'owned', rental_cost: '', status: 'available', project_id: '', location: '', notes: '' }

export default function EquipmentPage({ params }: { params: { supplierId: string } }) {
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
    const { data } = await supabase.from('bz_equipment').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  const projName = (id: string | null) => id ? (projects.find((p) => p.id === id)?.name || '—') : 'المخزن'
  const inUse = rows.filter((r) => r.status === 'in_use').length
  const rentalMonthly = rows.filter((r) => r.ownership === 'rented').reduce((s, r) => s + num(r.rental_cost), 0)

  function openAdd() { setForm({ ...emptyForm }); setShowForm(true) }
  function openEdit(r: any) { setForm({ id: r.id, name: r.name || '', asset_no: r.asset_no || '', category: r.category || '', ownership: r.ownership || 'owned', rental_cost: String(r.rental_cost ?? ''), status: r.status || 'available', project_id: r.project_id || '', location: r.location || '', notes: r.notes || '' }); setShowForm(true) }

  async function save() {
    if (!form.name.trim()) { alert('اكتب اسم المعدة'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId, project_id: form.project_id || null, name: form.name.trim(),
      asset_no: form.asset_no.trim() || null, category: form.category.trim() || null,
      ownership: form.ownership, rental_cost: form.ownership === 'rented' ? num(form.rental_cost) : 0,
      status: form.status, location: form.location.trim() || null, notes: form.notes.trim() || null,
    }
    if (form.id) {
      await supabase.from('bz_equipment').update(payload).eq('id', form.id)
    } else {
      await supabase.from('bz_equipment').insert(payload)
    }
    setSaving(false); setShowForm(false); load()
  }
  async function setStatus(r: any, status: string) {
    await supabase.from('bz_equipment').update({ status }).eq('id', r.id)
    load()
  }
  async function remove(r: any) {
    if (!confirm('حذف المعدة؟')) return
    await supabase.from('bz_equipment').delete().eq('id', r.id)
    load()
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">مقاولات · المعدات</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><Wrench className="w-7 h-7 text-[#FA8125]" /> المعدات</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> معدة جديدة</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="إجمالي المعدات" value={String(rows.length)} />
          <Stat label="قيد الاستخدام" value={String(inUse)} />
          <Stat label="إيجار شهري (المستأجرة)" value={`${money0(rentalMonthly)} ج`} primary />
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><Wrench className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش معدات مسجّلة</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>المعدة</Th><Th>النوع</Th><Th>الملكية</Th><Th className="text-left">إيجار/شهر</Th><Th>المكان/المشروع</Th><Th>الحالة</Th><Th></Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                    <td className="px-3 py-2.5 font-bold text-[#1A2E26]">{r.name}{r.asset_no && <span className="block text-[10px] text-[#6B7280] font-mono font-normal">#{r.asset_no}</span>}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280]">{r.category || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280]">{ownLabel(r.ownership)}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#FA8125]">{r.ownership === 'rented' && r.rental_cost > 0 ? money0(r.rental_cost) : '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280]">{r.location ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.location}</span> : projName(r.project_id)}</td>
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
        <Modal title={form.id ? 'تعديل معدة' : 'معدة جديدة'} onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={form.id ? 'حفظ' : 'إضافة'}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم المعدة *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="حفار / لودر / خلاطة..." /></Field>
            <Field label="رقم الأصل"><input value={form.asset_no} onChange={(e) => setForm({ ...form, asset_no: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="النوع/الفئة"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} /></Field>
            <Field label="الملكية"><select value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value })} className={inputCls}>{OWNERSHIP.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          </div>
          {form.ownership === 'rented' && (
            <Field label="تكلفة الإيجار/شهر (ج)"><input type="number" value={form.rental_cost} onChange={(e) => setForm({ ...form, rental_cost: e.target.value })} className={inputCls} /></Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="الحالة"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
            <Field label="المشروع"><select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className={inputCls}><option value="">المخزن (بدون مشروع)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          </div>
          <Field label="المكان"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></Field>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} /></Field>
        </Modal>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#FA8125] bg-white'
function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>{children}</div> }
function Th({ children, className = '' }: { children?: ReactNode; className?: string }) { return <th className={`px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase text-[#6B7280] ${className}`}>{children}</th> }
function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#FA8125] border-[#FA8125] text-white' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-xl md:text-2xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p></div>
}
function Modal({ title, children, onClose, onSave, saving, saveLabel }: { title: string; children: ReactNode; onClose: () => void; onSave: () => void; saving: boolean; saveLabel: string }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between"><h2 className="text-lg font-black text-[#1A2E26]">{title}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-[#6B7280]" /></button></div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2">
          <button onClick={onSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {saveLabel}</button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  )
}
