'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ClipboardList, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, Pencil, Users, Wrench } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const fdate = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-EG', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'
const today = () => new Date().toISOString().slice(0, 10)
const emptyForm = { id: null as string | null, report_date: today(), labor_count: '', equipment_count: '', weather: '', work_done: '', issues: '', notes: '' }

export default function DailyReportsPage({ params }: { params: { supplierId: string } }) {
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
    const { data } = await supabase.from('bz_daily_reports').select('*').eq('project_id', pid).order('report_date', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { loadProjects() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])
  useEffect(() => { if (selected) loadRows(selected) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selected])

  function openAdd() { setForm({ ...emptyForm, report_date: today() }); setShowForm(true) }
  function openEdit(r: any) { setForm({ id: r.id, report_date: r.report_date || today(), labor_count: String(r.labor_count ?? ''), equipment_count: String(r.equipment_count ?? ''), weather: r.weather || '', work_done: r.work_done || '', issues: r.issues || '', notes: r.notes || '' }); setShowForm(true) }

  async function save() {
    if (!selected) { alert('اختر مشروع'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId, project_id: selected, report_date: form.report_date || today(),
      labor_count: num(form.labor_count), equipment_count: num(form.equipment_count),
      weather: form.weather.trim() || null, work_done: form.work_done.trim() || null,
      issues: form.issues.trim() || null, notes: form.notes.trim() || null,
    }
    if (form.id) {
      // @ts-expect-error
      await supabase.from('bz_daily_reports').update(payload).eq('id', form.id)
    } else {
      // @ts-expect-error
      await supabase.from('bz_daily_reports').insert(payload)
    }
    setSaving(false); setShowForm(false); loadRows(selected)
  }
  async function remove(r: any) {
    if (!confirm('حذف اليومية؟')) return
    // @ts-expect-error
    await supabase.from('bz_daily_reports').delete().eq('id', r.id)
    loadRows(selected)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">مقاولات · يومية الموقع</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><ClipboardList className="w-7 h-7 text-[#1F6F5F]" /> يومية الموقع</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="text-sm font-bold text-[#1A2E26] bg-white border border-gray-200 rounded-xl px-4 py-2">
                {projects.length === 0 && <option value="">لا توجد مشاريع</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={openAdd} disabled={!selected} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> يومية</button>
              <button onClick={() => loadRows(selected)} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {!selected ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><ClipboardList className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">اعمل مشروع الأول عشان تسجّل يومياته</p></div>
        ) : loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 text-[#1F6F5F] animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><ClipboardList className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش يوميات مسجّلة للمشروع ده</p></div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] text-xs font-black font-mono">{fdate(r.report_date)}</span>
                    <span className="text-xs text-[#6B7280] flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {num(r.labor_count)} عامل</span>
                    <span className="text-xs text-[#6B7280] flex items-center gap-1"><Wrench className="w-3.5 h-3.5" /> {num(r.equipment_count)} معدة</span>
                    {r.weather && <span className="text-xs text-[#6B7280]">· {r.weather}</span>}
                  </div>
                  <div className="flex gap-1"><button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => remove(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button></div>
                </div>
                {r.work_done && <p className="text-sm text-[#1A2E26] mt-3 leading-relaxed"><span className="font-bold text-[#6B7280] text-xs">الأعمال: </span>{r.work_done}</p>}
                {r.issues && <p className="text-sm text-red-600 mt-1 leading-relaxed"><span className="font-bold text-xs">معوقات: </span>{r.issues}</p>}
                {r.notes && <p className="text-xs text-[#6B7280] mt-1">{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <Modal title={form.id ? 'تعديل يومية' : 'يومية جديدة'} onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={form.id ? 'حفظ' : 'إضافة'}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="التاريخ"><input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} className={inputCls} /></Field>
            <Field label="عدد العمالة"><input type="number" value={form.labor_count} onChange={(e) => setForm({ ...form, labor_count: e.target.value })} className={inputCls} /></Field>
            <Field label="عدد المعدات"><input type="number" value={form.equipment_count} onChange={(e) => setForm({ ...form, equipment_count: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="الطقس"><input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} className={inputCls} placeholder="مشمس / ممطر..." /></Field>
          <Field label="الأعمال المنفّذة"><textarea value={form.work_done} onChange={(e) => setForm({ ...form, work_done: e.target.value })} className={inputCls} rows={3} /></Field>
          <Field label="المعوقات"><textarea value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} className={inputCls} rows={2} /></Field>
          <Field label="ملاحظات"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} /></Field>
        </Modal>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] bg-white'
function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>{children}</div> }
function Modal({ title, children, onClose, onSave, saving, saveLabel }: { title: string; children: ReactNode; onClose: () => void; onSave: () => void; saving: boolean; saveLabel: string }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between"><h2 className="text-lg font-black text-[#1A2E26]">{title}</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-[#6B7280]" /></button></div>
        <div className="p-5 space-y-4">{children}</div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2">
          <button onClick={onSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {saveLabel}</button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  )
}
