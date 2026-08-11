'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { FileBadge, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, Pencil, AlertTriangle, ExternalLink } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const fdate = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const daysLeft = (d: string | null) => { if (!d) return null; const ms = new Date(d).getTime() - Date.now(); return Math.ceil(ms / 86400000) }

const TYPES = [
  { value: 'commercial_register', label: 'سجل تجاري' },
  { value: 'tax_card',            label: 'بطاقة ضريبية' },
  { value: 'classification',      label: 'شهادة تصنيف (الاتحاد)' },
  { value: 'insurance',           label: 'تأمينات' },
  { value: 'license',             label: 'رخصة' },
  { value: 'other',               label: 'أخرى' },
]
const tLabel = (t: string) => TYPES.find((x) => x.value === t)?.label || t
const emptyForm = { id: null as string | null, name: '', doc_type: 'commercial_register', doc_number: '', issue_date: '', expiry_date: '', url: '', status: 'active', notes: '' }

export default function CompanyDocsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data } = await supabase.from('bz_company_docs').select('*').eq('supplier_id', supplierId).order('expiry_date', { ascending: true, nullsFirst: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  const expiringSoon = rows.filter((r) => { const d = daysLeft(r.expiry_date); return d !== null && d >= 0 && d <= 30 }).length
  const expired = rows.filter((r) => { const d = daysLeft(r.expiry_date); return d !== null && d < 0 }).length

  function openAdd() { setForm({ ...emptyForm }); setShowForm(true) }
  function openEdit(r: any) { setForm({ id: r.id, name: r.name || '', doc_type: r.doc_type || 'other', doc_number: r.doc_number || '', issue_date: r.issue_date || '', expiry_date: r.expiry_date || '', url: r.url || '', status: r.status || 'active', notes: r.notes || '' }); setShowForm(true) }

  async function save() {
    if (!form.name.trim()) { alert('اكتب اسم المستند'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId, name: form.name.trim(), doc_type: form.doc_type,
      doc_number: form.doc_number.trim() || null, issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null, url: form.url.trim() || null,
      status: form.status, notes: form.notes.trim() || null,
    }
    if (form.id) {
      // @ts-expect-error
      await supabase.from('bz_company_docs').update(payload).eq('id', form.id)
    } else {
      // @ts-expect-error
      await supabase.from('bz_company_docs').insert(payload)
    }
    setSaving(false); setShowForm(false); load()
  }
  async function remove(r: any) {
    if (!confirm('حذف المستند؟')) return
    // @ts-expect-error
    await supabase.from('bz_company_docs').delete().eq('id', r.id)
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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-1">مقاولات · سجلات الشركة</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><FileBadge className="w-7 h-7 text-[#2B4521]" /> سجلات الشركة وشهاداتها</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-[#2B4521] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> مستند</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="إجمالي المستندات" value={String(rows.length)} primary />
          <Stat label="قريبة الانتهاء (≤30 يوم)" value={String(expiringSoon)} />
          <Stat label="منتهية" value={String(expired)} />
        </div>

        {(expiringSoon > 0 || expired > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-amber-800"><AlertTriangle className="w-5 h-5 shrink-0" /><span>فيه مستندات محتاجة تجديد — راجع الصفوف الملوّنة تحت.</span></div>
        )}

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><FileBadge className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش مستندات مسجّلة</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>المستند</Th><Th>النوع</Th><Th>الرقم</Th><Th>الإصدار</Th><Th>الانتهاء</Th><Th>الحالة</Th><Th></Th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const dl = daysLeft(r.expiry_date)
                  const rowCls = dl !== null && dl < 0 ? 'bg-red-50/60' : (dl !== null && dl <= 30 ? 'bg-amber-50/60' : '')
                  return (
                    <tr key={r.id} className={`border-b border-gray-50 hover:bg-[#FAFAF7]/50 ${rowCls}`}>
                      <td className="px-3 py-2.5 font-bold text-[#1A2E26]">{r.name}{r.url && <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex"><ExternalLink className="w-3 h-3 text-[#2B4521] mr-1 inline" /></a>}</td>
                      <td className="px-3 py-2.5 text-xs text-[#6B7280]">{tLabel(r.doc_type)}</td>
                      <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono">{r.doc_number || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono whitespace-nowrap">{fdate(r.issue_date)}</td>
                      <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap">{fdate(r.expiry_date)}{dl !== null && dl >= 0 && dl <= 30 && <span className="block text-[10px] text-amber-700 font-bold">باقي {dl} يوم</span>}{dl !== null && dl < 0 && <span className="block text-[10px] text-red-600 font-bold">منتهي</span>}</td>
                      <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${r.status === 'active' ? 'bg-[#2B4521]/10 text-[#2B4521]' : 'bg-red-50 text-red-600'}`}>{r.status === 'active' ? 'ساري' : 'منتهي'}</span></td>
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
        <Modal title={form.id ? 'تعديل مستند' : 'مستند جديد'} onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={form.id ? 'حفظ' : 'إضافة'}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم المستند *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
            <Field label="النوع"><select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} className={inputCls}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="رقم المستند"><input value={form.doc_number} onChange={(e) => setForm({ ...form, doc_number: e.target.value })} className={inputCls} /></Field>
            <Field label="الحالة"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}><option value="active">ساري</option><option value="expired">منتهي</option></select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ الإصدار"><input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className={inputCls} /></Field>
            <Field label="تاريخ الانتهاء"><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="رابط الملف (اختياري)"><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputCls} placeholder="https://..." /></Field>
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
