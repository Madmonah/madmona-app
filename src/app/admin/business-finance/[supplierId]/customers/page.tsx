'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Search, ChevronLeft, Loader2, Cake, Crown, Sparkles,
  RefreshCw, TrendingUp, Calendar,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Customer = {
  id: string
  full_name: string
  phone: string
  email: string | null
  customer_tier: 'new' | 'regular' | 'vip' | 'platinum' | 'inactive'
  total_visits: number
  total_spent_egp: number
  loyalty_points: number
  date_of_birth: string | null
  last_visit_at: string | null
  bday_this_month: boolean
  bday_today: boolean
}

type Stats = {
  total_customers: number
  vip_count: number
  birthdays_this_month: number
  inactive_3m: number
}

const TIER_LABELS: Record<string, { label: string; class: string }> = {
  platinum: { label: 'بلاتينيوم', class: 'bg-[#1A2E26] text-white' },
  vip: { label: 'VIP', class: 'bg-[#34D399] text-[#04352A]' },
  regular: { label: 'منتظمة', class: 'bg-[#34D399]/10 text-[#059669]' },
  new: { label: 'جديدة', class: 'bg-[#FAFAF7] text-[#6B7280] border border-gray-200' },
  inactive: { label: 'غير نشطة', class: 'bg-gray-100 text-gray-500' },
}

export default function CustomersPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<{ business_name: string } | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data: sup } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(sup as any)

    const { data } = await supabase.rpc('admin_list_customers', {
      p_supplier_id: supplierId,
      p_filter: search || null,
      p_tier: tierFilter,
      p_limit: 200,
      p_offset: 0,
    })
    if (data) {
      setCustomers((data.customers || []) as Customer[])
      setStats(data.stats as Stats)
    }
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, tierFilter])
  useEffect(() => {
    const t = setTimeout(() => load(), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const birthdayCustomers = useMemo(
    () => customers.filter((c) => c.bday_this_month).sort((a, b) => Number(b.bday_today) - Number(a.bday_today)),
    [customers]
  )

  if (!supplier && loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للـ finance
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">B2B PARTNER · CUSTOMER CRM</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">عملاء {supplier?.business_name}</h1>
              {stats && <p className="text-sm text-[#6B7280] mt-1">{stats.total_customers} عميلة · {stats.vip_count} VIP · {stats.birthdays_this_month} عيد ميلاد ده الشهر</p>}
            </div>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {stats && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="إجمالي" value={stats.total_customers} icon={<Users className="w-4 h-4" />} />
            <StatCard label="VIP" value={stats.vip_count} icon={<Crown className="w-4 h-4" />} tone="positive" />
            <StatCard label="عيد ميلاد الشهر" value={stats.birthdays_this_month} icon={<Cake className="w-4 h-4" />} primary />
            <StatCard label="ما زاروش ٣ شهور" value={stats.inactive_3m} icon={<TrendingUp className="w-4 h-4" />} />
          </section>
        )}

        {birthdayCustomers.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Cake className="w-4 h-4 text-[#059669]" />
              <h3 className="text-sm font-black text-[#1A2E26]">أعياد الميلاد ده الشهر ({birthdayCustomers.length})</h3>
            </div>
            <div className="p-3 flex gap-3 overflow-x-auto">
              {birthdayCustomers.map((c) => (
                <Link key={c.id} href={`/admin/business-finance/${supplierId}/customers/${c.id}`}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${c.bday_today ? 'bg-[#34D399] text-[#04352A] hover:opacity-90' : 'bg-[#FAFAF7] hover:bg-gray-100 text-[#1A2E26]'}`}>
                  {c.bday_today && <Sparkles className="w-3.5 h-3.5" />}
                  <span className="text-sm font-bold whitespace-nowrap">{c.full_name}</span>
                  <span className={`text-[10px] ${c.bday_today ? 'text-white/80' : 'text-[#6B7280]'}`}>
                    {c.date_of_birth ? new Date(c.date_of_birth).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                  {c.bday_today && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/20">اليوم!</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAF7] rounded-xl">
            <Search className="w-4 h-4 text-[#6B7280]" />
            <input type="text" placeholder="ابحث باسم أو رقم تليفون..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#1A2E26] focus:outline-none placeholder-[#6B7280]" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: null, label: 'الكل' },
              { v: 'platinum', label: '👑 بلاتينيوم' },
              { v: 'vip', label: '⭐ VIP' },
              { v: 'regular', label: 'منتظمة' },
              { v: 'new', label: 'جديدة' },
              { v: 'inactive', label: '⚠️ غير نشطة' },
            ].map((f) => (
              <button key={f.v ?? 'all'} onClick={() => setTierFilter(f.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tierFilter === f.v ? 'bg-[#34D399] text-[#04352A]' : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#059669] animate-spin" /></div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <Users className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش عملاء</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customers.map((c) => <CustomerCard key={c.id} c={c} supplierId={supplierId} />)}
          </section>
        )}
      </main>
    </div>
  )
}

function CustomerCard({ c, supplierId }: { c: Customer; supplierId: string }) {
  const tier = TIER_LABELS[c.customer_tier] || TIER_LABELS.new
  const lastVisit = c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : 'لسه'
  const daysSince = c.last_visit_at ? Math.floor((Date.now() - new Date(c.last_visit_at).getTime()) / (1000 * 60 * 60 * 24)) : null
  const isInactive = daysSince !== null && daysSince > 90

  return (
    <Link href={`/admin/business-finance/${supplierId}/customers/${c.id}`}
      className="block bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-[#059669] transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="inline-grid place-items-center w-11 h-11 rounded-xl bg-[#34D399]/10 text-[#059669] font-black text-base flex-shrink-0">{c.full_name.charAt(0)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-black text-[#1A2E26] leading-tight truncate">{c.full_name}</h4>
            {c.bday_today && <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            {c.bday_this_month && !c.bday_today && <Cake className="w-3 h-3 text-[#059669] flex-shrink-0" />}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-0.5 font-mono">{c.phone}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${tier.class}`}>{tier.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
        <div><p className="text-[9px] text-[#6B7280] tracking-wider uppercase mb-0.5">زيارات</p><p className="text-sm font-black text-[#1A2E26]">{c.total_visits}</p></div>
        <div><p className="text-[9px] text-[#6B7280] tracking-wider uppercase mb-0.5">اجمالي</p><p className="text-sm font-black text-[#1A2E26]">{Number(c.total_spent_egp).toLocaleString()} ج</p></div>
        <div><p className="text-[9px] text-[#6B7280] tracking-wider uppercase mb-0.5">نقاط</p><p className="text-sm font-black text-[#059669]">{c.loyalty_points}</p></div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-[10px] text-[#6B7280]"><Calendar className="w-3 h-3" /> آخر زيارة {lastVisit}</div>
        {isInactive && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">مش نشطة</span>}
      </div>
    </Link>
  )
}

function StatCard({ label, value, icon, tone, primary }: { label: string; value: number | string; icon: React.ReactNode; tone?: 'positive' | 'negative'; primary?: boolean }) {
  const toneClass = tone === 'positive' ? 'text-[#059669]' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#34D399] border-[#059669] text-[#04352A]' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>{icon}<p className="text-[10px] font-bold tracking-wider uppercase">{label}</p></div>
      <p className={`text-2xl md:text-3xl font-black ${primary ? 'text-white' : toneClass}`}>{value}</p>
    </div>
  )
}
