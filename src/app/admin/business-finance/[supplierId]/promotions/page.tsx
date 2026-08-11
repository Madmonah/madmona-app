'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Plus, X, Gift, Tag, Calendar } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const TYPES = [
  { value: 'percentage', label: 'نسبة %' },
  { value: 'fixed_amount', label: 'مبلغ ثابت' },
  { value: 'loyalty_points', label: 'نقاط ولاء' },
  { value: 'free_service', label: 'خدمة مجانية' },
  { value: 'bundle', label: 'باقة' },
]

export default function PromotionsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [promos, setPromos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_list_promotions', { p_supplier_id: supplierId })
    setPromos(list?.promotions || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  if (!supplier) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · PROMOTIONS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">العروض والكوبونات · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{promos.length} عرض</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> عرض جديد</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-3 py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
          ) : promos.length === 0 ? (
            <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-gray-100">
              <Gift className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش عروض</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold">أنشئ أول عرض</button>
            </div>
          ) : promos.map((p: any) => {
            const expired = p.expires_at && new Date(p.expires_at) < new Date()
            return (
              <div key={p.id} className={`bg-white rounded-2xl border p-4 ${expired ? 'border-gray-200 opacity-60' : p.is_active ? 'border-[#FA8125]/30' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold tracking-wider text-[#6B7280] font-mono uppercase">{p.code}</p>
                    <h3 className="text-sm font-black text-[#1A2E26] mt-1">{p.name_ar}</h3>
                  </div>
                  {expired ? <span className="text-[10px] font-bold text-red-600">منتهي</span>
                   : p.is_active ? <span className="text-[10px] font-bold text-[#FA8125]">نشط ✓</span>
                   : <span className="text-[10px] font-bold text-[#6B7280]">معطل</span>}
                </div>
                <div className="bg-[#FA8125] text-white rounded-xl p-3 my-3 text-center">
                  <p className="text-3xl font-black">
                    {p.type === 'percentage' ? `${p.value}%` : p.type === 'fixed_amount' ? `${p.value} ج` : p.value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-white/80 mt-1">{TYPES.find(t => t.value === p.type)?.label}</p>
                </div>
                <div className="space-y-1 text-xs text-[#6B7280]">
                  {p.min_amount > 0 && <p>الحد الأدنى: {Number(p.min_amount).toLocaleString()} ج</p>}
                  <p>الاستخدامات: {p.used_count}{p.usage_limit ? `/${p.usage_limit}` : ''}</p>
                  {p.expires_at && <p className="flex items-center gap-1"><Calendar className="w-3 h-3" /> ينتهي {p.expires_at.slice(0, 10)}</p>}
                </div>
              </div>
            )
          })}
        </section>
      </main>

      {showAdd && (
        <AddPromoModal supplierId={supplierId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}

function AddPromoModal({ supplierId, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    code: '', name_ar: '', type: 'percentage', value: '', min_amount: '', expires_at: '', usage_limit: '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.code || !form.name_ar || !form.value) return alert('اكمل البيانات')
    setSaving(true)
    // @ts-expect-error
    const { error } = await supabase.rpc('admin_create_promotion', {
      p_supplier_id: supplierId,
      p_code: form.code.toUpperCase(),
      p_name_ar: form.name_ar,
      p_type: form.type,
      p_value: parseFloat(form.value),
      p_min_amount: parseFloat(form.min_amount) || 0,
      p_expires_at: form.expires_at || null,
      p_usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
    })
    if (error) alert(error.message)
    else onSaved()
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">عرض جديد</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="كود الكوبون *"><input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono uppercase" /></Field>
          <Field label="اسم العرض *"><input type="text" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} placeholder="خصم الترحيب" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="النوع">
            <div className="grid grid-cols-3 gap-1.5">
              {TYPES.map(t => (
                <button key={t.value} onClick={() => setForm({ ...form, type: t.value })} className={`px-2 py-1.5 rounded-lg text-xs font-bold ${form.type === t.value ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>{t.label}</button>
              ))}
            </div>
          </Field>
          <Field label={form.type === 'percentage' ? 'النسبة %' : 'القيمة'}>
            <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
          </Field>
          <Field label="الحد الأدنى للفاتورة (اختياري)"><input type="number" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })} placeholder="0" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          <Field label="تاريخ الانتهاء (اختياري)"><input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="حد الاستخدامات (اختياري)"><input type="number" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} placeholder="بدون حد" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'احفظ العرض'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
