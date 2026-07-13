'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Plus, X, BadgeCheck, Globe } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const AUTH_TYPES = [
  { value: 'exclusive', label: 'توكيل حصري' },
  { value: 'distributor', label: 'موزّع' },
  { value: 'reseller', label: 'بائع' },
]

export default function BrandsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_list_agency_brands', { p_supplier_id: supplierId })
    setBrands(Array.isArray(list) ? list : [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">VEHICLE AGENCY · BRANDS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">التوكيلات · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{brands.length} توكيل / براند</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> توكيل جديد</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-3 py-12 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin inline" /></div>
          ) : brands.length === 0 ? (
            <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-gray-100">
              <BadgeCheck className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش توكيلات</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold">أضف أول توكيل</button>
            </div>
          ) : brands.map((b: any) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-[#1A2E26] truncate">{b.brand_name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#1F6F5F]/10 text-[#1F6F5F]">
                    {AUTH_TYPES.find(t => t.value === b.authorization_type)?.label || b.authorization_type}
                  </span>
                </div>
                {b.active === false && <span className="text-[10px] text-red-600 font-bold">غير نشط</span>}
              </div>
              <div className="space-y-1 text-xs text-[#6B7280]">
                {b.country && <p className="flex items-center gap-1"><Globe className="w-3 h-3" /> {b.country}</p>}
                {b.notes && <p className="text-[#6B7280] leading-relaxed">{b.notes}</p>}
              </div>
            </div>
          ))}
        </section>
      </main>

      {showAdd && <AddBrandModal supplierId={supplierId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function AddBrandModal({ supplierId, onClose, onSaved }: any) {
  const [form, setForm] = useState({ brand_name: '', country: '', authorization_type: 'distributor', notes: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!form.brand_name) return alert('اكتب اسم التوكيل/البراند')
    setSaving(true)
    await rpcSafe(supabase, 'admin_create_agency_brand', {
      p_supplier_id: supplierId,
      p_brand_name: form.brand_name,
      p_country: form.country || null,
      p_authorization_type: form.authorization_type,
      p_notes: form.notes || null,
    })
    onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">توكيل جديد</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="اسم التوكيل / البراند *"><input type="text" value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="نوع التوكيل">
            <select value={form.authorization_type} onChange={e => setForm({ ...form, authorization_type: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              {AUTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="بلد المنشأ"><input type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'احفظ'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div> }
