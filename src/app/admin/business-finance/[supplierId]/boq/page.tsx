'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Table2, ChevronLeft, Loader2, Plus, X, RefreshCw, Trash2, FolderKanban } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money = (n: any) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')

const emptyForm = { item_no: '', section: '', description: '', unit: '', quantity: '', unit_price: '' }

export default function BoqPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    (async () => {
      setLoading(true)
      // @ts-expect-error
      const { data: list } = await supabase.from('bz_projects').select('id, code, name, contract_value, supervision_pct').eq('supplier_id', supplierId).order('created_at', { ascending: false })
      setProjects(list || [])
      const urlP = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('project') : null
      setProjectId(urlP && (list || []).some((p: any) => p.id === urlP) ? urlP : ((list || [])[0]?.id || ''))
      setLoading(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [supplierId])

  async function loadItems(pid: string) {
    if (!pid) { setItems([]); return }
    // @ts-expect-error
    const { data } = await supabase.from('bz_boq_items').select('*').eq('project_id', pid).order('sort_order').order('created_at')
    setItems(data || [])
  }
  useEffect(() => { loadItems(projectId) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId])

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId])
  const total = items.reduce((s, i) => s + num(i.amount), 0)
  const totalExecuted = items.reduce((s, i) => s + num(i.executed_qty) * num(i.unit_price), 0)
  const execPct = total > 0 ? (totalExecuted / total) * 100 : 0
  const supervisionPct = num(project?.supervision_pct ?? 5)
  const supervisionVal = total * supervisionPct / 100
  const totalWithSupervision = total + supervisionVal

  function setExec(id: string, val: string) { setItems((prev) => prev.map((x) => x.id === id ? { ...x, executed_qty: val } : x)) }
  async function saveExec(it: any) {
    // @ts-expect-error
    await supabase.from('bz_boq_items').update({ executed_qty: num(it.executed_qty) }).eq('id', it.id)
  }

  async function save() {
    if (!project) return
    if (!form.description.trim()) { alert('اكتب وصف البند'); return }
    setSaving(true)
    // @ts-expect-error
    await supabase.from('bz_boq_items').insert({
      supplier_id: supplierId, project_id: project.id,
      item_no: form.item_no.trim() || null, section: form.section.trim() || null,
      description: form.description.trim(), unit: form.unit.trim() || null,
      quantity: num(form.quantity), unit_price: num(form.unit_price), sort_order: items.length,
    })
    setSaving(false); setShowForm(false); setForm({ ...emptyForm }); loadItems(projectId)
  }
  async function remove(it: any) {
    if (!confirm('حذف البند؟')) return
    // @ts-expect-error
    await supabase.from('bz_boq_items').delete().eq('id', it.id); loadItems(projectId)
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">مقاولات · جدول الكميات</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><Table2 className="w-7 h-7 text-[#1F6F5F]" /> جدول الكميات (BOQ)</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="text-sm font-bold text-[#1A2E26] bg-white border border-gray-200 rounded-xl px-4 py-2 max-w-[220px]">
                {projects.length === 0 && <option value="">لا توجد مشاريع</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </select>
              <button onClick={() => { setForm({ ...emptyForm }); setShowForm(true) }} disabled={!project} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> بند جديد</button>
              <button onClick={() => loadItems(projectId)} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {!project ? (
          <Empty supplierId={supplierId} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Stat label="عدد البنود" value={String(items.length)} />
              <Stat label="إجمالي الجدول" value={`${money0(total)} ج`} />
              <Stat label={`قيمة الإشراف (${supervisionPct}%)`} value={`${money0(supervisionVal)} ج`} />
              <Stat label="الإجمالي شامل الإشراف" value={`${money0(totalWithSupervision)} ج`} primary />
              <Stat label="قيمة المنفّذ" value={`${money0(totalExecuted)} ج`} />
              <Stat label="نسبة التنفيذ" value={`${execPct.toFixed(1)}%`} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-[#6B7280]">نسبة تنفيذ الأعمال (بالقيمة)</span><span className="text-lg font-black text-[#1F6F5F]">{execPct.toFixed(1)}%</span></div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-l from-[#2FA084] to-[#1F6F5F] rounded-full transition-all" style={{ width: `${Math.min(execPct, 100)}%` }} /></div>
            </div>

            {items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><Table2 className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">لسه مفيش بنود — ابدأ بإضافة بنود الأعمال</p></div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right">
                    <tr><Th>كود</Th><Th>البند</Th><Th>الوحدة</Th><Th className="text-left">الكمية</Th><Th className="text-left">سعر الوحدة</Th><Th className="text-left">الإجمالي</Th><Th className="text-center">منفّذ (كمية)</Th><Th className="text-left">نسبة</Th><Th className="text-left">قيمة منفّذة</Th><Th></Th></tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const qty = num(it.quantity)
                      const exQ = num(it.executed_qty)
                      const itemPct = qty > 0 ? (exQ / qty) * 100 : 0
                      const exVal = exQ * num(it.unit_price)
                      return (
                        <tr key={it.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                          <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono">{it.item_no || '—'}</td>
                          <td className="px-3 py-2.5">
                            <p className="text-[#1A2E26] font-bold">{it.description}</p>
                            {it.section && <p className="text-[10px] text-[#6B7280]">{it.section}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-[#6B7280]">{it.unit || '—'}</td>
                          <td className="px-3 py-2.5 text-left font-mono text-[#1A2E26]">{money0(it.quantity)}</td>
                          <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{money0(it.unit_price)}</td>
                          <td className="px-3 py-2.5 text-left font-mono font-black text-[#1F6F5F]">{money0(it.amount)}</td>
                          <td className="px-3 py-2.5 text-center"><input type="number" value={it.executed_qty ?? ''} onChange={(e) => setExec(it.id, e.target.value)} onBlur={() => saveExec(it)} className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-xs text-center font-mono focus:outline-none focus:border-[#1F6F5F]" /></td>
                          <td className="px-3 py-2.5 text-left font-mono text-xs font-bold" ><span className={itemPct >= 100 ? 'text-[#1F6F5F]' : 'text-[#6B7280]'}>{itemPct.toFixed(0)}%</span></td>
                          <td className="px-3 py-2.5 text-left font-mono text-[#2FA084]">{money0(exVal)}</td>
                          <td className="px-3 py-2.5"><button onClick={() => remove(it)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#FAFAF7] border-t-2 border-[#1F6F5F]/20">
                      <td colSpan={5} className="px-3 py-3 text-left font-black text-[#1A2E26]">الإجمالي</td>
                      <td className="px-3 py-3 text-left font-mono font-black text-[#1F6F5F]">{money0(total)}</td>
                      <td colSpan={2} className="px-3 py-3 text-left font-black text-[#1A2E26]">المنفّذ ({execPct.toFixed(1)}%)</td>
                      <td className="px-3 py-3 text-left font-mono font-black text-[#2FA084]">{money0(totalExecuted)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-[#FAFAF7]">
                      <td colSpan={5} className="px-3 py-2 text-left font-bold text-[#6B7280]">(+) نسبة الإشراف ({supervisionPct}%)</td>
                      <td className="px-3 py-2 text-left font-mono font-bold text-[#1A2E26]">{money0(supervisionVal)}</td>
                      <td colSpan={4}></td>
                    </tr>
                    <tr className="bg-[#FAFAF7] border-t border-[#1F6F5F]/20">
                      <td colSpan={5} className="px-3 py-3 text-left font-black text-[#1A2E26]">الإجمالي شامل الإشراف</td>
                      <td className="px-3 py-3 text-left font-mono font-black text-[#1F6F5F]">{money0(totalWithSupervision)}</td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {showForm && project && (
        <Modal title="بند جديد" onClose={() => setShowForm(false)} onSave={save} saving={saving} saveLabel="إضافة البند">
          <div className="grid grid-cols-2 gap-3">
            <Field label="كود البند"><input value={form.item_no} onChange={(e) => setForm({ ...form, item_no: e.target.value })} className={inputCls} placeholder="1.1" /></Field>
            <Field label="البند الرئيسي"><input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className={inputCls} placeholder="أعمال خرسانة" /></Field>
          </div>
          <Field label="وصف البند *"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="صب خرسانة مسلحة للأساسات" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="الوحدة"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls} placeholder="م٣" /></Field>
            <Field label="الكمية"><input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} /></Field>
            <Field label="سعر الوحدة"><input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="rounded-xl bg-[#FAFAF7] p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B7280]">إجمالي البند</span>
            <span className="text-lg font-black text-[#1F6F5F] font-mono">{money(num(form.quantity) * num(form.unit_price))} ج</span>
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
