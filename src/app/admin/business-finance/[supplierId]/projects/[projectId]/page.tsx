'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, RefreshCw, Building2, MapPin, User, Table2, ScrollText,
  GitBranchPlus, ShieldCheck, HardHat, FileText, Plus, X, Trash2, ExternalLink, TrendingUp,
  Briefcase, Coins, HandCoins, Wrench,
  Receipt, Banknote, CalendarRange, ClipboardList, PackageOpen, ClipboardCheck,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned:    { label: 'مخطط',      color: 'bg-gray-100 text-gray-600' },
  active:     { label: 'جاري التنفيذ', color: 'bg-[#34D399]/10 text-[#059669]' },
  on_hold:    { label: 'متوقف',     color: 'bg-amber-50 text-amber-700' },
  completed:  { label: 'مكتمل',     color: 'bg-blue-50 text-blue-700' },
  cancelled:  { label: 'ملغي',      color: 'bg-red-50 text-red-600' },
}
const DOC_TYPES = [
  { value: 'contract', label: 'عقد' }, { value: 'license', label: 'رخصة' }, { value: 'drawing', label: 'مخطط' },
  { value: 'guarantee', label: 'ضمان' }, { value: 'permit', label: 'تصريح' }, { value: 'other', label: 'أخرى' },
]
const docLabel = (t: string) => DOC_TYPES.find((d) => d.value === t)?.label || 'أخرى'

