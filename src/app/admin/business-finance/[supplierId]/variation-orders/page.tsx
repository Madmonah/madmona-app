'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { GitBranchPlus, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, FolderKanban } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')

const STATUSES = [
  { value: 'pending',  label: 'قيد المراجعة', color: 'bg-amber-50 text-amber-700' },
  { value: 'approved', label: 'معتمد',         color: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
  { value: 'rejected', label: 'مرفوض',         color: 'bg-red-50 text-red-600' },
]
const sm = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]
const emptyForm = { vo_no: '', description: '', amount: '', status: 'pending', vo_date: '' }

export default function VariationOrdersPage({ params }: { params: { supplierId: string } }) {
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
      const { data: list } = await supabase.from('bz_projects').select('id, code, name, contract_value').eq('supplier_id', supplierId).order('created_at', { ascending: false })
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
    const { data } = await supabase.from('bz_variation_orders').select('*').eq('project_id', pid).order('created_at', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => { loadRows(projectId) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId])

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId])
  const approvedTotal = rows.filter((r) => r.status === 'approved').reduce((s, r) => s + num(r.amount), 0)
  const adjustedValue = num(project?.contract_value) + approvedTotal

  async function save() {
    if (!project) return
    if (!form.description.trim()) { alert('اكتب وصف الأمر'); return }
    setSaving(true)
    // @ts-expect-error
    await supabase.from('bz_variation_orders').insert({
      supplier_id: supplierId, project_id: project.id,
      vo_no: form.vo_no.trim() || 'VO-' + String(rows.length + 1).padStart(3, '0'),
      description: form.description.trim(), amount: num(form.amount),
      status: form.status, vo_date: form.vo_date || null,
    })
    setSaving(false); setShowForm(false); setForm({ ...emptyForm }); loadRows(projectId)
  }
  async function setStatus(r: any, status: string) {
    // @ts-expect-error
    await supabase.from('bz_variation_orders').update({ status }).eq('id', r.id); loadRows(projectId)
  }
  async function remove(r: any) {
    if (!confirm('حذف الأمر؟')) return
    // @ts-expect-error
    await supabase.from('bz_variation_orders').delete().eq('id', r.id)
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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">مقاولات · أوامر التغيير</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><GitBranchPlus className="w-7 h-7 text-[#1F6F5F]" /> أوامر التغيير</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="text-sm font-bold text-[#1A2E26] bg-white border border-gray-200 rounded-xl px-4 py-2 max-w-[220px]">
                {projects.length === 0 && <option value="">لا توجد مشاريع</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </select>
              <button onClick={() => { setForm({ ...emptyForm }); setShowForm(true) }} disabled={!project} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> أمر تغيير</button>
              <button onClick={() => loadRows(projectId)} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {!project ? <Empty supplierId={supplierId} /> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Stat label="قيمة التعاقد الأصلية" value={`${money0(project.contract_value)} ج`} />
              <Stat label="صافي أوامر التغيير المعتمدة" value={`${money0(approvedTotal)} ج`} />
              <Stat label="القيمة بعد التعديل" value={`${money0(adjustedValue)} ج`} primary />
            </div>

            {rows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><GitBranchPlus className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش أوامر تغيير للمشروع ده</p></div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>رقم</Th><Th>الوصف</Th><Th>التاريخ</Th><Th className="text-left">القيمة</Th><Th>الحالة</Th><Th></Th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                        <td className="px-3 py-2.5 font-black text-[#1A2E26]">{r.vo_no}</td>
                        <td className="px-3 py-2.5 text-[#1A2E26] max-w-xs">{r.description}</td>
                        <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono">{r.vo_date ? new Date(r.vo_date).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td className={`px-3 py-2.5 text-left font-mono font-black ${num(r.amount) < 0 ? 'text-red-600' : 'text-[#1F6F5F]'}`}>{money0(r.amount)} ج</td>
                        <td className="px-3 py-2.5"><select value={r.status} onChange={(e) => setStatus(r, e.target.value)} className={`text-[10px] font-bold rounded-md px-2 py-1 border-0 ${sm(r.status).color}`}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                        <td className="px-3 py-2.5"><button onClick={() => remove(r)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {showForm && project && (
        <Modal title="أمر تغيير جديد" onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel="إضافة الأمر">
          <div className="grid grid-cols-2 gap-3">
            <Field label="رقم الأمر"><input value={form.vo_no} onChange={(e) => setForm({ ...form, vo_no: e.target.value })} className={inputCls} placeholder="تلقائي VO-001" /></Field>
            <Field label="التاريخ"><input type="date" value={form.vo_date} onChange={(e) => setForm({ ...form, vo_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="الوصف *"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={2} placeholder="إضافة دور إضافي / تعديل تشطيبات..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="القيمة (ج)"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="ممكن سالب للخصم" /></Field>
            <Field label="الحالة"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] bg-white'
function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>{children}</div> }
function Th({ children, className = '' }: { children?: ReactNode; className?: string }) { return <th className={`px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase text-[#6B7280] ${className}`}>{children}</th> }
function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-xl md:text-2xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p></div>
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
