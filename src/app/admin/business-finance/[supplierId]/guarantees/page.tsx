'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ShieldCheck, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')

const TYPES = [
  { value: 'initial',     label: 'ابتدائي' },
  { value: 'advance',     label: 'دفعة مقدمة' },
  { value: 'performance', label: 'حسن تنفيذ' },
  { value: 'final',       label: 'نهائي' },
  { value: 'maintenance', label: 'صيانة' },
]
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label || t
const STATUSES = [
  { value: 'active',   label: 'ساري',   color: 'bg-[#FA8125]/10 text-[#FA8125]' },
  { value: 'released', label: 'مُفرج عنه', color: 'bg-blue-50 text-blue-700' },
  { value: 'expired',  label: 'منتهي',  color: 'bg-red-50 text-red-600' },
]
const sm = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]
const emptyForm = { g_type: 'initial', project_id: '', bank_name: '', lg_number: '', amount: '', issue_date: '', expiry_date: '', status: 'active', notes: '' }

function daysLeft(d: string | null) {
  if (!d) return null
  const ms = new Date(d).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

export default function GuaranteesPage({ params }: { params: { supplierId: string } }) {
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
    const { data: list } = await supabase.from('bz_projects').select('id, code, name').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setProjects(list || [])
    // @ts-expect-error
    const { data } = await supabase.from('bz_guarantees').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  const projName = (id: string | null) => id ? (projects.find((p) => p.id === id)?.name || '—') : 'على مستوى الشركة'
  const activeTotal = rows.filter((r) => r.status === 'active').reduce((s, r) => s + num(r.amount), 0)
  const expiringSoon = rows.filter((r) => r.status === 'active' && daysLeft(r.expiry_date) !== null && (daysLeft(r.expiry_date) as number) <= 30).length

  async function save() {
    if (num(form.amount) <= 0) { alert('اكتب قيمة الخطاب'); return }
    setSaving(true)
    // @ts-expect-error
    await supabase.from('bz_guarantees').insert({
      supplier_id: supplierId, project_id: form.project_id || null,
      g_type: form.g_type, bank_name: form.bank_name.trim() || null, lg_number: form.lg_number.trim() || null,
      amount: num(form.amount), issue_date: form.issue_date || null, expiry_date: form.expiry_date || null,
      status: form.status, notes: form.notes.trim() || null,
    })
    setSaving(false); setShowForm(false); setForm({ ...emptyForm }); load()
  }
  async function setStatus(r: any, status: string) {
    // @ts-expect-error
    await supabase.from('bz_guarantees').update({ status }).eq('id', r.id)
    load()
  }
  async function remove(r: any) {
    if (!confirm('حذف الخطاب؟')) return
    // @ts-expect-error
    await supabase.from('bz_guarantees').delete().eq('id', r.id)
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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">مقاولات · خطابات الضمان</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><ShieldCheck className="w-7 h-7 text-[#FA8125]" /> خطابات الضمان</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={() => { setForm({ ...emptyForm }); setShowForm(true) }} className="px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> خطاب جديد</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="عدد الخطابات السارية" value={String(rows.filter((r) => r.status === 'active').length)} />
          <Stat label="إجمالي قيمة السارية" value={`${money0(activeTotal)} ج`} primary />
          <Stat label="قرب انتهاء (≤30 يوم)" value={String(expiringSoon)} warn={expiringSoon > 0} />
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><ShieldCheck className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش خطابات ضمان مسجّلة</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>النوع</Th><Th>المشروع</Th><Th>البنك</Th><Th>رقم الخطاب</Th><Th className="text-left">القيمة</Th><Th>الانتهاء</Th><Th>الحالة</Th><Th></Th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const dl = daysLeft(r.expiry_date)
                  const soon = r.status === 'active' && dl !== null && dl <= 30
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                      <td className="px-3 py-2.5 font-bold text-[#1A2E26]">{typeLabel(r.g_type)}</td>
                      <td className="px-3 py-2.5 text-xs text-[#6B7280]">{projName(r.project_id)}</td>
                      <td className="px-3 py-2.5 text-xs text-[#1A2E26]">{r.bank_name || '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-[#6B7280]">{r.lg_number || '—'}</td>
                      <td className="px-3 py-2.5 text-left font-mono font-black text-[#FA8125]">{money0(r.amount)} ج</td>
                      <td className="px-3 py-2.5 text-xs font-mono">
                        {r.expiry_date ? new Date(r.expiry_date).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        {soon && <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600"><AlertTriangle className="w-3 h-3" />{dl}ي</span>}
                      </td>
                      <td className="px-3 py-2.5"><select value={r.status} onChange={(e) => setStatus(r, e.target.value)} className={`text-[10px] font-bold rounded-md px-2 py-1 border-0 ${sm(r.status).color}`}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                      <td className="px-3 py-2.5"><button onClick={() => remove(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <Modal title="خطاب ضمان جديد" onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel="إضافة الخطاب">
          <div className="grid grid-cols-2 gap-3">
            <Field label="النوع"><select value={form.g_type} onChange={(e) => setForm({ ...form, g_type: e.target.value })} className={inputCls}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
            <Field label="المشروع"><select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className={inputCls}><option value="">على مستوى الشركة</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="البنك"><input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className={inputCls} /></Field>
            <Field label="رقم الخطاب"><input value={form.lg_number} onChange={(e) => setForm({ ...form, lg_number: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="القيمة (ج)"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ الإصدار"><input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className={inputCls} /></Field>
            <Field label="تاريخ الانتهاء"><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} /></Field>
        </Modal>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#FA8125] bg-white'
function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>{children}</div> }
function Th({ children, className = '' }: { children?: ReactNode; className?: string }) { return <th className={`px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase text-[#6B7280] ${className}`}>{children}</th> }
function Stat({ label, value, primary, warn }: { label: string; value: string; primary?: boolean; warn?: boolean }) {
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#FA8125] border-[#FA8125] text-white' : warn ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : warn ? 'text-amber-700' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-xl md:text-2xl font-black mt-1 ${primary ? 'text-white' : warn ? 'text-amber-700' : 'text-[#1A2E26]'}`}>{value}</p></div>
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