export default function ProjectDetailPage({ params }: { params: { supplierId: string; projectId: string } }) {
  const { supplierId, projectId } = params
  const [project, setProject] = useState<any>(null)
  const [agg, setAgg] = useState({ boq: 0, voApproved: 0, certNet: 0, certGross: 0, certCount: 0, certPayable: 0, guarActive: 0, guarSum: 0, subContract: 0, subPaid: 0, asgCount: 0, asgAllowance: 0, cusOutstanding: 0, advOutstanding: 0, eqCount: 0, expenses: 0, collected: 0, equipCost: 0, mileCount: 0, mileProgress: 0, drCount: 0, mrCount: 0, inspCount: 0 })
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDoc, setShowDoc] = useState(false)
  const [docForm, setDocForm] = useState({ name: '', doc_type: 'other', url: '', notes: '' })
  const [savingDoc, setSavingDoc] = useState(false)

  async function load() {
    setLoading(true)
    const { data: p } = await supabase.from('bz_projects').select('*').eq('id', projectId).eq('supplier_id', supplierId).single()
    setProject(p || null)

    const { data: boq } = await supabase.from('bz_boq_items').select('amount').eq('project_id', projectId)
    const { data: vos } = await supabase.from('bz_variation_orders').select('amount, status').eq('project_id', projectId)
    const { data: certs } = await supabase.from('bz_payment_certificates').select('net_cumulative, gross_cumulative, net_payable, seq').eq('project_id', projectId).order('seq', { ascending: false })
    const { data: guars } = await supabase.from('bz_guarantees').select('amount, status').eq('project_id', projectId)
    const { data: subs } = await supabase.from('bz_subcontractors').select('contract_value, paid_to_date').eq('project_id', projectId)
    const { data: asg } = await supabase.from('bz_assignments').select('allowance_amount').eq('project_id', projectId)
    const { data: cus } = await supabase.from('bz_custody').select('amount, settled_amount, status').eq('project_id', projectId)
    const { data: adv } = await supabase.from('bz_advances').select('amount, repaid_amount, status').eq('project_id', projectId)
    const { data: eq } = await supabase.from('bz_equipment').select('id').eq('project_id', projectId)
    const { data: dlist } = await supabase.from('bz_project_documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    const { data: exp } = await supabase.from('bz_expenses').select('amount').eq('project_id', projectId)
    const { data: cols } = await supabase.from('bz_collections').select('amount').eq('project_id', projectId)
    const { data: miles } = await supabase.from('bz_milestones').select('weight_pct, status').eq('project_id', projectId)
    const { data: dreports } = await supabase.from('bz_daily_reports').select('id').eq('project_id', projectId)
    const { data: mreqs } = await supabase.from('bz_material_requests').select('id').eq('project_id', projectId)
    const { data: insps } = await supabase.from('bz_inspections').select('id').eq('project_id', projectId)
    const eqIds = (eq || []).map((e: any) => e.id)
    let equipCost = 0
    if (eqIds.length > 0) {
      const { data: eqlogs } = await supabase.from('bz_equipment_logs').select('cost').in('equipment_id', eqIds)
      equipCost = (eqlogs || []).reduce((s: number, l: any) => s + num(l.cost), 0)
    }
    const mileTotalW = (miles || []).reduce((s: number, m: any) => s + num(m.weight_pct), 0)
    const mileDoneW = (miles || []).filter((m: any) => m.status === 'done').reduce((s: number, m: any) => s + num(m.weight_pct), 0)

    setAgg({
      boq: (boq || []).reduce((s: number, i: any) => s + num(i.amount), 0),
      voApproved: (vos || []).filter((v: any) => v.status === 'approved').reduce((s: number, v: any) => s + num(v.amount), 0),
      certNet: (certs || [])[0] ? num((certs || [])[0].net_cumulative) : 0,
      certCount: (certs || []).length,
      certPayable: (certs || []).reduce((s: number, c: any) => s + num(c.net_payable), 0),
      guarActive: (guars || []).filter((g: any) => g.status === 'active').length,
      guarSum: (guars || []).filter((g: any) => g.status === 'active').reduce((s: number, g: any) => s + num(g.amount), 0),
      subContract: (subs || []).reduce((s: number, x: any) => s + num(x.contract_value), 0),
      subPaid: (subs || []).reduce((s: number, x: any) => s + num(x.paid_to_date), 0),
      asgCount: (asg || []).length,
      asgAllowance: (asg || []).reduce((s: number, a: any) => s + num(a.allowance_amount), 0),
      cusOutstanding: (cus || []).filter((c: any) => c.status === 'open').reduce((s: number, c: any) => s + (num(c.amount) - num(c.settled_amount)), 0),
      advOutstanding: (adv || []).filter((a: any) => a.status === 'open').reduce((s: number, a: any) => s + (num(a.amount) - num(a.repaid_amount)), 0),
      eqCount: (eq || []).length,
      certGross: (certs || [])[0] ? num((certs || [])[0].gross_cumulative) : 0,
      expenses: (exp || []).reduce((s: number, x: any) => s + num(x.amount), 0),
      collected: (cols || []).reduce((s: number, x: any) => s + num(x.amount), 0),
      equipCost,
      mileCount: (miles || []).length,
      mileProgress: mileTotalW > 0 ? (mileDoneW / mileTotalW) * 100 : 0,
      drCount: (dreports || []).length,
      mrCount: (mreqs || []).length,
      inspCount: (insps || []).length,
    })
    setDocs(dlist || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId, supplierId])

  async function saveDoc() {
    if (!docForm.name.trim()) { alert('اكتب اسم المستند'); return }
    setSavingDoc(true)
    await supabase.from('bz_project_documents').insert({ supplier_id: supplierId, project_id: projectId, name: docForm.name.trim(), doc_type: docForm.doc_type, url: docForm.url.trim() || null, notes: docForm.notes.trim() || null })
    setSavingDoc(false); setShowDoc(false); setDocForm({ name: '', doc_type: 'other', url: '', notes: '' }); load()
  }
  async function removeDoc(d: any) {
    if (!confirm('حذف المستند؟')) return
    await supabase.from('bz_project_documents').delete().eq('id', d.id)
    load()
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></div>
  if (!project) return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col items-center justify-center gap-3" dir="rtl">
      <p className="text-[#6B7280] font-bold">المشروع مش موجود</p>
      <Link href={`/admin/business-finance/${supplierId}/projects`} className="px-4 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold">رجوع للمشاريع</Link>
    </div>
  )

  const adjustedValue = num(project.contract_value) + agg.voApproved
  const remaining = adjustedValue - agg.certNet
  const progress = adjustedValue > 0 ? Math.min(100, (agg.certNet / adjustedValue) * 100) : num(project.progress_pct)
  const st = STATUS_LABELS[project.status] || STATUS_LABELS.planned
  const q = `?project=${projectId}`
  const revenue = agg.certGross
  const projCost = agg.expenses + agg.subPaid + agg.equipCost
  const projProfit = revenue - projCost

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}/projects`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> كل المشاريع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669]">{project.code}</p>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.color}`}>{st.label}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><Building2 className="w-7 h-7 text-[#059669]" /> {project.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#6B7280] flex-wrap">
                {project.client_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {project.client_name}</span>}
                {project.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {project.location}</span>}
              </div>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ===== الملخص المالي المتكامل ===== */}
        <section>
          <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#059669]" /> الملخص المالي</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="قيمة التعاقد الأصلية" value={`${money0(project.contract_value)} ج`} />
            <Stat label="أوامر التغيير المعتمدة" value={`${money0(agg.voApproved)} ج`} />
            <Stat label="القيمة المعدّلة" value={`${money0(adjustedValue)} ج`} primary />
            <Stat label="إجمالي المستخلَص (صافي)" value={`${money0(agg.certNet)} ج`} />
            <Stat label="المتبقّي للصرف" value={`${money0(remaining)} ج`} />
            <Stat label="صافي مدفوعات المستخلصات" value={`${money0(agg.certPayable)} ج`} />
            <Stat label="إجمالي جدول الكميات" value={`${money0(agg.boq)} ج`} />
            <Stat label="مقاولي الباطن (متبقّي)" value={`${money0(agg.subContract - agg.subPaid)} ج`} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#6B7280]">نسبة الإنجاز المالي (المستخلَص ÷ القيمة المعدّلة)</span>
              <span className="text-lg font-black text-[#059669]">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-l from-[#2FA084] to-[#34D399] rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <Stat label="الإيراد (أعمال منفّذة)" value={`${money0(revenue)} ج`} />
            <Stat label="تكاليف المشروع (مصروفات+باطن+معدات)" value={`${money0(projCost)} ج`} />
            <Stat label="صافي ربح تقديري" value={`${money0(projProfit)} ج`} primary />
            <Stat label="المحصّل من العميل" value={`${money0(agg.collected)} ج`} />
          </div>
        </section>

        {/* ===== موديولات المشروع ===== */}
        <section>
          <h2 className="text-sm font-black text-[#1A2E26] mb-3">أقسام المشروع</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <ModLink href={`/admin/business-finance/${supplierId}/boq${q}`} icon={<Table2 />} label="جدول الكميات" hint={`${money0(agg.boq)} ج`} />
            <ModLink href={`/admin/business-finance/${supplierId}/payment-certificates${q}`} icon={<ScrollText />} label="المستخلصات" hint={`${agg.certCount} مستخلص`} primary />
            <ModLink href={`/admin/business-finance/${supplierId}/variation-orders${q}`} icon={<GitBranchPlus />} label="أوامر التغيير" hint={`${money0(agg.voApproved)} ج`} />
            <ModLink href={`/admin/business-finance/${supplierId}/guarantees`} icon={<ShieldCheck />} label="خطابات الضمان" hint={`${agg.guarActive} ساري`} />
            <ModLink href={`/admin/business-finance/${supplierId}/subcontractors${q}`} icon={<HardHat />} label="مقاولي الباطن" hint={`${money0(agg.subContract)} ج`} />
            <ModLink href={`/admin/business-finance/${supplierId}/assignments`} icon={<Briefcase />} label="المأموريات" hint={`${agg.asgCount} مأمورية`} />
            <ModLink href={`/admin/business-finance/${supplierId}/custody-projects`} icon={<Coins />} label="العُهد" hint={`${money0(agg.cusOutstanding)} ج متبقّي`} />
            <ModLink href={`/admin/business-finance/${supplierId}/advances`} icon={<HandCoins />} label="السُّلف" hint={`${money0(agg.advOutstanding)} ج مستحق`} />
            <ModLink href={`/admin/business-finance/${supplierId}/equipment`} icon={<Wrench />} label="المعدات" hint={`${agg.eqCount} معدة`} />
            <ModLink href={`/admin/business-finance/${supplierId}/expenses-projects${q}`} icon={<Receipt />} label="مصروفات المشروع" hint={`${money0(agg.expenses)} ج`} />
            <ModLink href={`/admin/business-finance/${supplierId}/collections${q}`} icon={<Banknote />} label="التحصيل" hint={`${money0(agg.collected)} ج محصّل`} />
            <ModLink href={`/admin/business-finance/${supplierId}/milestones${q}`} icon={<CalendarRange />} label="الجدول الزمني" hint={`${agg.mileProgress.toFixed(0)}% إنجاز`} />
            <ModLink href={`/admin/business-finance/${supplierId}/daily-reports${q}`} icon={<ClipboardList />} label="يومية الموقع" hint={`${agg.drCount} يومية`} />
            <ModLink href={`/admin/business-finance/${supplierId}/material-requests${q}`} icon={<PackageOpen />} label="طلبات المواد" hint={`${agg.mrCount} طلب`} />
            <ModLink href={`/admin/business-finance/${supplierId}/inspections${q}`} icon={<ClipboardCheck />} label="الفحص والاستلام" hint={`${agg.inspCount} محضر`} />
          </div>
        </section>

        {/* ===== المستندات ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-[#1A2E26] flex items-center gap-2"><FileText className="w-4 h-4 text-[#059669]" /> مستندات المشروع</h2>
            <button onClick={() => setShowDoc(true)} className="px-3 py-1.5 rounded-xl bg-[#34D399] text-[#04352A] text-xs font-bold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> مستند</button>
          </div>
          {docs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center"><FileText className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-xs text-[#6B7280]">مفيش مستندات — ضيف عقود/رخص/مخططات (لينك)</p></div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#34D399]/10 text-[#059669] shrink-0">{docLabel(d.doc_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A2E26] truncate">{d.name}</p>
                    {d.notes && <p className="text-[11px] text-[#6B7280] truncate">{d.notes}</p>}
                  </div>
                  {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-[#FAFAF7] text-[#059669] hover:bg-gray-100"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  <button onClick={() => removeDoc(d)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        {project.notes && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-xs font-bold text-[#6B7280] mb-1">ملاحظات</h2>
            <p className="text-sm text-[#1A2E26] whitespace-pre-wrap">{project.notes}</p>
          </section>
        )}
      </main>

      {showDoc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowDoc(false)}>
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between"><h2 className="text-lg font-black text-[#1A2E26]">مستند جديد</h2><button onClick={() => setShowDoc(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-[#6B7280]" /></button></div>
            <div className="p-5 space-y-4">
              <Field label="اسم المستند *"><input value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} className={inputCls} /></Field>
              <Field label="النوع"><select value={docForm.doc_type} onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })} className={inputCls}>{DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></Field>
              <Field label="رابط المستند (Drive / لينك)"><input value={docForm.url} onChange={(e) => setDocForm({ ...docForm, url: e.target.value })} className={inputCls} placeholder="https://..." dir="ltr" /></Field>
              <Field label="ملاحظات"><input value={docForm.notes} onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 flex gap-2">
              <button onClick={saveDoc} disabled={savingDoc} className="flex-1 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">{savingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : null} إضافة</button>
              <button onClick={() => setShowDoc(false)} className="px-5 py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#059669] bg-white'
function Field({ label, children }: { label: string; children: ReactNode }) { return <div><label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>{children}</div> }
function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#34D399] border-[#059669] text-[#04352A]' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-lg md:text-xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p></div>
}
function ModLink({ href, icon, label, hint, primary }: { href: string; icon: ReactNode; label: string; hint: string; primary?: boolean }) {
  return (
    <Link href={href} className={`rounded-2xl p-4 border transition-all hover:shadow-md ${primary ? 'bg-[#34D399] border-[#059669] text-[#04352A]' : 'bg-white border-gray-100 hover:border-[#059669]/30'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 [&_svg]:w-5 [&_svg]:h-5 ${primary ? 'bg-white/15 text-[#04352A]' : 'bg-[#34D399]/10 text-[#059669]'}`}>{icon}</div>
      <p className={`text-sm font-black ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{label}</p>
      <p className={`text-[11px] font-bold mt-0.5 ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{hint}</p>
    </Link>
  )
}
