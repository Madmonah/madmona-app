'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  TrendingUp, DollarSign, Calendar, Users, ChevronLeft, Loader2,
  Crown, Award, MapPin, ArrowUpRight, BarChart3, RefreshCw,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const PERIODS = [
  { label: 'اليوم', days: 0 },
  { label: 'آخر ٧ أيام', days: 7 },
  { label: 'آخر ٣٠ يوم', days: 30 },
  { label: 'آخر ٩٠ يوم', days: 90 },
]

export default function DashboardPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [kpis, setKpis] = useState<any>(null)
  const [period, setPeriod] = useState(30)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)

    const today = new Date()
    const from = new Date()
    from.setDate(from.getDate() - period)
    // @ts-expect-error
    const { data } = await supabase.rpc('admin_dashboard_kpis', {
      p_supplier_id: supplierId,
      p_date_from: from.toISOString().slice(0, 10),
      p_date_to: today.toISOString().slice(0, 10),
    })
    setKpis(data)
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, period])

  if (!supplier) return <Loader />

  const revenue = Number(kpis?.revenue?.total || 0)
  const expenses = Number(kpis?.expenses?.total || 0)
  const profit = revenue - expenses
  const profitMargin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">B2B PARTNER · ANALYTICS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">Dashboard · {supplier?.business_name}</h1>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {PERIODS.map(p => (
                <button key={p.days} onClick={() => setPeriod(p.days || 1)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  period === (p.days || 1) ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100'
                }`}>{p.label}</button>
              ))}
              <button onClick={load} className="p-2 rounded-lg bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* P&L Hero */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <KpiCard label="الإيرادات" value={`${revenue.toLocaleString()} ج`} icon={<TrendingUp />} primary />
          <KpiCard label="المصاريف" value={`${expenses.toLocaleString()} ج`} icon={<DollarSign />} tone="warning" />
          <KpiCard label="الصافي" value={`${profit.toLocaleString()} ج`} icon={<BarChart3 />} tone={profit >= 0 ? 'positive' : 'danger'} />
          <KpiCard label="هامش الربح" value={`${profitMargin}%`} icon={<ArrowUpRight />} tone={profitMargin > 30 ? 'positive' : 'warning'} />
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="حجوزات الفترة" value={kpis?.revenue?.bookings_count || 0} icon={<Calendar />} />
          <KpiCard label="حجوزات مكتملة" value={kpis?.revenue?.completed_count || 0} icon={<Calendar />} />
          <KpiCard label="متوسط الحجز" value={`${kpis?.revenue?.completed_count > 0 ? Math.round(revenue / kpis.revenue.completed_count) : 0} ج`} icon={<DollarSign />} />
          <KpiCard label="ROI %" value={`${expenses > 0 ? Math.round((profit / expenses) * 100) : 0}%`} icon={<TrendingUp />} />
        </section>

        {/* By Branch */}
        <Section title="الأداء حسب الفرع">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(kpis?.by_branch || []).map((b: any, i: number) => {
              const rev = Number(b.revenue || 0)
              const exp = Number(b.expenses || 0)
              const branchProfit = rev - exp
              return (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[#1F6F5F]" />
                    <h3 className="text-sm font-black text-[#1A2E26]">{b.branch}</h3>
                    <span className="text-[10px] text-[#6B7280] font-mono">{b.code}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div><p className="text-[#6B7280]">إيرادات</p><p className="font-black text-[#1F6F5F]">{rev.toLocaleString()}</p></div>
                    <div><p className="text-[#6B7280]">مصاريف</p><p className="font-black text-[#1A2E26]">{exp.toLocaleString()}</p></div>
                    <div><p className="text-[#6B7280]">صافي</p><p className={`font-black ${branchProfit >= 0 ? 'text-[#1F6F5F]' : 'text-red-600'}`}>{branchProfit.toLocaleString()}</p></div>
                  </div>
                  <p className="text-[10px] text-[#6B7280] text-center mt-2">{b.completed_bookings || 0} حجز مكتمل</p>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Top Services */}
        <Section title="أكتر الخدمات مبيعاً">
          <RankedList items={(kpis?.top_services || []).map((s: any) => ({
            label: s.service, sub: `${s.bookings} حجز`, value: `${Number(s.revenue || 0).toLocaleString()} ج`,
          }))} />
        </Section>

        {/* Top Employees */}
        <Section title="أعلى الموظفين أداءاً">
          <RankedList items={(kpis?.top_employees || []).map((e: any) => ({
            label: e.name, sub: e.role_ar, value: `${Number(e.revenue || 0).toLocaleString()} ج`, badge: `${e.bookings} حجز`,
          }))} />
        </Section>

        {/* Top Customers */}
        <Section title="أعلى العملاء إنفاقاً">
          <RankedList items={(kpis?.top_customers || []).map((c: any) => ({
            label: c.name, sub: c.customer_tier, value: `${Number(c.spent || 0).toLocaleString()} ج`, badge: `${c.visits} زيارة`,
          }))} />
        </Section>

        {/* Expense breakdown */}
        <Section title="المصاريف حسب الفئة">
          {Object.keys(kpis?.expenses?.by_category || {}).length === 0 ? (
            <p className="text-sm text-[#6B7280] py-4 text-center">مفيش مصاريف مسجلة في الفترة دي. <Link href={`/admin/business-finance/${supplierId}/expenses`} className="text-[#1F6F5F] font-bold">أضف مصاريف</Link></p>
          ) : (
            <div className="space-y-2">
              {Object.entries(kpis.expenses.by_category).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-[#1A2E26] font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                  <span className="font-bold text-[#1A2E26] font-mono">{Number(amt).toLocaleString()} ج</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </main>
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'إيجار', utilities: 'كهرباء/ماء/غاز', internet: 'إنترنت', maintenance: 'صيانة',
  supplies: 'لوازم', marketing: 'تسويق', salaries_advance: 'سلف موظفين',
  transportation: 'مواصلات', licenses: 'تراخيص', equipment: 'معدات', training: 'تدريب', other: 'أخرى',
}

function KpiCard({ label, value, icon, tone, primary }: any) {
  const toneClass = tone === 'warning' ? 'text-amber-700' : tone === 'danger' ? 'text-red-600' : tone === 'positive' ? 'text-[#1F6F5F]' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        <div className="w-4 h-4">{icon}</div>
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-xl md:text-2xl font-black ${primary ? 'text-white' : toneClass}`}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-4">{title}</h2>
      {children}
    </section>
  )
}

function RankedList({ items }: { items: { label: string; sub?: string; value: string; badge?: string }[] }) {
  if (items.length === 0) return <p className="text-sm text-[#6B7280] py-4 text-center">مفيش بيانات</p>
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
          <div className={`w-7 h-7 rounded-lg grid place-items-center text-xs font-black ${i === 0 ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#6B7280]'}`}>
            {i === 0 ? <Crown className="w-3.5 h-3.5" /> : i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#1A2E26] truncate">{item.label}</p>
            {item.sub && <p className="text-[10px] text-[#6B7280]">{item.sub}</p>}
          </div>
          {item.badge && <span className="px-2 py-0.5 rounded bg-[#FAFAF7] text-[10px] font-bold text-[#1A2E26]">{item.badge}</span>}
          <span className="text-sm font-black font-mono text-[#1F6F5F]">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function Loader() {
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div>
}
