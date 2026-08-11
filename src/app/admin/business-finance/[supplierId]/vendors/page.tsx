'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Plus, X, Truck, Phone, Mail } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// فئات الموردين حسب نوع النشاط (موتوسيكلات لسعداوي، صالون لإيليت، عام للباقي)
const VENDOR_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  vehicle_agency: [
    { value: 'oem_manufacturer', label: 'مصنّع / وكيل خارجي' },
    { value: 'motorcycles', label: 'موتوسيكلات' },
    { value: 'spare_parts', label: 'قطع غيار' },
    { value: 'accessories', label: 'إكسسوارات' },
    { value: 'tyres', label: 'إطارات' },
    { value: 'oils_lubricants', label: 'زيوت ومواد تشغيل' },
    { value: 'freight', label: 'شحن وملاحة' },
    { value: 'customs_broker', label: 'تخليص جمركي' },
    { value: 'bank_finance', label: 'بنك / تمويل (L/C)' },
    { value: 'services', label: 'خدمات' },
    { value: 'general', label: 'عام' },
  ],
  beauty_salon: [
    { value: 'hair_products', label: 'منتجات شعر' },
    { value: 'cosmetics', label: 'مستحضرات تجميل' },
    { value: 'equipment', label: 'معدات' },
    { value: 'consumables', label: 'مستهلكات' },
    { value: 'utilities', label: 'مرافق' },
    { value: 'services', label: 'خدمات' },
    { value: 'general', label: 'عام' },
  ],
  default: [
    { value: 'goods', label: 'بضاعة' },
    { value: 'equipment', label: 'معدات' },
    { value: 'consumables', label: 'مستهلكات' },
    { value: 'utilities', label: 'مرافق' },
    { value: 'services', label: 'خدمات' },
    { value: 'general', label: 'عام' },
  ],
}
function vendorCats(industry: string | null | undefined) {
  if (industry === 'vehicle_agency' || industry === 'auto') return VENDOR_CATEGORIES.vehicle_agency
  if (industry === 'beauty_salon') return VENDOR_CATEGORIES.beauty_salon
  return VENDOR_CATEGORIES.default
}

export default function VendorsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name, industry').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_list_vendors', { p_supplier_id: supplierId })
    setData(list)
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  if (!supplier) return <Loader />
  const cats = vendorCats(supplier?.industry)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · VENDORS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">الموردين · {supplier?.business_name}</h1>
              {data?.stats && (
                <p className="text-sm text-[#6B7280] mt-1">
                  {data.stats.total_vendors} مورد · {Number(data.stats.total_purchased).toLocaleString()} ج إجمالي مشتريات
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> مورد جديد</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-3 py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
          ) : data?.vendors?.length === 0 ? (
            <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-gray-100">
              <Truck className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش موردين</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold">أضف أول مورد</button>
            </div>
          ) : (data?.vendors || []).map((v: any) => (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-[#1A2E26] truncate">{v.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAFAF7] text-[#1A2E26]">
                    {cats.find((c: any) => c.value === v.category)?.label || v.category}
                  </span>
                </div>
                {v.is_active === false && <span className="text-[10px] text-red-600 font-bold">غير نشط</span>}
              </div>
              <div className="space-y-1 text-xs text-[#6B7280]">
                {v.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {v.phone}</p>}
                {v.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {v.email}</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs">
                <div>
                  <p className="text-[#6B7280]">المشتريات</p>
                  <p className="font-mono font-black text-[#FA8125]">{Number(v.total_purchased_egp || 0).toLocaleString()} ج</p>
                </div>
                <div className="text-left">
                  <p className="text-[#6B7280]">آخر طلب</p>
                  <p className="font-mono text-[#1A2E26]">{v.last_order_at?.slice(0, 10) || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      {showAdd && (
        <AddVendorModal supplierId={supplierId} cats={cats} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}

function AddVendorModal({ supplierId, cats, onClose, onSaved }: any) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', category: 'general', notes: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!form.name) return alert('اكتب اسم المورد')
    setSaving(true)
    await rpcSafe(supabase, 'admin_create_vendor', {
      p_supplier_id: supplierId,
      p_name: form.name,
      p_phone: form.phone || null,
      p_email: form.email || null,
      p_category: form.category,
      p_notes: form.notes || null,
    })
    onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">مورد جديد</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="اسم المورد *"><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="الفئة">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              {cats.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="موبايل"><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          <Field label="إيميل"><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'احفظ'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
