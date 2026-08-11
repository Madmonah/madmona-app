'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, AlertTriangle, MessageCircle, Phone, Crown, Star } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  high: { label: 'أولوية عالية', cls: 'bg-red-50 text-red-700 border-red-200' },
  medium: { label: 'متوسطة', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'منخفضة', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
}

const TIER_LABELS: Record<string, { label: string; cls: string }> = {
  platinum: { label: 'بلاتينيوم', cls: 'bg-[#1A2E26] text-white' },
  vip: { label: 'VIP', cls: 'bg-[#FA8125] text-white' },
  regular: { label: 'منتظمة', cls: 'bg-[#FA8125]/10 text-[#FA8125]' },
  new: { label: 'جديدة', cls: 'bg-[#FAFAF7] text-[#6B7280]' },
  inactive: { label: 'غير نشطة', cls: 'bg-gray-100 text-gray-500' },
}

export default function AtRiskCustomersPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [days, setDays] = useState(60)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: result } = await supabase.rpc('admin_get_at_risk_customers', {
      p_supplier_id: supplierId,
      p_days_threshold: days,
    })
    setData(result)
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, days])

  if (!supplier) return <Loader />

  const customers = data?.customers || []
  const stats = data?.stats || {}

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · CHURN PREDICTION</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">العملاء في خطر · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">عملاء ما زاروش من فترة طويلة — هدفهم برسائل استرجاع</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Threshold selector */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-2">إظهار اللي ما زاروش لـ</p>
          <div className="flex gap-2 flex-wrap">
            {[30, 60, 90, 180].map(d => (
              <button key={d} onClick={() => setDays(d)} className={`px-4 py-2 rounded-xl text-sm font-bold ${
                days === d ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'
              }`}>{d} يوم</button>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="عملاء في خطر" value={stats.total_at_risk || 0} icon={<AlertTriangle />} tone="warning" />
          <StatCard label="VIP في خطر" value={stats.high_priority || 0} icon={<Crown />} tone="danger" primary />
          <StatCard label="إيراد سنوي معرّض للخسارة" value={`${Number(stats.estimated_revenue_at_risk || 0).toLocaleString()} ج`} icon={<Star />} tone="warning" />
        </section>

        {/* Hint banner */}
        <section className="bg-[#FA8125]/5 border border-[#FA8125]/20 rounded-2xl p-4 text-xs text-[#1A2E26]">
          <p className="font-bold mb-1">💡 خطة استرجاع مقترحة:</p>
          <ul className="space-y-0.5 list-disc mr-4 text-[#6B7280]">
            <li><b>أولوية عالية</b> (VIP/Platinum): مكالمة شخصية + خصم 20% على أول زيارة</li>
            <li><b>أولوية متوسطة</b>: واتساب رسالة بـ خصم 15%</li>
            <li><b>أولوية منخفضة</b>: واتساب عرض عام أو قسيمة 10%</li>
          </ul>
        </section>

        {/* Customer list */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[#FAFAF7] border-b border-gray-100 text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">
            <div className="col-span-3">العميلة</div>
            <div className="col-span-2">التصنيف</div>
            <div className="col-span-2 text-center">آخر زيارة</div>
            <div className="col-span-2 text-center">إجمالي صرفت</div>
            <div className="col-span-1 text-center">زيارات</div>
            <div className="col-span-2 text-center">تواصل</div>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
            ) : customers.length === 0 ? (
              <div className="py-12 text-center">
                <Star className="w-10 h-10 text-[#FA8125] opacity-30 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">🎉 مفيش عملاء في خطر!</p>
                <p className="text-xs text-[#6B7280] mt-1">كل عملاءك زاروا في آخر {days} يوم</p>
              </div>
            ) : customers.map((c: any) => {
              const tier = TIER_LABELS[c.customer_tier] || TIER_LABELS.new
              const priority = PRIORITY_LABELS[c.recovery_priority] || PRIORITY_LABELS.low
              return (
                <div key={c.customer_id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-sm">
                  <div className="col-span-3">
                    <Link href={`/admin/business-finance/${supplierId}/customers/${c.customer_id}`} className="font-bold text-[#1A2E26] hover:text-[#FA8125]">{c.full_name}</Link>
                    <p className="text-[10px] text-[#6B7280] font-mono">{c.phone}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tier.cls}`}>{tier.label}</span>
                    <span className={`block w-fit px-2 py-0.5 rounded text-[10px] font-bold border ${priority.cls}`}>{priority.label}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-xs text-[#6B7280]">{c.last_visit ? new Date(c.last_visit).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : '—'}</p>
                    <p className={`text-[10px] font-bold ${c.days_since_last_visit > 90 ? 'text-red-600' : 'text-amber-700'}`}>
                      {c.days_since_last_visit ? `${c.days_since_last_visit} يوم` : 'مفيش زيارات'}
                    </p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="font-mono font-bold text-[#1A2E26]">{Number(c.total_spent || 0).toLocaleString()} ج</p>
                    {c.avg_ticket > 0 && <p className="text-[10px] text-[#6B7280]">{Number(c.avg_ticket).toLocaleString()} ج/زيارة</p>}
                  </div>
                  <div className="col-span-1 text-center font-mono font-bold">{c.total_visits}</div>
                  <div className="col-span-2 text-center">
                    <a 
                      href={`https://wa.me/${(c.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '20')}?text=${encodeURIComponent(`مرحباً ${c.full_name?.split(' ')[0] || ''}، ${supplier?.business_name} اشتاقت لكي! خصم خاص استرجاع علي خدمة من اختياركي ${c.recovery_priority === 'high' ? '20%' : c.recovery_priority === 'medium' ? '15%' : '10%'}.`)}`}
                      target="_blank" 
                      rel="noopener"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FA8125] text-white text-xs font-bold"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, tone, primary }: any) {
  const toneClass = tone === 'warning' ? 'text-amber-700' : tone === 'danger' ? 'text-red-600' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#FA8125] border-[#FA8125] text-white' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        <div className="w-4 h-4">{icon}</div>
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-black ${primary ? 'text-white' : toneClass}`}>{value}</p>
    </div>
  )
}

function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
