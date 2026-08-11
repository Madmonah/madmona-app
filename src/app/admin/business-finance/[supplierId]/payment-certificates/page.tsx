'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ScrollText, ChevronLeft, Loader2, Plus, X, RefreshCw,
  FolderKanban, Calculator, Trash2, Eye, FileText,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const WITHHOLDING_PCT = 1       // خصم وحجز تحت حساب الضريبة
const STAMP_RATE = 0.0008       // دمغة نسبية

const STATUSES = [
  { value: 'draft',     label: 'مسودة',   color: 'bg-gray-100 text-gray-600' },
  { value: 'submitted', label: 'مُقدّم',   color: 'bg-amber-50 text-amber-700' },
  { value: 'approved',  label: 'معتمد',   color: 'bg-blue-50 text-blue-700' },
  { value: 'paid',      label: 'مدفوع',   color: 'bg-[#FA8125]/10 text-[#FA8125]' },
]
const statusMeta = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]

const num = (v: any) => Number(v) || 0
const money = (n: any) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')

// ============ منطق حساب المستخلص ============
function calcCertificate(project: any, inp: any, previousNet: number) {
  const supervision_pct = num(project?.supervision_pct)
  const supervision_amount = (num(inp.work_done_amount) + num(inp.vo_amount)) * supervision_pct / 100  // إشراف على الأعمال المنفذة + الأوامر التغييرية
  const gross = num(inp.work_done_amount) + num(inp.materials_onsite) + num(inp.vo_amount) + num(inp.price_adjustment) + supervision_amount
  const retention_pct = num(project?.retention_pct)
  const advance_pct = num(project?.advance_pct)
  const vat_pct = num(project?.vat_pct)

  const retention_amount = gross * retention_pct / 100        // محتجز ضمان (تراكمي)
  const advance_recovery = gross * advance_pct / 100          // استرداد الدفعة المقدمة (تراكمي)
  const net_cumulative = gross - retention_amount - advance_recovery
  const net_this_cert = net_cumulative - previousNet         // صافي المستخلص الحالي

  const vat_amount = net_this_cert * vat_pct / 100           // ق.م (تُضاف)
  const withholding_tax = net_this_cert * WITHHOLDING_PCT / 100  // خصم وإضافة (يُخصم)
  const stamp_tax = net_this_cert * STAMP_RATE                   // دمغة (تُخصم)
  const net_payable = net_this_cert + vat_amount - withholding_tax - stamp_tax

  return {
    gross_cumulative: gross, retention_amount, advance_recovery, net_cumulative,
    previous_net: previousNet, net_this_cert, vat_amount, withholding_tax, stamp_tax, net_payable,
    retention_pct, advance_pct, vat_pct, withholding_pct: WITHHOLDING_PCT, stamp_rate: STAMP_RATE,
    supervision_pct, supervision_amount,
  }
}

const emptyForm = {
  period_from: '', period_to: '',
  work_done_amount: '', materials_onsite: '', vo_amount: '', price_adjustment: '',
  notes: '',
}

