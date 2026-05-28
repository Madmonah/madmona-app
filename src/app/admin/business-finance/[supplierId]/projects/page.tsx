'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  FolderKanban, ChevronLeft, Loader2, Plus, X, RefreshCw,
  Building2, MapPin, ScrollText, Pencil, Trash2, Wallet, Layers,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STATUSES = [
  { value: 'active',    label: 'شغّال',        color: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
  { value: 'on_hold',   label: 'متوقف مؤقت',   color: 'bg-amber-50 text-amber-700' },
  { value: 'completed', label: 'مكتمل',        color: 'bg-blue-50 text-blue-700' },
  { value: 'cancelled', label: 'ملغي',         color: 'bg-red-50 text-red-600' },
]

const EGP = (n: any) => Number(n || 0).toLocaleString('ar-EG')
const statusMeta = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0]

const emptyForm = {
  id: null as string | null,
  name: '', client_name: '', location: '',
  contract_value: '', retention_pct: '5', advance_pct: '25', vat_pct: '14',
  start_date: '', end_date: '', progress_pct: '0', status: 'active', notes: '',
}

export default function ProjectsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  async function load() {
    setLoading(true)
    // @ts-expect-error rpc/select typing
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase
      .from('bz_projects')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
    setProjects(list || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  function openAdd() { setForm({ ...emptyForm }); setShowForm(true) }
  function openEdit(p: any) {
    setForm({
      id: p.id, name: p.name || '', client_name: p.client_name || '', location: p.location || '',
      contract_value: String(p.contract_value ?? ''), retention_pct: String(p.retention_pct ?? '5'),
      advance_pct: String(p.advance_pct ?? '25'), vat_pct: String(p.vat_pct ?? '14'),
      start_date: p.start_date || '', end_date: p.end_date || '',
      progress_pct: String(p.progress_pct ?? '0'), status: p.status || 'active', notes: p.notes || '',
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) { alert('اكتب اسم المشروع'); return }
    setSaving(true)
    const payload: any = {
      supplier_id: supplierId,
      name: form.name.trim(),
      client_name: form.client_name.trim() || null,
      location: form.location.trim() || null,
      contract_value: Number(form.contract_value) || 0,
      retention_pct: Number(form.retention_pct) || 0,
      advance_pct: Number(form.advance_pct) || 0,
      vat_pct: Number(form.vat_pct) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      progress_pct: Number(form.progress_pct) || 0,
      status: form.status,
      notes: form.notes.trim() || null,
    }

    if (form.id) {
      payload.updated_at = new Date().toISOString()
      // @ts-expect-error
      await supabase.from('bz_projects').update(payload).eq('id', form.id)
    } else {
      payload.code = 'PRJ-' + String(projects.length + 1).padStart(4, '0')
      // @ts-expect-error
      await supabase.from('bz_projects').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function remove(p: any) {
    if (!confirm(`متأكد تمسح مشروع "${p.name}"؟ هيتمسح معاه كل المستخلصات بتاعته.`)) return
    // @ts-expect-error
    await supabase.from('bz_projects').delete().eq('id', p.id)
    load()
  }

  const totalValue = projects.reduce((s, p) => s + Number(p.contract_value || 0), 0)
  const activeCount = projects.filter((p) => p.status === 'active').length

  if (loading && !supplier) {
    return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">مقاولات · المشاريع</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2">
                <FolderKanban className="w-7 h-7 text-[#1F6F5F]" /> المشاريع
              </h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {projects.length} مشروع · {activeCount} شغّال · إجمالي التعاقدات {EGP(totalValue)} ج
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2 hover:shadow-md transition-shadow">
                <Plus className="w-4 h-4" /> مشروع جديد
              </button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <FolderKanban className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#1A2E26]">لسه مفيش مشاريع</p>
            <p className="text-xs text-[#6B7280] mt-1">ابدأ بإضافة أول مشروع مقاولات</p>
            <button onClick={openAdd} className="mt-4 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> مشروع جديد
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const sm = statusMeta(p.status)
              const prog = Math.min(100, Math.max(0, Number(p.progress_pct || 0)))
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">{p.code || '—'}</p>
                      <h3 className="text-base font-black text-[#1A2E26] leading-tight truncate">{p.name}</h3>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${sm.color}`}>{sm.label}</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#6B7280] mb-3">
                    {p.client_name && <p className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {p.client_name}</p>}
                    {p.location && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {p.location}</p>}
                  </div>

                  <div className="rounded-xl bg-[#FAFAF7] p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> قيمة التعاقد</span>
                      <span className="text-lg font-black text-[#1F6F5F] font-mono">{EGP(p.contract_value)} <span className="text-xs font-medium text-[#6B7280]">ج</span></span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[#6B7280]">
                      <span>محتجز {p.retention_pct}%</span>·
                      <span>مقدمة {p.advance_pct}%</span>·
                      <span>ق.م {p.vat_pct}%</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#6B7280] mb-1">
                      <span>نسبة الإنجاز</span><span className="text-[#1A2E26]">{prog}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-[#1F6F5F] rounded-full transition-all" style={{ width: `${prog}%` }} />
                    </div>
                  </div>

                  <div className="mt-auto flex items-center gap-2">
                    <Link
                      href={`/admin/business-finance/${supplierId}/payment-certificates?project=${p.id}`}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#1F6F5F] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:shadow-md transition-shadow"
                    >
                      <ScrollText className="w-3.5 h-3.5" /> المستخلصات
                    </Link>
                    <button onClick={() => openEdit(p)} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100" title="تعديل"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(p)} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#1A2E26] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#1F6F5F]" /> {form.id ? 'تعديل مشروع' : 'مشروع جديد'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-[#6B7280]" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="اسم المشروع *">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="مثال: تشطيب فيلا التجمع" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="العميل"><input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className={inputCls} /></Field>
                <Field label="الموقع"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></Field>
              </div>
              <Field label="قيمة التعاقد (ج) *">
                <input type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} className={inputCls} placeholder="0" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="محتجز %"><input type="number" value={form.retention_pct} onChange={(e) => setForm({ ...form, retention_pct: e.target.value })} className={inputCls} /></Field>
                <Field label="مقدمة %"><input type="number" value={form.advance_pct} onChange={(e) => setForm({ ...form, advance_pct: e.target.value })} className={inputCls} /></Field>
                <Field label="ق.م %"><input type="number" value={form.vat_pct} onChange={(e) => setForm({ ...form, vat_pct: e.target.value })} className={inputCls} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="تاريخ البدء"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} /></Field>
                <Field label="تاريخ الانتهاء"><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="نسبة الإنجاز %"><input type="number" value={form.progress_pct} onChange={(e) => setForm({ ...form, progress_pct: e.target.value })} className={inputCls} /></Field>
                <Field label="الحالة">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="ملاحظات"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} /></Field>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {form.id ? 'حفظ التعديلات' : 'إضافة المشروع'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-3 rounded-xl bg-[#FAFAF7] text-[#1A2E26] font-bold text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] bg-white'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#6B7280] mb-1">{label}</label>
      {children}
    </div>
  )
}
