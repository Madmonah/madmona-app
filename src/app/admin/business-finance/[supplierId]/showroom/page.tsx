'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Car, X, User } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STATUS: Record<string, { label: string; color: string }> = {
  in_transit: { label: 'في الطريق', color: 'bg-amber-50 text-amber-700' },
  in_stock: { label: 'في المعرض', color: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
  reserved: { label: 'محجوزة', color: 'bg-blue-50 text-blue-700' },
  sold: { label: 'مباعة', color: 'bg-gray-100 text-gray-500' },
}

export default function ShowroomPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sellUnit, setSellUnit] = useState<any>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_list_vehicle_units', { p_supplier_id: supplierId })
    setUnits(Array.isArray(list) ? list : [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  async function setStatus(unitId: string, status: string) {
    // @ts-expect-error
    await supabase.rpc('admin_update_unit_status', { p_unit_id: unitId, p_status: status })
    load()
  }

  if (!supplier) return <Loader />

  const counts = units.reduce((a: any, u: any) => { a[u.status] = (a[u.status] || 0) + 1; return a }, {})
  const shown = filter === 'all' ? units : units.filter((u) => u.status === filter)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">VEHICLE AGENCY · SHOWROOM</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">المعرض · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{units.length} وحدة</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {['all', 'in_transit', 'in_stock', 'reserved', 'sold'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#6B7280]'}`}>
                {f === 'all' ? `الكل (${units.length})` : `${STATUS[f].label} (${counts[f] || 0})`}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-3 py-12 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin inline" /></div>
          ) : shown.length === 0 ? (
            <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-gray-100">
              <Car className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش وحدات</p>
              <p className="text-xs text-[#6B7280] mt-1">الوحدات بتيجي من تاب «الاستيراد» بعد الإفراج</p>
            </div>
          ) : shown.map((u: any) => {
            const st = STATUS[u.status] || { label: u.status, color: 'bg-gray-100 text-gray-600' }
            return (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-[#1A2E26] truncate">{u.brand || '—'} · {u.model || '—'}</h3>
                    <p className="text-xs text-[#6B7280]">{u.model_year || ''} {u.color ? `· ${u.color}` : ''} {u.vehicle_type === 'motorcycle' ? '· موتوسيكل' : '· عربية'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${st.color}`}>{st.label}</span>
                </div>
                <div className="space-y-0.5 text-[11px] text-[#6B7280] font-mono">
                  {u.chassis_no && <p>شاسيه: {u.chassis_no}</p>}
                  {u.engine_no && <p>موتور: {u.engine_no}</p>}
                  {u.consignment_ref && <p>شحنة: {u.consignment_ref}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-[#6B7280] uppercase">سعر البيع</p>
                    <p className="text-sm font-mono font-black text-[#1F6F5F]">{u.sale_price_egp ? `${Number(u.sale_price_egp).toLocaleString('ar-EG')} ج` : '—'}</p>
                  </div>
                  {u.customer_name && (
                    <div className="text-left">
                      <p className="text-[9px] text-[#6B7280] uppercase flex items-center gap-1 justify-end"><User className="w-2.5 h-2.5" /> العميل</p>
                      <p className="text-xs text-[#1A2E26]">{u.customer_name}</p>
                    </div>
                  )}
                </div>
                {u.status !== 'sold' && (
                  <div className="mt-3 flex items-center gap-1.5">
                    {u.status !== 'in_stock' && <button onClick={() => setStatus(u.id, 'in_stock')} className="flex-1 py-1.5 rounded-lg bg-[#FAFAF7] text-[11px] font-bold text-[#1A2E26]">للمعرض</button>}
                    {u.status !== 'reserved' && <button onClick={() => setStatus(u.id, 'reserved')} className="flex-1 py-1.5 rounded-lg bg-[#FAFAF7] text-[11px] font-bold text-[#1A2E26]">احجز</button>}
                    <button onClick={() => setSellUnit(u)} className="flex-1 py-1.5 rounded-lg bg-[#1F6F5F] text-[11px] font-bold text-white">بيع</button>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </main>

      {sellUnit && <SellModal unit={sellUnit} onClose={() => setSellUnit(null)} onSaved={() => { setSellUnit(null); load() }} />}
    </div>
  )
}

function SellModal({ unit, onClose, onSaved }: any) {
  const [form, setForm] = useState({ sale_price_egp: unit.sale_price_egp || '', customer_name: '', customer_phone: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!form.sale_price_egp) return alert('اكتب سعر البيع')
    setSaving(true)
    // @ts-expect-error
    await supabase.rpc('admin_update_unit_status', {
      p_unit_id: unit.id,
      p_status: 'sold',
      p_sale_price_egp: Number(form.sale_price_egp),
      p_customer_name: form.customer_name || null,
      p_customer_phone: form.customer_phone || null,
    })
    onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">بيع: {unit.brand} {unit.model}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="سعر البيع (ج) *"><input type="number" value={form.sale_price_egp} onChange={e => setForm({ ...form, sale_price_egp: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          <Field label="اسم العميل"><input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="موبايل العميل"><input type="tel" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'أكّد البيع'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div> }
