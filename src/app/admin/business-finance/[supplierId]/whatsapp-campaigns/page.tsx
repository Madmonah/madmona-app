'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, MessageCircle, CheckCircle2, Eye } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function WACampaignsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_list_whatsapp_campaigns', { p_supplier_id: supplierId })
    setData(list)
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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · WHATSAPP</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">حملات WhatsApp · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{data?.stats?.total_campaigns || 0} حملة · {Number(data?.stats?.total_delivered_lifetime || 0).toLocaleString()} رسالة وصلت</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <section className="bg-[#FA8125]/5 border border-[#FA8125]/20 rounded-2xl p-4 text-xs text-[#1A2E26]">
          <p className="font-bold mb-1">📌 ملحوظة:</p>
          <p>إنشاء الحملات بيتم من خلال Madmona مباشرة عبر Meta Cloud API. الصفحة دي للمتابعة وإلا.</p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-[#FAFAF7] border-b border-gray-100">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">سجل الحملات</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
            ) : data?.campaigns?.length === 0 ? (
              <div className="py-12 text-center">
                <MessageCircle className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">مفيش حملات لسه</p>
              </div>
            ) : (data?.campaigns || []).map((c: any) => (
              <div key={c.id} className="px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm">
                <div className="col-span-3">
                  <p className="font-bold text-[#1A2E26]">{c.campaign_name}</p>
                  <p className="text-[10px] text-[#6B7280] font-mono">{c.template_name}</p>
                </div>
                <div className="col-span-2 text-xs text-[#6B7280]">{c.target_audience || '—'}</div>
                <div className="col-span-1 text-center"><CampaignStatusBadge status={c.status} /></div>
                <div className="col-span-2 text-center">
                  <p className="text-[10px] text-[#6B7280]">المرسلة</p>
                  <p className="font-mono font-bold">{c.sent_count}/{c.total_recipients}</p>
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-[10px] text-[#6B7280]">اتقرت ✓</p>
                  <p className="font-mono font-bold text-[#FA8125]">{c.read_count}</p>
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-[10px] text-[#6B7280]">ردت</p>
                  <p className="font-mono font-bold">{c.replied_count}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function CampaignStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: 'مسودة', cls: 'bg-gray-100 text-gray-700' },
    scheduled: { label: 'مجدول', cls: 'bg-blue-50 text-blue-700' },
    sending: { label: 'جاري', cls: 'bg-amber-50 text-amber-700' },
    completed: { label: 'اكتمل ✓', cls: 'bg-[#FA8125]/10 text-[#FA8125]' },
    cancelled: { label: 'ملغي', cls: 'bg-red-50 text-red-600' },
  }
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700' }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.cls}`}>{s.label}</span>
}

function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
