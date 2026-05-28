'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { HardHat, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, Pencil, Phone, FolderKanban } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')

const STATUSES = [
  { value: 'active',     label: 'شغّال',  color: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
  { value: 'completed',  label: 'مكتمل',  color: 'bg-blue-50 text-blue-700' },
  { value: 'terminated', label: 'منتهي',  color: 'bg-gray-100 text-gray-600' },
]
const sm = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]
const emptyForm = { id: null as string | null, name: '', scope: '', contract_value: '', paid_to_date: '', phone: '', status: 'active', notes: '' }

export default function SubcontractorsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    (async () => {
      setLoading(true)
      // @ts-expect-error
      const { data: list } = await supabase.from('bz_projects').select('id, code, name').eq('supplier_id', supplierId).order('created_at', { ascending: false })
      setProjects(list || [])
      const urlP = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('project') : null
      setProjectId(urlP && (list || []).some((p: any) => p.id === urlP) ? urlP : ((list || [])[0]?.id || ''))
      setLoading(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [supplierId])

  async function loadRows(pid: string) {
    if (!pid) { setRows([]); return }
    // @ts-expect-error
    const { data } = await supabase.from('bz_subcontractors').select('*').eq('project_id', pid).order('created_at', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => { loadRows(projectId) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId])

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId])
  const totalContract = rows.reduce((s, r) => s + num(r.contract_value), 0)
  const totalPaid = rows.reduce((s, r) => s + num(r.paid_to_date), 0)

  function openAdd() { setForm({ ...emptyForm }); setShowForm(true) }
  function openEdit(r: any) { setForm({ id: r.id, name: r.name || '', scope: r.scope || '', contract_value: String(r.contract_value ?? ''), paid_to_date: String(r.paid_to_date ?? ''), phone: r.phone || '', status: r.status || 'active', notes: r.notes || '' }); setShowForm(true) }

  async function save() {
    if (!project) return
    if (!form.name.trim()) { alert('اكتب اسم المقاول'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId, project_id: project.id, name: form.name.trim(), scope: form.scope.trim() || null,
      contract_value: num(form.contract_value), paid_to_date: num(form.paid_to_date), phone: form.phone.trim() || null,
      status: form.status, notes: form.notes.trim() || null,
    }
    if (form.id) {
      // @ts-expect-error
      await supabase.from('bz_subcontractors').update(payload).eq('id', form.id)
    } else {
      // @ts-expect-error
      await supabase.from('bz_subcontractors').insert(payload)
    }
    setSaving(false); setShowForm(false); loadRows(projectId)
  }
  async function remove(r: any) {
    if (!confirm('حذف المقاول؟')) return
    // @ts-expect-error
    await supabase.from('bz_subcontractors').delete().eq('id', r.id)
    loadRows(projectId)
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">مقاولات · مقاولي الباطن</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><HardHat className="w-7 h-7 text-[#1F6F5F]" /> مقاولي الباطن</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="text-sm font-bold text-[#1A2E26] bg-white border border-gray-200 rounded-xl px-4 py-2 max-w-[220px]">
                {projects.length === 0 && <option value="">لا توجد مشاريع</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </select>
              <button onClick={openAdd} disabled={!project} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> مقاول جديد</button>
              <button onClick={() => loadRows(projectId)} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {!project ? <Empty supplierId={supplierId} /> : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="إجمالي التعاقدات" value={`${money0(totalContract)} ج`} />
              <Stat label="المدفوع" value={`${money0(totalPaid)} ج`} />
              <Stat label="المتبقّي" value={`${money0(totalContract - totalPaid)} ج`} primary />
            </div>

            {rows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><HardHat className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش مقاولي باطن للمشروع ده</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rows.map((r) => {
                  const remaining = num(r.contract_value) - num(r.paid_to_date)
                  const pct = num(r.contract_value) > 0 ? Math.min(100, (num(r.paid_to_date) / num(r.contract_value)) * 100) : 0
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-base font-black text-[#1A2E26] leading-tight">{r.name}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${sm(r.status).color}`}>{sm(r.status).label}</span>
                      </div>
                      {r.scope && <p className="text-xs text-[#6B7280] mb-1">{r.scope}</p>}
                      {r.phone && <p className="text-xs text-[#6B7280] flex items-center gap-1 mb-3"><Phone className="w-3 h-3" /> {r.phone}</p>}
                      <div className="space-y-1 text-xs">
                        <Row label="قيمة التعاقد" value={r.contract_value} />
                        <Row label="المدفوع" value={r.paid_to_date} />
                        <Row label="المتبقّي" value={remaining} bold />
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-3"><div className="h-full bg-[#1F6F5F] rounded-full" style={{ width: `${pct}%` }} /></div>
                      <div className="flex items-center gap-2 mt-4">
                        <button onClick={() => openEdit(r)} className="flex-1 px-3 py-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-gray-100"><Pencil className="w-3.5 h-3.5" /> تعديل / دفعة</button>
                        <button onClick={() => remove(r)} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      {showForm && project && (
        <Modal title={form.id ? 'تعديل مقاول' : 'مقاول باطن جديد'} onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel={form.id ? 'حفظ' : 'إضافة'}>
          <Field label="اسم المقاول *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
          <Field label="نطاق الأعمال"><input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className={inputCls} placeholder="أعمال كهرباء / سباكة..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="قيمة التعاقد (ج)"><input type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} className={inputCls} /></Field>
            <Field label="المدفوع حتى الآن (ج)"><input type="number" value={form.paid_to_date} onChange={(e) => setForm({ ...form, paid_to_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="التليفون"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
            <Field label="الحالة"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          </div>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} /></Field>
        </Modal>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] bg-white'
function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>{children}</div> }
function Row({ label, value, bold }: { label: string; value: any; bold?: boolean }) { return <div className="flex items-center justify-between"><span className="text-[#6B7280]">{label}</span><span className={`font-mono ${bold ? 'font-black text-[#1F6F5F] text-sm' : 'text-[#1A2E26]'}`}>{money0(value)} ج</span></div> }
function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-lg md:text-xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p></div>
}
function Empty({ supplierId }: { supplierId: string }) {
  return <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><FolderKanban className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" /><p className="text-sm font-bold text-[#1A2E26]">مفيش مشاريع لسه</p><Link href={`/admin/business-finance/${supplierId}/projects`} className="mt-4 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold inline-flex items-center gap-2"><FolderKanban className="w-4 h-4" /> روح للمشاريع</Link></div>
}
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