export default function PaymentCertificatesPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [certs, setCerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [detail, setDetail] = useState<any>(null)

  // initial load: supplier + projects (+ preselect project from ?project=)
  useEffect(() => {
    (async () => {
      setLoading(true)
      // @ts-expect-error
      const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
      setSupplier(s)
      // @ts-expect-error
      const { data: list } = await supabase.from('bz_projects').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
      setProjects(list || [])
      const urlProject = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('project') : null
      const initial = urlProject && (list || []).some((p: any) => p.id === urlProject) ? urlProject : ((list || [])[0]?.id || '')
      setProjectId(initial)
      setLoading(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [supplierId])

  async function loadCerts(pid: string) {
    if (!pid) { setCerts([]); return }
    // @ts-expect-error
    const { data } = await supabase.from('bz_payment_certificates').select('*').eq('project_id', pid).order('seq', { ascending: false })
    setCerts(data || [])
  }
  useEffect(() => { loadCerts(projectId) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId])

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId])
  const previousNet = certs.length ? num(certs[0].net_cumulative) : 0   // certs مرتبة تنازلي بالـ seq
  const livePreview = useMemo(() => calcCertificate(project, form, previousNet), [project, form, previousNet])

  const totalCertified = certs.reduce((s, c) => s + num(c.net_this_cert), 0)
  const pctCertified = project && num(project.contract_value) > 0 ? (totalCertified / num(project.contract_value)) * 100 : 0

  async function save() {
    if (!project) { alert('اختار المشروع الأول'); return }
    if (num(form.work_done_amount) <= 0 && num(form.materials_onsite) <= 0) { alert('اكتب قيمة الأعمال المنفذة'); return }
    setSaving(true)
    const c = calcCertificate(project, form, previousNet)
    const seq = certs.length + 1
    const payload: any = {
      supplier_id: supplierId,
      project_id: project.id,
      cert_no: 'IPC-' + String(seq).padStart(3, '0'),
      seq,
      period_from: form.period_from || null,
      period_to: form.period_to || null,
      work_done_amount: num(form.work_done_amount),
      materials_onsite: num(form.materials_onsite),
      vo_amount: num(form.vo_amount),
      price_adjustment: num(form.price_adjustment),
      ...c,
      status: 'draft',
      notes: form.notes.trim() || null,
    }
    // @ts-expect-error
    await supabase.from('bz_payment_certificates').insert(payload)
    setSaving(false)
    setShowForm(false)
    setForm({ ...emptyForm })
    loadCerts(projectId)
  }

  async function setStatus(cert: any, status: string) {
    // @ts-expect-error
    await supabase.from('bz_payment_certificates').update({ status }).eq('id', cert.id)
    loadCerts(projectId)
  }
  async function remove(cert: any) {
    if (!confirm(`متأكد تمسح المستخلص ${cert.cert_no}؟`)) return
    // @ts-expect-error
    await supabase.from('bz_payment_certificates').delete().eq('id', cert.id)
    loadCerts(projectId)
  }

  if (loading && !supplier) {
    return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">مقاولات · المستخلصات</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2">
                <ScrollText className="w-7 h-7 text-[#FA8125]" /> المستخلصات
              </h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="text-sm font-bold text-[#1A2E26] bg-white border border-gray-200 rounded-xl px-4 py-2 max-w-[220px]">
                {projects.length === 0 && <option value="">لا توجد مشاريع</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </select>
              <button onClick={() => { setForm({ ...emptyForm }); setShowForm(true) }} disabled={!project} className="px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 hover:shadow-md transition-shadow">
                <Plus className="w-4 h-4" /> مستخلص جديد
              </button>
              <button onClick={() => loadCerts(projectId)} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {!project ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <FolderKanban className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش مشاريع لسه</p>
            <p className="text-xs text-[#6B7280] mt-1">اعمل مشروع الأول من تاب «المشاريع» وبعدين تقدر تعمله مستخلصات</p>
            <Link href={`/admin/business-finance/${supplierId}/projects`} className="mt-4 px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold inline-flex items-center gap-2">
              <FolderKanban className="w-4 h-4" /> روح للمشاريع
            </Link>
          </div>
        ) : (
          <>
            {/* Project summary */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="قيمة التعاقد" value={`${money0(project.contract_value)} ج`} />
              <Stat label="إجمالي المستخلَص (صافي)" value={`${money0(totalCertified)} ج`} primary />
              <Stat label="نسبة الصرف" value={`${pctCertified.toFixed(1)}%`} />
              <Stat label="عدد المستخلصات" value={`${certs.length}`} />
            </section>

            {/* Certs table */}
            {certs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <ScrollText className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">لسه مفيش مستخلصات للمشروع ده</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right">
                    <tr>
                      <Th>المستخلص</Th><Th>الفترة</Th><Th className="text-left">إجمالي تراكمي</Th>
                      <Th className="text-left">صافي الحالي</Th><Th className="text-left">ق.م</Th>
                      <Th className="text-left">المستحق صرفه</Th><Th>الحالة</Th><Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {certs.map((c) => {
                      const sm = statusMeta(c.status)
                      return (
                        <tr key={c.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                          <td className="px-3 py-2.5 font-black text-[#1A2E26]">{c.cert_no}</td>
                          <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono whitespace-nowrap">
                            {c.period_from ? new Date(c.period_from).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }) : '—'}
                            {' → '}
                            {c.period_to ? new Date(c.period_to).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-left font-mono text-[#1A2E26]">{money0(c.gross_cumulative)}</td>
                          <td className="px-3 py-2.5 text-left font-mono text-[#1A2E26]">{money0(c.net_this_cert)}</td>
                          <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{money0(c.vat_amount)}</td>
                          <td className="px-3 py-2.5 text-left font-mono font-black text-[#FA8125]">{money0(c.net_payable)} ج</td>
                          <td className="px-3 py-2.5">
                            <select value={c.status} onChange={(e) => setStatus(c, e.target.value)} className={`text-[10px] font-bold rounded-md px-2 py-1 border-0 ${sm.color}`}>
                              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setDetail(c)} className="p-1.5 rounded-lg bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100" title="تفاصيل"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => remove(c)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* New certificate modal */}
      {showForm && project && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#1A2E26] flex items-center gap-2"><Calculator className="w-5 h-5 text-[#FA8125]" /> مستخلص جديد · {project.name}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-[#6B7280]" /></button>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-5">
              {/* Inputs */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="من تاريخ"><input type="date" value={form.period_from} onChange={(e) => setForm({ ...form, period_from: e.target.value })} className={inputCls} /></Field>
                  <Field label="إلى تاريخ"><input type="date" value={form.period_to} onChange={(e) => setForm({ ...form, period_to: e.target.value })} className={inputCls} /></Field>
                </div>
                <Field label="قيمة الأعمال المنفذة (تراكمي)"><input type="number" value={form.work_done_amount} onChange={(e) => setForm({ ...form, work_done_amount: e.target.value })} className={inputCls} placeholder="0" /></Field>
                <Field label="مواد بالموقع"><input type="number" value={form.materials_onsite} onChange={(e) => setForm({ ...form, materials_onsite: e.target.value })} className={inputCls} placeholder="0" /></Field>
                <Field label="أوامر تغييرية (VO)"><input type="number" value={form.vo_amount} onChange={(e) => setForm({ ...form, vo_amount: e.target.value })} className={inputCls} placeholder="0" /></Field>
                <Field label="فروق أسعار / تعويضات"><input type="number" value={form.price_adjustment} onChange={(e) => setForm({ ...form, price_adjustment: e.target.value })} className={inputCls} placeholder="0" /></Field>
                <Field label="ملاحظات"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} /></Field>
              </div>

              {/* Live breakdown */}
              <div className="bg-[#FAFAF7] rounded-2xl p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1"><Calculator className="w-3.5 h-3.5" /> حساب المستخلص (تلقائي)</p>
                <CalcRow label={`(+) نسبة الإشراف ${livePreview.supervision_pct}%`} value={livePreview.supervision_amount} />
                <CalcRow label="الإجمالي التراكمي (شامل الإشراف)" value={livePreview.gross_cumulative} bold />
                <CalcRow label={`(−) محتجز ضمان ${livePreview.retention_pct}%`} value={-livePreview.retention_amount} />
                <CalcRow label={`(−) استرداد دفعة مقدمة ${livePreview.advance_pct}%`} value={-livePreview.advance_recovery} />
                <CalcRow label="= الصافي التراكمي" value={livePreview.net_cumulative} divider />
                <CalcRow label="(−) صافي المستخلصات السابقة" value={-livePreview.previous_net} />
                <CalcRow label="= صافي المستخلص الحالي" value={livePreview.net_this_cert} bold divider />
                <CalcRow label={`(+) ق.م ${livePreview.vat_pct}%`} value={livePreview.vat_amount} />
                <CalcRow label={`(−) خصم وإضافة ${livePreview.withholding_pct}%`} value={-livePreview.withholding_tax} />
                <CalcRow label="(−) دمغة" value={-livePreview.stamp_tax} />
                <div className="mt-3 pt-3 border-t-2 border-[#FA8125]/20 flex items-center justify-between">
                  <span className="text-sm font-black text-[#1A2E26]">المستحق صرفه</span>
                  <span className="text-xl font-black text-[#FA8125] font-mono">{money(livePreview.net_payable)} <span className="text-xs">ج</span></span>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} اعتماد وحفظ المستخلص
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setDetail(null)}>
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#1A2E26] flex items-center gap-2"><FileText className="w-5 h-5 text-[#FA8125]" /> {detail.cert_no}</h2>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-[#6B7280]" /></button>
            </div>
            <div className="p-5">
              <div className="bg-[#FAFAF7] rounded-2xl p-4">
                <CalcRow label="قيمة الأعمال المنفذة" value={detail.work_done_amount} />
                <CalcRow label="مواد بالموقع" value={detail.materials_onsite} />
                <CalcRow label="أوامر تغييرية" value={detail.vo_amount} />
                <CalcRow label="فروق أسعار" value={detail.price_adjustment} />
                {num(detail.supervision_amount) > 0 && <CalcRow label={`(+) نسبة الإشراف ${detail.supervision_pct ?? 0}%`} value={num(detail.supervision_amount)} />}
                <CalcRow label="الإجمالي التراكمي (شامل الإشراف)" value={detail.gross_cumulative} bold divider />
                <CalcRow label={`(−) محتجز ضمان ${detail.retention_pct}%`} value={-num(detail.retention_amount)} />
                <CalcRow label={`(−) استرداد دفعة مقدمة ${detail.advance_pct}%`} value={-num(detail.advance_recovery)} />
                <CalcRow label="= الصافي التراكمي" value={detail.net_cumulative} divider />
                <CalcRow label="(−) صافي المستخلصات السابقة" value={-num(detail.previous_net)} />
                <CalcRow label="= صافي المستخلص الحالي" value={detail.net_this_cert} bold divider />
                <CalcRow label={`(+) ق.م ${detail.vat_pct}%`} value={num(detail.vat_amount)} />
                <CalcRow label={`(−) خصم وإضافة ${detail.withholding_pct}%`} value={-num(detail.withholding_tax)} />
                <CalcRow label="(−) دمغة" value={-num(detail.stamp_tax)} />
                <div className="mt-3 pt-3 border-t-2 border-[#FA8125]/20 flex items-center justify-between">
                  <span className="text-sm font-black text-[#1A2E26]">المستحق صرفه</span>
                  <span className="text-xl font-black text-[#FA8125] font-mono">{money(detail.net_payable)} <span className="text-xs">ج</span></span>
                </div>
              </div>
              {detail.notes && <p className="text-xs text-[#6B7280] mt-3 leading-relaxed">📝 {detail.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#FA8125] bg-white'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>{children}</div>
}

function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#FA8125] border-[#FA8125] text-white' : 'bg-white border-gray-100'}`}>
      <p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p>
      <p className={`text-xl md:text-2xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p>
    </div>
  )
}

function CalcRow({ label, value, bold, divider }: { label: string; value: number; bold?: boolean; divider?: boolean }) {
  const neg = value < 0
  return (
    <div className={`flex items-center justify-between py-1 text-xs ${divider ? 'mt-1 pt-2 border-t border-gray-200' : ''}`}>
      <span className={`${bold ? 'font-black text-[#1A2E26]' : 'text-[#6B7280]'}`}>{label}</span>
      <span className={`font-mono ${bold ? 'font-black text-[#1A2E26]' : neg ? 'text-red-600' : 'text-[#1A2E26]'}`}>
        {neg ? '−' : ''}{money(Math.abs(value))}
      </span>
    </div>
  )
}
