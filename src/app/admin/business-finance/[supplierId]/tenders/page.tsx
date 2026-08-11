'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Gavel, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, Pencil } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')
const fdate = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const TYPES = [
  { value: 'public',  label: 'عامة' },
  { value: 'private', label: 'خاصة' },
  { value: 'limited', label: 'محدودة' },
]
const tLabel = (t: string) => TYPES.find((x) => x.value === t)?.label || t
const STATUSES = [
  { value: 'preparing', label: 'تحت التحضير', color: 'bg-gray-100 text-gray-600' },
  { value: 'submitted', label: 'مُقدّمة',     color: 'bg-amber-50 text-amber-700' },
  { value: 'won',       label: 'رست علينا',  color: 'bg-[#2B4521]/10 text-[#2B4521]' },
  { value: 'lost',      label: 'مرستش',      color: 'bg-red-50 text-red-600' },
  { value: 'cancelled', label: 'ملغية',      color: 'bg-gray-100 text-gray-500' },
]
const sm = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]
const emptyForm = { id: null as string | null, title: '', client_name: '', tender_type: 'public', submission_date: '', estimated_value: '', bid_bond_amount: '', status: 'preparing', result_date: '', notes: '' }

export default function TendersPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data } = await supabase.from('bz_tenders').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  const active = rows.filter((r) => r.status === 'preparing' || r.status === 'submitted').length
  const won = rows.filter((r) => r.status === 'won').length
  const decided = rows.filter((r) => r.status === 'won' || r.status === 'lost').length
  const winRate = decided > 0 ? (won / decided) * 100 : 0
  const pipelineValue = rows.filter((r) => r.status === 'preparing' || r.status === 'submitted').reduce((s, r) => s + num(r.estimated_value), 0)

  function openAdd() { setForm({ ...emptyForm }); setShowForm(true) }
  function openEdit(r: any) { setForm({ id: r.id, title: r.title || '', client_name: r.client_name || '', tender_type: r.tender_type || 'public', submission_date: r.submission_date || '', estimated_value: String(r.estimated_value ?? ''), bid_bond_amount: String(r.bid_bond_amount ?? ''), status: r.status || 'preparing', result_date: r.result_date || '', notes: r.notes || '' }); setShowForm(true) }

  async function save() {
    if (!form.title.trim()) { alert('اكتب اسم المناقصة'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId, title: form.title.trim(), client_name: form.client_name.trim() || null,
      tender_type: form.tender_type, submission_date: form.submission_date || null,
      estimated_value: num(form.estimated_value), bid_bond_amount: num(form.bid_bond_amount),
      status: form.status, result_date: form.result_date || null, notes: form.notes.trim() || null,
    }
    if (form.id) {
      // @ts-expect-error
      await supabase.from('bz_tenders').update(payload).eq('id', form.id)
    } else {
      // @ts-expect-error
      await supabase.from('bz_tenders').insert(payload)
    }
    setSaving(false); setShowForm(false); load()
  }
  async function setStatus(r: any, status: string) {
    // @ts-expect-error
    await supabase.from('bz_tenders').update({ status }).eq('id', r.id)
    load()
  }
  async function remove(r: any) {
    if (!confirm('حذف المناقصة؟')) return
    // @ts-expect-error
    await supabase.from('bz_tenders').delete().eq('id', r.id)
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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-1">مقاولات · المناقصات</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><Gavel className="w-7 h-7 text-[#2B4521]" /> المناقصات والعطاءات</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-[#2B4521] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> مناقصة</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="نشطة (تحضير/مقدّمة)" value={String(active)} />
          <Stat label="قيمة الـ Pipeline" value={`${money0(pipelineValue)} ج`} primary />
          <Stat label="رست علينا" value={String(won)} />
          <Stat label="نسبة الفوز" value={`${winRate.toFixed(0)}%`} />
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><Gavel className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش مناقصات مسجّلة</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>المناقصة</Th><Th>الجهة</Th><Th>النوع</Th><Th>آخر موعد</Th><Th className="text-left">القيمة التقديرية</Th><Th className="text-left">التأمين</Th><Th>الحالة</Th><Th></Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                    <td className="px-3 py-2.5 font-bold text-[#1A2E26] max-w-xs">{r.title}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280]">{r.client_name || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280]">{tLabel(r.tender_type)}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono whitespace-nowrap">{fdate(r.submission_date)}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#1A2E26]">{money0(r.estimated_value)}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{r.bid_bond_amount > 0 ? money0(r.bid_bond_amount) : '—'}</td>
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
        <Modal title={form.id ? 'تعديل مناقصة' : 'مناقصة جديدة'} onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={form.id ? 'حفظ' : 'إضافة'}>
          <Field label="اسم المناقصة *"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الجهة المالكة"><input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className={inputCls} /></Field>
            <Field label="النوع"><select value={form.tender_type} onChange={(e) => setForm({ ...form, tender_type: e.target.value })} className={inputCls}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="القيمة التقديرية (ج)"><input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} className={inputCls} /></Field>
            <Field label="التأمين الابتدائي (ج)"><input type="number" value={form.bid_bond_amount} onChange={(e) => setForm({ ...form, bid_bond_amount: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="آخر موعد للتقديم"><input type="date" value={form.submission_date} onChange={(e) => setForm({ ...form, submission_date: e.target.value })} className={inputCls} /></Field>
            <Field label="تاريخ النتيجة"><input type="date" value={form.result_date} onChange={(e) => setForm({ ...form, result_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="الحالة"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
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
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#2B4521] border-[#2B4521] text-white' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-lg md:text-2xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p></div>
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
