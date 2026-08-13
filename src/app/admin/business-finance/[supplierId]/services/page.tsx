'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Scissors, Package, Plus, X, Trash2, Save, Wrench, Tag } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ServicesPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<any>(null)

  async function load() {
    setLoading(true)
    const { data: s } = await supabase.from('suppliers').select('business_name, industry').eq('id', supplierId).single()
    setSupplier(s)
    const { data: svc } = await supabase.from('services_catalog').select('id, name_ar, price_egp, duration_minutes, performer_commission_pct').eq('supplier_id', supplierId).order('name_ar')
    setServices(svc || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  if (!supplier) return <Loader />

  const SvcIcon = supplier?.industry === 'vehicle_agency' ? Wrench : supplier?.industry === 'beauty_salon' ? Scissors : Tag

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · SERVICES</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">الخدمات · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{services.length} خدمة · اضغط على أي خدمة لربطها بمنتجات المخزون</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="bg-[#FA8125]/5 border border-[#FA8125]/20 rounded-2xl p-4 text-xs text-[#1A2E26] mb-5">
          <p className="font-bold mb-1">💡 إيه الفايدة من ربط الخدمات بمنتجات؟</p>
          <p>لما حد يحجز خدمة وتتمارك "completed"، القطع المرتبطة بيها بتتخصم تلقائياً من المخزون.</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-3 py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
          ) : services.length === 0 ? (
            <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-gray-100">
              <SvcIcon className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش خدمات</p>
            </div>
          ) : services.map(s => (
            <button key={s.id} onClick={() => setSelectedService(s)} className="bg-white rounded-2xl border border-gray-100 p-4 text-right hover:shadow-md hover:border-[#FA8125] transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center"><SvcIcon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-[#1A2E26] truncate">{s.name_ar}</h3>
                  <p className="text-[10px] text-[#6B7280]">{s.duration_minutes} دقيقة</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B7280]">السعر</span>
                <span className="font-mono font-black text-[#FA8125]">{Number(s.price_egp).toLocaleString()} ج</span>
              </div>
              {s.performer_commission_pct > 0 && (
                <p className="text-[10px] text-[#FA8125] mt-1 font-bold">عمولة {s.performer_commission_pct}%</p>
              )}
              <p className="text-[10px] text-[#6B7280] mt-2 pt-2 border-t border-gray-100 text-center">اضغط لربط منتجات</p>
            </button>
          ))}
        </section>
      </main>

      {selectedService && (
        <ServiceMappingModal supplierId={supplierId} service={selectedService} onClose={() => setSelectedService(null)} />
      )}
    </div>
  )
}

function ServiceMappingModal({ supplierId, service, onClose }: any) {
  const [products, setProducts] = useState<any[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data: prods } = await supabase.from('inventory_products').select('id, name_ar, current_stock, cost_price_egp').eq('supplier_id', supplierId).order('name_ar')
    setProducts(prods || [])
    const { data } = await supabase.rpc('admin_list_service_products', { p_service_id: service.id })
    setMappings((data?.products || []).map((m: any) => ({
      product_id: m.product_id,
      quantity_consumed: m.quantity_consumed,
      is_optional: m.is_optional,
    })))
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [service.id])

  function addProduct() {
    setMappings([...mappings, { product_id: '', quantity_consumed: 1, is_optional: false }])
  }

  function updateMapping(i: number, patch: any) {
    setMappings(mappings.map((m, idx) => idx === i ? { ...m, ...patch } : m))
  }

  function removeMapping(i: number) {
    setMappings(mappings.filter((_, idx) => idx !== i))
  }

  async function save() {
    setSaving(true)
    const validMappings = mappings.filter(m => m.product_id)
    await rpcSafe(supabase, 'admin_set_service_products', {
      p_service_id: service.id,
      p_mappings: validMappings,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-2xl md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-wider uppercase text-[#FA8125]">ربط منتجات</p>
            <h2 className="text-lg font-black text-[#1A2E26]">{service.name_ar}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
          ) : (
            <>
              <p className="text-xs text-[#6B7280] mb-2">أضف كل منتج بـ يستهلك في الخدمة دي + الكمية:</p>
              <div className="space-y-2">
                {mappings.map((m, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 grid grid-cols-12 gap-2 items-center">
                    <select value={m.product_id} onChange={e => updateMapping(i, { product_id: e.target.value })} className="col-span-6 px-2 py-1.5 rounded-lg bg-[#FAFAF7] text-xs">
                      <option value="">اختار منتج...</option>
                      {products.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name_ar} (متاح: {p.current_stock})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      value={m.quantity_consumed}
                      onChange={e => updateMapping(i, { quantity_consumed: parseFloat(e.target.value) || 0 })}
                      placeholder="كمية"
                      className="col-span-3 px-2 py-1.5 rounded-lg bg-[#FAFAF7] text-xs font-mono"
                    />
                    <label className="col-span-2 flex items-center gap-1 text-[10px] text-[#6B7280]">
                      <input type="checkbox" checked={m.is_optional} onChange={e => updateMapping(i, { is_optional: e.target.checked })} />
                      اختياري
                    </label>
                    <button onClick={() => removeMapping(i)} className="col-span-1 text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={addProduct} className="w-full p-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#FA8125] text-[#6B7280] hover:text-[#FA8125] text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> أضف منتج
              </button>
            </>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-gray-100 bg-white">
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><Save className="w-4 h-4" /> احفظ الربط</>}
          </button>
        </footer>
      </div>
    </div>
  )
}

function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
