'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Building2, Users, Plus, ChevronLeft, ArrowLeft, Loader2,
  Search, BadgePercent, TrendingUp, AlertCircle, Crown,
} from 'lucide-react'

/* ============================================================
   /admin/business-partners — Index of all B2B partners
   Dynamic: lists all suppliers with business_type='multi_branch'
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Partner = {
  id: string
  business_name: string
  industry: string | null
  business_type: string
  contract_status: string
  commission_rate: number | null
  commission_extra_rate: number | null
  contact_phone: string | null
  city: string | null
  district: string | null
  branches_count: number
  employees_count: number
  today_revenue: number
  today_commission: number
  active_tasks: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  negotiating: { label: 'قيد التفاوض', color: 'bg-amber-50 text-amber-700' },
  signed: { label: 'موقّع', color: 'bg-blue-50 text-blue-700' },
  active: { label: 'نشط', color: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
  paused: { label: 'متوقف', color: 'bg-gray-100 text-gray-600' },
  terminated: { label: 'منتهي', color: 'bg-red-50 text-red-600' },
}

const INDUSTRY_LABELS: Record<string, string> = {
  beauty_salon: 'صالون تجميل',
  gym: 'جيم/فتنس',
  restaurant: 'مطعم',
  clinic: 'عيادة',
  retail_shop: 'محل تجزئة',
  spa: 'سبا',
}

export default function BusinessPartnersIndexPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  async function loadPartners() {
    setLoading(true)
    // Fetch all multi-branch suppliers
    // @ts-expect-error
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, business_name, industry, business_type, contract_status, commission_rate, commission_extra_rate, contact_phone, city, district')
      .eq('business_type', 'multi_branch')
      .order('created_at', { ascending: false })

    if (!suppliers || suppliers.length === 0) {
      setPartners([])
      setLoading(false)
      return
    }

    // For each supplier, fetch counts + today's stats in parallel
    const enriched = await Promise.all(
      suppliers.map(async (s: any) => {
        const today = new Date().toISOString().slice(0, 10)
        const [branchesRes, empsRes, txnsRes, tasksRes] = await Promise.all([
          supabase.from('supplier_branches').select('id', { count: 'exact', head: true })
            .eq('supplier_id', s.id).eq('status', 'active'),
          supabase.from('business_employees').select('id', { count: 'exact', head: true })
            .eq('supplier_id', s.id).eq('status', 'active'),
          supabase.from('financial_transactions').select('amount_egp, madmona_commission_amount')
            .eq('supplier_id', s.id).eq('direction', 'in').eq('is_void', false)
            .gte('occurred_at', `${today}T00:00:00`),
          supabase.from('daily_tasks').select('id', { count: 'exact', head: true })
            .eq('task_date', today).eq('status', 'pending'),
        ])

        const txns = (txnsRes.data || []) as Array<{ amount_egp: number; madmona_commission_amount: number }>
        const todayRevenue = txns.reduce((sum, t) => sum + Number(t.amount_egp || 0), 0)
        const todayCommission = txns.reduce((sum, t) => sum + Number(t.madmona_commission_amount || 0), 0)

        return {
          ...s,
          branches_count: branchesRes.count || 0,
          employees_count: empsRes.count || 0,
          today_revenue: todayRevenue,
          today_commission: todayCommission,
          active_tasks: tasksRes.count || 0,
        } as Partner
      }),
    )

    setPartners(enriched)
    setLoading(false)
  }

  useEffect(() => {
    loadPartners()
    const id = setInterval(loadPartners, 60000)
    return () => clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    let r = partners
    if (statusFilter !== 'all') r = r.filter((p) => p.contract_status === statusFilter)
    if (search) {
      const s = search.toLowerCase()
      r = r.filter((p) =>
        p.business_name.toLowerCase().includes(s) ||
        (p.contact_phone || '').includes(s) ||
        (p.district || '').toLowerCase().includes(s),
      )
    }
    return r
  }, [partners, statusFilter, search])

  const totals = useMemo(() => ({
    partners: partners.length,
    branches: partners.reduce((s, p) => s + p.branches_count, 0),
    employees: partners.reduce((s, p) => s + p.employees_count, 0),
    revenue: partners.reduce((s, p) => s + p.today_revenue, 0),
    commission: partners.reduce((s, p) => s + p.today_commission, 0),
    activePartners: partners.filter((p) => p.contract_status === 'active').length,
    negotiating: partners.filter((p) => p.contract_status === 'negotiating').length,
  }), [partners])

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">
                MADMONA · B2B PARTNERS
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
                شركاء الـ B2B
              </h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {totals.partners} شريك · {totals.branches} فرع · {totals.employees} موظف
              </p>
            </div>
            <Link
              href="/admin/business-partners/new"
              className="px-5 py-2.5 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Plus className="w-4 h-4" />
              اضف شريك جديد
            </Link>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="max-w-7xl mx-auto px-4 pb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الهاتف، أو الحي..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 rounded-xl bg-white border border-gray-200 text-sm text-[#1A2E26] placeholder-[#6B7280] focus:outline-none focus:border-[#1F6F5F] transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200">
            {['all', 'negotiating', 'signed', 'active', 'paused'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === s
                    ? 'bg-[#1F6F5F] text-white shadow-sm'
                    : 'text-[#6B7280] hover:text-[#1A2E26]'
                }`}
              >
                {s === 'all' ? 'الكل' : STATUS_LABELS[s]?.label || s}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="شركاء نشطين" value={totals.activePartners} sublabel={`من إجمالي ${totals.partners}`} />
          <StatCard label="قيد التفاوض" value={totals.negotiating} sublabel="فرصة جديدة" />
          <StatCard label="إجمالي الإيراد اليوم" value={`${totals.revenue.toLocaleString('ar-EG')} ج`} primary />
          <StatCard label="عمولة مضمونة اليوم" value={`${totals.commission.toLocaleString('ar-EG')} ج`} tone="positive" sublabel="على gross bookings" />
        </section>

        {/* Partners list */}
        {loading && partners.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
            <Building2 className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" />
            <h3 className="text-lg font-black text-[#1A2E26] mb-1">
              {search || statusFilter !== 'all' ? 'مفيش نتائج للفلتر ده' : 'مفيش شركاء B2B لسه'}
            </h3>
            <p className="text-sm text-[#6B7280] mb-4">
              {search || statusFilter !== 'all'
                ? 'جرب تغير الفلتر أو امسح البحث'
                : 'ابدأ بإضافة أول شريك B2B زي صالون تجميل، جيم، أو مطعم'}
            </p>
            {!search && statusFilter === 'all' && (
              <Link
                href="/admin/business-partners/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold hover:shadow-md transition-shadow"
              >
                <Plus className="w-4 h-4" />
                اضف أول شريك
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <PartnerCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function StatCard({
  label, value, sublabel, primary, tone,
}: {
  label: string
  value: number | string
  sublabel?: string
  primary?: boolean
  tone?: 'positive' | 'negative'
}) {
  const toneClass = tone === 'positive' ? 'text-[#1F6F5F]' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 md:p-5 border ${
      primary ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white' : 'bg-white border-gray-100'
    }`}>
      <p className={`text-[10px] font-bold tracking-wider uppercase mb-1.5 ${
        primary ? 'text-white/80' : 'text-[#6B7280]'
      }`}>{label}</p>
      <p className={`text-2xl md:text-3xl font-black ${primary ? 'text-white' : toneClass}`}>{value}</p>
      {sublabel && (
        <p className={`text-[10px] mt-1 ${primary ? 'text-white/70' : 'text-[#6B7280]'}`}>{sublabel}</p>
      )}
    </div>
  )
}

function PartnerCard({ p }: { p: Partner }) {
  const status = STATUS_LABELS[p.contract_status] || { label: p.contract_status, color: 'bg-gray-100 text-gray-600' }
  const industry = INDUSTRY_LABELS[p.industry || ''] || p.industry || '—'
  return (
    <Link
      href={`/admin/business-finance/${p.id}`}
      className="bg-white rounded-2xl border border-gray-100 hover:border-[#1F6F5F] hover:shadow-md transition-all p-5 block group"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] font-black text-base flex-shrink-0">
            {p.business_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-black text-[#1A2E26] tracking-tight truncate">
              {p.business_name}
            </h3>
            <p className="text-xs text-[#6B7280] truncate">{industry} · {p.district || p.city || '—'}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase flex-shrink-0 ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Kpi icon={<Building2 className="w-3.5 h-3.5" />} value={p.branches_count} label="فرع" />
        <Kpi icon={<Users className="w-3.5 h-3.5" />} value={p.employees_count} label="موظف" />
        <Kpi icon={<BadgePercent className="w-3.5 h-3.5" />} value={`${(Number(p.commission_rate) || 0) + (Number(p.commission_extra_rate) || 0)}%`} label="عمولة" />
      </div>

      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">إيراد اليوم</p>
          <p className="text-base font-black text-[#1A2E26] font-mono">
            {p.today_revenue.toLocaleString('ar-EG')} ج
          </p>
        </div>
        {p.today_commission > 0 && (
          <div className="text-left">
            <p className="text-[10px] font-bold tracking-wider uppercase text-[#1F6F5F]">عمولتنا</p>
            <p className="text-base font-black text-[#1F6F5F] font-mono">
              {p.today_commission.toLocaleString('ar-EG')} ج
            </p>
          </div>
        )}
        <ArrowLeft className="w-5 h-5 text-[#6B7280] group-hover:text-[#1F6F5F] group-hover:-translate-x-1 transition-all" />
      </div>
    </Link>
  )
}

function Kpi({ icon, value, label }: { icon: ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#6B7280]">{icon}</span>
      <div>
        <p className="text-sm font-black text-[#1A2E26] leading-none">{value}</p>
        <p className="text-[10px] text-[#6B7280] mt-0.5">{label}</p>
      </div>
    </div>
  )
}
