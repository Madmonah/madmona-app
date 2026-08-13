'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Wrench, Package } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function WorkshopPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    const { data: list } = await supabase.rpc('admin_list_workshop', { p_supplier_id: supplierId })
    setServices(Array.isArray(list) ? list : [])
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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">VEHICLE AGENCY · WORKSHOP</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">الورشة والصيانة · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{services.length} خدمة صيانة · كل خدمة بتخصم قطع غيارها تلقائي عند الإقفال</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? (
            <div className="md:col-span-2 py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
          ) : services.length === 0 ? (
            <div className="md:col-span-2 py-12 text-center bg-white rounded-2xl border border-gray-100">
              <Wrench className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش خدمات صيانة</p>
              <p className="text-xs text-[#6B7280] mt-1">ضيف خدمات الصيانة وقطع غيارها من تاب «قائمة الخدمات / ربط خدمة-منتج»</p>
            </div>
          ) : services.map((s: any) => {
            const price = Number(s.price_egp || 0)
            const cost = Number(s.parts_cost || 0)
            const margin = price - cost
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-sm font-black text-[#1A2E26]">{s.name_ar}</h3>
                  <span className="text-sm font-mono font-black text-[#FA8125] whitespace-nowrap">{price.toLocaleString('ar-EG')} ج</span>
                </div>
                <div className="space-y-1.5">
                  {(s.parts || []).length === 0 ? (
                    <p className="text-xs text-[#6B7280]">مفيش قطع مربوطة</p>
                  ) : (s.parts || []).map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#1A2E26]">
                        <Package className="w-3 h-3 text-[#6B7280]" />
                        {p.name_ar} <span className="text-[#6B7280]">×{Number(p.qty)}</span>
                        {p.optional && <span className="text-[9px] text-amber-600 font-bold">(اختياري)</span>}
                      </span>
                      <span className="font-mono text-[#6B7280]">{(Number(p.qty) * Number(p.cost)).toLocaleString('ar-EG')} ج</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                  <KV label="السعر" value={`${price.toLocaleString('ar-EG')} ج`} />
                  <KV label="تكلفة القطع" value={`${cost.toLocaleString('ar-EG')} ج`} />
                  <KV label="الهامش" value={`${margin.toLocaleString('ar-EG')} ج`} accent />
                </div>
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}

function KV({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-bold tracking-wider uppercase text-[#6B7280] mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-black ${accent ? 'text-[#FA8125]' : 'text-[#1A2E26]'}`}>{value}</p>
    </div>
  )
}
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
