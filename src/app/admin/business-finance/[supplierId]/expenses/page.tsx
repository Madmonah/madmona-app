'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  DollarSign, ChevronLeft, Loader2, Plus, X, RefreshCw, Receipt, Filter, Trash2,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CATEGORIES = [
  { value: 'rent', label: 'إيجار' },
  { value: 'utilities', label: 'كهرباء/ماء/غاز' },
  { value: 'internet', label: 'إنترنت' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'supplies', label: 'لوازم' },
  { value: 'marketing', label: 'تسويق' },
  { value: 'salaries_advance', label: 'سلف موظفين' },
  { value: 'transportation', label: 'مواصلات' },
  { value: 'licenses', label: 'تراخيص' },
  { value: 'equipment', label: 'معدات' },
  { value: 'training', label: 'تدريب' },
  { value: 'other', label: 'أخرى' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'كاش' },
  { value: 'card', label: 'فيزا' },
  { value: 'instapay', label: 'InstaPay' },
  { value: 'transfer', label: 'تحويل بنكي' },
  { value: 'cheque', label: 'شيك' },
  { value: 'other', label: 'أخرى' },
]

export default function ExpensesPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: br } = await supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).order('code')
    setBranches(br || [])
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_list_expenses', {
      p_supplier_id: supplierId,
      p_branch_id: branchFilter,
    })
    setData(list)
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, branchFilter])

  if (!supplier) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">B2B PARTNER · EXPENSES</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">المصاريف · {supplier?.business_name}</h1>
              {data?.stats && (
                <p className="text-sm text-[#6B7280] mt-1">
                  {data.stats.count} مصروف · إجمالي {Number(data.stats.total_amount).toLocaleString()} ج (آخر 30 يوم)
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> اضف مصروف
              </button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Branch filter */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            <button onClick={() => setBranchFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              !branchFilter ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'
            }`}>كل الفروع</button>
            {branches.map(b => (
              <button key={b.id} onClick={() => setBranchFilter(b.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                branchFilter === b.id ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'
              }`}>{b.name}</button>
            ))}
          </div>
        </section>

        {/* Category breakdown */}
        {data?.stats?.by_category && Object.keys(data.stats.by_category).length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-3">حسب الفئة</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(data.stats.by_category).map(([cat, amt]) => (
                <div key={cat} className="bg-[#FAFAF7] rounded-xl p-3">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase">{CATEGORIES.find(c => c.value === cat)?.label || cat}</p>
                  <p className="text-lg font-black text-[#1A2E26]">{Number(amt).toLocaleString()} ج</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Expense list */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[#FAFAF7] border-b border-gray-100 text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">
            <div className="col-span-2">التاريخ</div>
            <div className="col-span-3">الفئة</div>
            <div className="col-span-2">المبلغ</div>
            <div className="col-span-2">الدفع</div>
            <div className="col-span-3">ملاحظات</div>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin inline" /></div>
            ) : data?.expenses?.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">مفيش مصاريف لسه</p>
                <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold">أضف أول مصروف</button>
              </div>
            ) : (data?.expenses || []).map((e: any) => (
              <div key={e.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-sm">
                <div className="col-span-2 text-xs text-[#6B7280]">{e.expense_date}</div>
                <div className="col-span-3">
                  <p className="font-bold text-[#1A2E26]">{CATEGORIES.find(c => c.value === e.category)?.label || e.category}</p>
                  {e.branch_name && <p className="text-[10px] text-[#6B7280]">{e.branch_name}</p>}
                </div>
                <div className="col-span-2 font-black text-[#1A2E26] font-mono">{Number(e.amount_egp).toLocaleString()} ج</div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAFAF7] text-[#1A2E26]">
                    {PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label}
                  </span>
                </div>
                <div className="col-span-3 text-xs text-[#6B7280] truncate">{e.notes || e.vendor_name || '—'}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {showAdd && (
        <AddExpenseModal
          supplierId={supplierId}
          branches={branches}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

function AddExpenseModal({ supplierId, branches, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    branch_id: branches[0]?.id || '',
    category: 'supplies',
    amount: '',
    payment_method: 'cash',
    vendor_name: '',
    notes: '',
    expense_date: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.amount || !form.branch_id) return alert('اكمل البيانات')
    setSaving(true)
    // @ts-expect-error
    await supabase.rpc('admin_record_expense', {
      p_supplier_id: supplierId,
      p_branch_id: form.branch_id,
      p_category: form.category,
      p_amount: parseFloat(form.amount),
      p_payment_method: form.payment_method,
      p_vendor_name: form.vendor_name || null,
      p_notes: form.notes || null,
      p_expense_date: form.expense_date,
    })
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">إضافة مصروف</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="الفرع">
            <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="الفئة">
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setForm({ ...form, category: c.value })} className={`px-2 py-1.5 rounded-lg text-xs font-bold ${
                  form.category === c.value ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'
                }`}>{c.label}</button>
              ))}
            </div>
          </Field>
          <Field label="المبلغ (ج)">
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
          </Field>
          <Field label="طريقة الدفع">
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map(m => (
                <button key={m.value} onClick={() => setForm({ ...form, payment_method: m.value })} className={`px-2 py-1.5 rounded-lg text-xs font-bold ${
                  form.payment_method === m.value ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'
                }`}>{m.label}</button>
              ))}
            </div>
          </Field>
          <Field label="التاريخ">
            <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </Field>
          <Field label="اسم البائع (اختياري)">
            <input type="text" value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </Field>
          <Field label="ملاحظات (اختياري)">
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'احفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function Loader() {
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>
}
