'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Fuel, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, Pencil } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')
const fdate = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }) : '—'

const TYPES = [
  { value: 'maintenance', label: 'صيانة',  color: 'bg-amber-50 text-amber-700' },
  { value: 'fuel',        label: 'سولار',  color: 'bg-blue-50 text-blue-700' },
  { value: 'operation',   label: 'تشغيل',  color: 'bg-[#34D399]/10 text-[#059669]' },
]
const tm = (t: string) => TYPES.find((x) => x.value === t) || TYPES[0]
const emptyForm = { id: null as string | null, equipment_id: '', log_type: 'maintenance', log_date: '', cost: '', hours: '', liters: '', description: '', notes: '' }

export default function EquipmentLogsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [equipment, setEquipment] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  async function load() {
    setLoading(true)
    const { data: eq } = await supabase.from('bz_equipment').select('id, name, asset_no').eq('supplier_id', supplierId).order('name', { ascending: true })
    setEquipment(eq || [])
    const { data } = await supabase.from('bz_equipment_logs').select('*').eq('supplier_id', supplierId).order('log_date', { ascending: false }).order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  const eqName = (id: string) => equipment.find((e) => e.id === id)?.name || '—'
  const maintCost = rows.filter((r) => r.log_type === 'maintenance').reduce((s, r) => s + num(r.cost), 0)
  const fuelCost = rows.filter((r) => r.log_type === 'fuel').reduce((s, r) => s + num(r.cost), 0)
  const fuelLiters = rows.filter((r) => r.log_type === 'fuel').reduce((s, r) => s + num(r.liters), 0)

  function openAdd() { setForm({ ...emptyForm, equipment_id: equipment[0]?.id || '' }); setShowForm(true) }
  function openEdit(r: any) { setForm({ id: r.id, equipment_id: r.equipment_id || '', log_type: r.log_type || 'maintenance', log_date: r.log_date || '', cost: String(r.cost ?? ''), hours: String(r.hours ?? ''), liters: String(r.liters ?? ''), description: r.description || '', notes: r.notes || '' }); setShowForm(true) }

  async function save() {
    if (!form.equipment_id) { alert('اختر المعدة'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId, equipment_id: form.equipment_id, log_type: form.log_type,
      log_date: form.log_date || null, cost: num(form.cost), hours: num(form.hours), liters: num(form.liters),
      description: form.description.trim() || null, notes: form.notes.trim() || null,
    }
    if (form.id) {
      await supabase.from('bz_equipment_logs').update(payload).eq('id', form.id)
    } else {
      await supabase.from('bz_equipment_logs').insert(payload)
    }
    setSaving(false); setShowForm(false); load()
  }
  async function remove(r: any) {
    if (!confirm('حذف السجل؟')) return
    await supabase.from('bz_equipment_logs').delete().eq('id', r.id)
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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">مقاولات · صيانة المعدات</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><Fuel className="w-7 h-7 text-[#059669]" /> صيانة وسولار المعدات</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={openAdd} disabled={equipment.length === 0} className="px-4 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> سجل</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="إجمالي الصيانة" value={`${money0(maintCost)} ج`} primary />
          <Stat label="إجمالي السولار" value={`${money0(fuelCost)} ج`} />
          <Stat label="لترات السولار" value={`${money0(fuelLiters)} ل`} />
          <Stat label="عدد السجلات" value={String(rows.length)} />
        </div>

        {equipment.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><Fuel className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">سجّل معدات الأول في تاب المعدات</p></div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><Fuel className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش سجلات صيانة/سولار</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>المعدة</Th><Th>النوع</Th><Th>البيان</Th><Th>التاريخ</Th><Th className="text-left">ساعات</Th><Th className="text-left">لترات</Th><Th className="text-left">التكلفة</Th><Th></Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                    <td className="px-3 py-2.5 font-bold text-[#1A2E26]">{eqName(r.equipment_id)}</td>
                    <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${tm(r.log_type).color}`}>{tm(r.log_type).label}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280] max-w-[180px] truncate">{r.description || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono whitespace-nowrap">{fdate(r.log_date)}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{num(r.hours) || '—'}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{num(r.liters) || '—'}</td>
                    <td className="px-3 py-2.5 text-left font-mono font-black text-red-600">{r.cost > 0 ? money0(r.cost) : '—'}</td>
                    <td className="px-3 py-2.5"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => remove(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <Modal title={form.id ? 'تعديل سجل' : 'سجل جديد'} onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={form.id ? 'حفظ' : 'إضافة'}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="المعدة *"><select value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })} className={inputCls}>{equipment.map((e) => <option key={e.id} value={e.id}>{e.name}{e.asset_no ? ` (${e.asset_no})` : ''}</option>)}</select></Field>
            <Field label="النوع"><select value={form.log_type} onChange={(e) => setForm({ ...form, log_type: e.target.value })} className={inputCls}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          </div>
          <Field label="البيان"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="تغيير زيت / تعبئة سولار..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="التكلفة (ج)"><input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={inputCls} /></Field>
            <Field label="التاريخ"><input type="date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ساعات التشغيل"><input type="number" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className={inputCls} /></Field>
            <Field label="لترات السولار"><input type="number" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} className={inputCls} /></Field>
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
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#34D399] border-[#059669] text-[#04352A]' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-lg md:text-2xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p></div>
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
