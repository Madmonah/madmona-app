'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { CalendarRange, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, Pencil } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const fdate = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }) : '—'

const STATUSES = [
  { value: 'pending',     label: 'لم تبدأ',  color: 'bg-gray-100 text-gray-600' },
  { value: 'in_progress', label: 'جارية',   color: 'bg-[#2B4521]/10 text-[#2B4521]' },
  { value: 'done',        label: 'مكتملة',  color: 'bg-blue-50 text-blue-700' },
  { value: 'delayed',     label: 'متأخرة',  color: 'bg-red-50 text-red-600' },
]
const sm = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]
const emptyForm = { id: null as string | null, name: '', weight_pct: '', planned_start: '', planned_end: '', actual_start: '', actual_end: '', status: 'pending', sort_order: '', notes: '' }

export default function MilestonesPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [projects, setProjects] = useState<any[]>([])
  const [selected, setSelected] = useState<string>('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  async function loadProjects() {
    // @ts-expect-error
    const { data } = await supabase.from('bz_projects').select('id, name').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setProjects(data || [])
    const urlP = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('project') : null
    const initial = (urlP && (data || []).some((p: any) => p.id === urlP)) ? urlP : ((data || [])[0]?.id || '')
    setSelected(initial)
    if (!initial) setLoading(false)
  }
  async function loadRows(pid: string) {
    if (!pid) { setRows([]); return }
    setLoading(true)
    // @ts-expect-error
    const { data } = await supabase.from('bz_milestones').select('*').eq('project_id', pid).order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { loadProjects() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])
  useEffect(() => { if (selected) loadRows(selected) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selected])

  const totalWeight = rows.reduce((s, r) => s + num(r.weight_pct), 0)
  const doneWeight = rows.filter((r) => r.status === 'done').reduce((s, r) => s + num(r.weight_pct), 0)
  const progress = totalWeight > 0 ? (doneWeight / totalWeight) * 100 : 0
  const delayed = rows.filter((r) => r.status === 'delayed').length

  function openAdd() { setForm({ ...emptyForm, sort_order: String(rows.length + 1) }); setShowForm(true) }
  function openEdit(r: any) { setForm({ id: r.id, name: r.name || '', weight_pct: String(r.weight_pct ?? ''), planned_start: r.planned_start || '', planned_end: r.planned_end || '', actual_start: r.actual_start || '', actual_end: r.actual_end || '', status: r.status || 'pending', sort_order: String(r.sort_order ?? ''), notes: r.notes || '' }); setShowForm(true) }

  async function save() {
    if (!selected) { alert('اختر مشروع'); return }
    if (!form.name.trim()) { alert('اكتب اسم المرحلة'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId, project_id: selected, name: form.name.trim(), weight_pct: num(form.weight_pct),
      planned_start: form.planned_start || null, planned_end: form.planned_end || null,
      actual_start: form.actual_start || null, actual_end: form.actual_end || null,
      status: form.status, sort_order: num(form.sort_order), notes: form.notes.trim() || null,
    }
    if (form.id) {
      // @ts-expect-error
      await supabase.from('bz_milestones').update(payload).eq('id', form.id)
    } else {
      // @ts-expect-error
      await supabase.from('bz_milestones').insert(payload)
    }
    setSaving(false); setShowForm(false); loadRows(selected)
  }
  async function setStatus(r: any, status: string) {
    // @ts-expect-error
    await supabase.from('bz_milestones').update({ status }).eq('id', r.id)
    loadRows(selected)
  }
  async function remove(r: any) {
    if (!confirm('حذف المرحلة؟')) return
    // @ts-expect-error
    await supabase.from('bz_milestones').delete().eq('id', r.id)
    loadRows(selected)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#2B4521] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-1">مقاولات · الجدول الزمني</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><CalendarRange className="w-7 h-7 text-[#2B4521]" /> المراحل والجدول الزمني</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="text-sm font-bold text-[#1A2E26] bg-white border border-gray-200 rounded-xl px-4 py-2">
                {projects.length === 0 && <option value="">لا توجد مشاريع</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={openAdd} disabled={!selected} className="px-4 py-2 rounded-xl bg-[#2B4521] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> مرحلة</button>
              <button onClick={() => loadRows(selected)} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {!selected ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><CalendarRange className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">اعمل مشروع الأول عشان تضيف مراحله</p></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="عدد المراحل" value={String(rows.length)} />
              <Stat label="إجمالي الأوزان" value={`${totalWeight.toFixed(0)}%`} />
              <Stat label="نسبة الإنجاز (بالوزن)" value={`${progress.toFixed(1)}%`} primary />
              <Stat label="مراحل متأخرة" value={String(delayed)} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-[#6B7280]">التقدّم الكلي</span><span className="text-lg font-black text-[#2B4521]">{progress.toFixed(1)}%</span></div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-l from-[#2FA084] to-[#2B4521] rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
            </div>

            {loading ? (
              <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 text-[#2B4521] animate-spin" /></div>
            ) : rows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><CalendarRange className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش مراحل للمشروع ده</p></div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>#</Th><Th>المرحلة</Th><Th className="text-left">الوزن</Th><Th>مخطط (من/إلى)</Th><Th>فعلي (من/إلى)</Th><Th>الحالة</Th><Th></Th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                        <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono">{r.sort_order}</td>
                        <td className="px-3 py-2.5 font-bold text-[#1A2E26]">{r.name}</td>
                        <td className="px-3 py-2.5 text-left font-mono text-[#1A2E26]">{num(r.weight_pct).toFixed(0)}%</td>
                        <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono whitespace-nowrap">{fdate(r.planned_start)} · {fdate(r.planned_end)}</td>
                        <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono whitespace-nowrap">{fdate(r.actual_start)} · {fdate(r.actual_end)}</td>
                        <td className="px-3 py-2.5"><select value={r.status} onChange={(e) => setStatus(r, e.target.value)} className={`text-[10px] font-bold rounded-md px-2 py-1 border-0 ${sm(r.status).color}`}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                        <td className="px-3 py-2.5"><div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => remove(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {showForm && (
        <Modal title={form.id ? 'تعديل مرحلة' : 'مرحلة جديدة'} onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={form.id ? 'حفظ' : 'إضافة'}>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Field label="اسم المرحلة *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="أعمال الحفر / الأساسات..." /></Field></div>
            <Field label="الترتيب"><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الوزن (%)"><input type="number" value={form.weight_pct} onChange={(e) => setForm({ ...form, weight_pct: e.target.value })} className={inputCls} /></Field>
            <Field label="الحالة"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="بداية مخططة"><input type="date" value={form.planned_start} onChange={(e) => setForm({ ...form, planned_start: e.target.value })} className={inputCls} /></Field>
            <Field label="نهاية مخططة"><input type="date" value={form.planned_end} onChange={(e) => setForm({ ...form, planned_end: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="بداية فعلية"><input type="date" value={form.actual_start} onChange={(e) => setForm({ ...form, actual_start: e.target.value })} className={inputCls} /></Field>
            <Field label="نهاية فعلية"><input type="date" value={form.actual_end} onChange={(e) => setForm({ ...form, actual_end: e.target.value })} className={inputCls} /></Field>
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
