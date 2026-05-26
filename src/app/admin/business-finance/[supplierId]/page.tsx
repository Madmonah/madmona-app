'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  TrendingUp, TrendingDown, Wallet, Building2, Users, Calendar,
  ArrowDownCircle, ArrowUpCircle, Loader2, RefreshCw, Eye,
  CheckCircle2, AlertCircle, BadgePercent, ChevronDown, Plus, Heart, Package,
  BarChart3, DollarSign, Clock, ShoppingCart, Truck, Gift,
  MessageCircle, FileText, Calculator, FileCheck, Tag, Workflow, UserX, Receipt,
  CalendarClock, Download, ListChecks, Link2,
} from 'lucide-react'

/* ============================================================
   /admin/business-finance/[supplierId]
   
   Mohamed's view of a B2B partner's full financials.
   - Live transaction feed
   - Per-branch daily summaries
   - Madmona commission tracker
   - Monthly + weekly + today totals
   
   Brand: locked 5-color palette, web app aesthetic
   ============================================================ */

const PALETTE = {
  green: '#1F6F5F',
  cream: '#FAFAF7',
  dark: '#1A2E26',
  gray: '#6B7280',
  white: '#FFFFFF',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Supplier = {
  id: string
  business_name: string
  industry: string | null
  business_type: string
  contract_status: string
  commission_rate: number | null
  commission_extra_rate: number | null
  contact_phone: string | null
}

type Branch = {
  id: string
  name: string
  code: string | null
  address: string | null
  district: string | null
  status: string
  phone: string | null
}

type Transaction = {
  id: string
  branch_id: string | null
  branch_name?: string
  direction: 'in' | 'out'
  amount_egp: number
  category_snapshot: string | null
  payment_method: string
  description: string | null
  customer_name: string | null
  occurred_at: string
  madmona_commission_amount: number | null
  is_void: boolean
}

type DailySummary = {
  branch_id: string
  branch_name: string
  business_date: string
  total_in: number
  total_out: number
  net: number
  transaction_count: number
  madmona_commission_earned: number
}

export default function BusinessFinancePage({
  params,
}: {
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBranch, setActiveBranch] = useState<string>('all')
  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')

  async function loadAll() {
    setLoading(true)

    // Supplier
    // @ts-expect-error
    const { data: sup } = await supabase
      .from('suppliers')
      .select('id, business_name, industry, business_type, contract_status, commission_rate, commission_extra_rate, contact_phone')
      .eq('id', supplierId)
      .single()
    setSupplier(sup as Supplier)

    // Branches
    // @ts-expect-error
    const { data: br } = await supabase
      .from('supplier_branches')
      .select('id, name, code, address, district, status, phone')
      .eq('supplier_id', supplierId)
      .order('code', { ascending: true })
    setBranches((br || []) as Branch[])

    // Transactions (last 200)
    // @ts-expect-error
    const { data: txns } = await supabase
      .from('financial_transactions')
      .select('id, branch_id, direction, amount_egp, category_snapshot, payment_method, description, customer_name, occurred_at, madmona_commission_amount, is_void, supplier_branches(name)')
      .eq('supplier_id', supplierId)
      .eq('is_void', false)
      .order('occurred_at', { ascending: false })
      .limit(200)
    
    const txnsWithBranch = (txns || []).map((t: any) => ({
      ...t,
      branch_name: t.supplier_branches?.name || '—',
    }))
    setTransactions(txnsWithBranch as Transaction[])

    // Daily summaries (last 30 days)
    // @ts-expect-error
    const { data: sums } = await supabase
      .from('v_business_daily_summary')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('business_date', { ascending: false })
      .limit(120)  // 30 days × 4 branches
    setSummaries((sums || []) as DailySummary[])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const id = setInterval(loadAll, 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  // Filter transactions by branch + period
  const filteredTxns = useMemo(() => {
    let result = transactions
    if (activeBranch !== 'all') {
      result = result.filter((t) => t.branch_id === activeBranch)
    }
    const now = new Date()
    const cutoff = new Date()
    if (activePeriod === 'today') {
      cutoff.setHours(0, 0, 0, 0)
    } else if (activePeriod === 'week') {
      cutoff.setDate(now.getDate() - 7)
    } else if (activePeriod === 'month') {
      cutoff.setDate(now.getDate() - 30)
    } else {
      return result
    }
    return result.filter((t) => new Date(t.occurred_at) >= cutoff)
  }, [transactions, activeBranch, activePeriod])

  // Stats for filtered view
  const stats = useMemo(() => {
    const totalIn = filteredTxns
      .filter((t) => t.direction === 'in')
      .reduce((sum, t) => sum + Number(t.amount_egp), 0)
    const totalOut = filteredTxns
      .filter((t) => t.direction === 'out')
      .reduce((sum, t) => sum + Number(t.amount_egp), 0)
    const madmonaEarned = filteredTxns.reduce(
      (sum, t) => sum + Number(t.madmona_commission_amount || 0),
      0,
    )
    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      madmonaEarned,
      txnCount: filteredTxns.length,
    }
  }, [filteredTxns])

  // Today's per-branch breakdown
  const todayPerBranch = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return branches.map((b) => {
      const summary = summaries.find(
        (s) => s.branch_id === b.id && s.business_date === today,
      )
      return {
        branch: b,
        in: summary?.total_in || 0,
        out: summary?.total_out || 0,
        net: summary?.net || 0,
        commission: summary?.madmona_commission_earned || 0,
        count: summary?.transaction_count || 0,
      }
    })
  }, [branches, summaries])

  if (loading && !supplier) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#6B7280] mx-auto mb-2" />
          <p className="text-[#1A2E26]">شركة غير موجودة</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F]">
                  B2B PARTNER · FINANCE
                </p>
                <ContractBadge status={supplier.contract_status} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
                {supplier.business_name}
              </h1>
              <p className="text-sm text-[#6B7280] mt-1">
                {supplier.industry === 'beauty_salon' ? 'صالون تجميل' : supplier.industry || ''} ·{' '}
                {branches.length} فروع · {supplier.contact_phone}
              </p>
            </div>
            <button
              onClick={loadAll}
              className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <Link
              href={`/admin/business-finance/${supplierId}/operations`}
              className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Plus className="w-4 h-4" />
              سجّل عملية
            </Link>
            <Link
              href={`/admin/business-finance/${supplierId}/settings`}
              className="px-3 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] transition-colors"
              title="الإعدادات"
            >
              إعدادات
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Branch filter */}
            <select
              value={activeBranch}
              onChange={(e) => setActiveBranch(e.target.value)}
              className="text-sm font-bold text-[#1A2E26] bg-white border border-gray-200 rounded-xl px-4 py-2"
            >
              <option value="all">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Period tabs */}
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200">
              {(['today', 'week', 'month', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activePeriod === p
                      ? 'bg-[#1F6F5F] text-white shadow-sm'
                      : 'text-[#6B7280] hover:text-[#1A2E26]'
                  }`}
                >
                  {p === 'today' ? 'اليوم' : p === 'week' ? 'الأسبوع' : p === 'month' ? 'الشهر' : 'الكل'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* MODULES GRID - all 14 admin modules */}
        <section>
          <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-3">
            🎛️ الوحدات
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <ModuleCard href={`/admin/business-finance/${supplierId}/confirmations`} icon={<CheckCircle2 />} label="التأكيدات" primary />
            <ModuleCard href={`/admin/business-finance/${supplierId}/links`} icon={<Link2 />} label="كل اللينكات" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/dashboard`} icon={<BarChart3 />} label="Dashboard" primary />
            <ModuleCard href={`/admin/business-finance/${supplierId}/team`} icon={<Users />} label="الفريق" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/branches`} icon={<Building2 />} label="الفروع" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/customers`} icon={<Heart />} label="العملاء" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/appointments`} icon={<Calendar />} label="المواعيد" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/bookings`} icon={<CalendarClock />} label="إدارة الحجوزات" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/waitlist`} icon={<ListChecks />} label="قائمة الانتظار" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/inventory`} icon={<Package />} label="المخزون" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/services-catalog`} icon={<Tag />} label="قائمة الخدمات" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/services`} icon={<Workflow />} label="ربط خدمة-منتج" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/expenses`} icon={<DollarSign />} label="المصاريف" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/attendance`} icon={<Clock />} label="الحضور" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/cash-recon`} icon={<Wallet />} label="جرد الكاش" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/payroll`} icon={<Calculator />} label="المرتبات" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/purchase-orders`} icon={<ShoppingCart />} label="طلبات شراء" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/vendors`} icon={<Truck />} label="الموردين" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/promotions`} icon={<Gift />} label="العروض" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/whatsapp-campaigns`} icon={<MessageCircle />} label="WhatsApp" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/documents`} icon={<FileCheck />} label="المستندات" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/audit-log`} icon={<FileText />} label="سجل التعديلات" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/at-risk`} icon={<UserX />} label="عملاء في خطر" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/shifts`} icon={<CalendarClock />} label="مواعيد العمل" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/reports`} icon={<Download />} label="تصدير تقارير" />
            <ModuleCard href={`/admin/business-finance/${supplierId}/vat-report`} icon={<Receipt />} label="VAT Report" />
          </div>
        </section>

        {/* TOP: 4 stat cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            icon={<ArrowDownCircle className="w-5 h-5" />}
            label="إجمالي داخل"
            amount={stats.totalIn}
            tone="positive"
          />
          <StatCard
            icon={<ArrowUpCircle className="w-5 h-5" />}
            label="إجمالي خارج"
            amount={stats.totalOut}
            tone="negative"
          />
          <StatCard
            icon={<Wallet className="w-5 h-5" />}
            label="صافي"
            amount={stats.net}
            tone={stats.net >= 0 ? 'positive' : 'negative'}
            primary
          />
          <StatCard
            icon={<BadgePercent className="w-5 h-5" />}
            label="كوميشن مضمونة"
            amount={stats.madmonaEarned}
            tone="madmona"
            note={`${stats.txnCount} عملية`}
          />
        </section>

        {/* MIDDLE: Per-branch today */}
        <section>
          <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-3">
            ⚡ اليوم · حالة الفروع
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {todayPerBranch.map((b) => (
              <BranchCard key={b.branch.id} {...b} />
            ))}
          </div>
        </section>

        {/* BOTTOM: Live transactions feed */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">
              📊 سجل الحركات
            </h2>
            <span className="text-xs text-[#6B7280]">آخر {filteredTxns.length} حركة</span>
          </div>
          
          {filteredTxns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Eye className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm text-[#6B7280]">مفيش حركات في الفترة دي</p>
              <p className="text-xs text-[#6B7280] mt-1">الـ system جاهز — في انتظار أول transaction من {supplier.business_name}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAF7] border-b border-gray-100">
                  <tr className="text-right">
                    <Th>الوقت</Th>
                    <Th>الفرع</Th>
                    <Th>النوع</Th>
                    <Th>الفئة</Th>
                    <Th>الوصف</Th>
                    <Th className="text-left">المبلغ</Th>
                    <Th className="text-left">كوميشن</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.slice(0, 50).map((t) => (
                    <TxnRow key={t.id} t={t} />
                  ))}
                </tbody>
              </table>
              {filteredTxns.length > 50 && (
                <div className="py-3 text-center text-xs text-[#6B7280] border-t border-gray-100">
                  + {filteredTxns.length - 50} حركة تانية · use filters للتقليل
                </div>
              )}
            </div>
          )}
        </section>

        {/* Footer: contract terms */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-[#1A2E26] mb-3 flex items-center gap-2">
            <BadgePercent className="w-4 h-4 text-[#1F6F5F]" />
            شروط الـ Partnership
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <KV label="Madmona base commission" value={`${supplier.commission_rate || 0}%`} />
            <KV label="Extra commission (TBD)" value={`${supplier.commission_extra_rate || 0}%`} />
            <KV label="حالة العقد" value={supplier.contract_status === 'negotiating' ? 'قيد التفاوض' : supplier.contract_status} />
            <KV label="عدد الفروع" value={String(branches.length)} />
          </div>
          <p className="text-xs text-[#6B7280] mt-4 leading-relaxed">
            💡 الـ system شغّال على شرط الـ <span className="text-[#1A2E26] font-bold">full visibility</span> — كل ج داخل أو خارج بـ يتسجل تلقائي. 
            Madmona بـ تاخد بس extra commission من الـ bookings اللي تيجي عن طريقها (مفيش رسوم شهرية أو setup fee).
          </p>
        </section>
      </main>
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function ContractBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    negotiating: { label: 'قيد التفاوض', color: 'bg-amber-50 text-amber-700' },
    signed: { label: 'موقّع', color: 'bg-blue-50 text-blue-700' },
    active: { label: 'نشط', color: 'bg-[#1F6F5F]/10 text-[#1F6F5F]' },
    paused: { label: 'متوقف', color: 'bg-gray-100 text-gray-600' },
    terminated: { label: 'منتهي', color: 'bg-red-50 text-red-600' },
  }
  const m = map[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${m.color}`}>
      {m.label}
    </span>
  )
}

function StatCard({
  icon, label, amount, tone, primary, note,
}: {
  icon: ReactNode
  label: string
  amount: number
  tone: 'positive' | 'negative' | 'madmona' | 'neutral'
  primary?: boolean
  note?: string
}) {
  const toneClass =
    tone === 'positive' ? 'text-[#1F6F5F]' :
    tone === 'negative' ? 'text-red-600' :
    tone === 'madmona' ? 'text-[#1F6F5F]' :
    'text-[#1A2E26]'

  return (
    <div className={`rounded-2xl p-4 md:p-5 border transition-shadow ${
      primary ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white' : 'bg-white border-gray-100 hover:shadow-sm'
    }`}>
      <div className={`flex items-center gap-2 mb-2 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        {icon}
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-black tracking-tight ${primary ? 'text-white' : toneClass}`}>
        {amount.toLocaleString('ar-EG')}
        <span className={`text-sm font-medium ml-1 ${primary ? 'text-white/70' : 'text-[#6B7280]'}`}>ج</span>
      </p>
      {note && (
        <p className={`text-[10px] mt-1 ${primary ? 'text-white/70' : 'text-[#6B7280]'}`}>{note}</p>
      )}
    </div>
  )
}

function BranchCard({
  branch, in: inAmount, out, net, commission, count,
}: {
  branch: Branch
  in: number
  out: number
  net: number
  commission: number
  count: number
}) {
  const isPlaceholder = branch.address?.includes('TBD')
  return (
    <div className={`rounded-2xl p-4 border transition-shadow ${
      isPlaceholder ? 'bg-[#FAFAF7] border-dashed border-gray-300' : 'bg-white border-gray-100 hover:shadow-sm'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">{branch.code || '—'}</p>
          <h3 className="text-sm font-black text-[#1A2E26] leading-tight">{branch.name}</h3>
        </div>
        {isPlaceholder && (
          <span className="text-[9px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">TBD</span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-xs text-[#6B7280] mt-3">مفيش حركات اليوم</p>
      ) : (
        <div className="space-y-1 mt-3 pt-3 border-t border-gray-100">
          <Row label="داخل" value={inAmount} tone="positive" />
          <Row label="خارج" value={out} tone="negative" />
          <Row label="صافي" value={net} tone={net >= 0 ? 'positive' : 'negative'} bold />
          {commission > 0 && (
            <Row label="عمولة مضمونة" value={commission} tone="madmona" tiny />
          )}
        </div>
      )}
    </div>
  )
}

function Row({
  label, value, tone, bold, tiny,
}: {
  label: string
  value: number
  tone: 'positive' | 'negative' | 'madmona'
  bold?: boolean
  tiny?: boolean
}) {
  const color = tone === 'positive' ? 'text-[#1F6F5F]' : tone === 'negative' ? 'text-red-600' : 'text-[#1F6F5F]'
  return (
    <div className={`flex items-center justify-between ${tiny ? 'text-[10px]' : 'text-xs'}`}>
      <span className={tiny ? 'text-[#6B7280]' : 'text-[#6B7280]'}>{label}</span>
      <span className={`font-mono ${color} ${bold ? 'font-black text-sm' : 'font-bold'}`}>
        {value.toLocaleString('ar-EG')} ج
      </span>
    </div>
  )
}

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase text-[#6B7280] ${className}`}>
      {children}
    </th>
  )
}

function TxnRow({ t }: { t: Transaction }) {
  const time = new Date(t.occurred_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  const date = new Date(t.occurred_at).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' })
  return (
    <tr className="border-b border-gray-50 hover:bg-[#FAFAF7]/50 transition-colors">
      <td className="px-3 py-2.5 text-xs text-[#6B7280] font-mono whitespace-nowrap">
        {date} · {time}
      </td>
      <td className="px-3 py-2.5 text-xs text-[#1A2E26]">{t.branch_name}</td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
          t.direction === 'in' ? 'text-[#1F6F5F]' : 'text-red-600'
        }`}>
          {t.direction === 'in' ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
          {t.direction === 'in' ? 'داخل' : 'خارج'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-[#1A2E26]">{t.category_snapshot || '—'}</td>
      <td className="px-3 py-2.5 text-xs text-[#6B7280] max-w-xs truncate">
        {t.description || t.customer_name || '—'}
      </td>
      <td className={`px-3 py-2.5 text-sm text-left font-bold font-mono ${
        t.direction === 'in' ? 'text-[#1F6F5F]' : 'text-red-600'
      }`}>
        {t.direction === 'in' ? '+' : '-'}{Number(t.amount_egp).toLocaleString('ar-EG')} ج
      </td>
      <td className="px-3 py-2.5 text-xs text-left font-mono text-[#6B7280]">
        {t.madmona_commission_amount && Number(t.madmona_commission_amount) > 0 
          ? `${Number(t.madmona_commission_amount).toLocaleString('ar-EG')} ج`
          : '—'}
      </td>
    </tr>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-0.5">{label}</p>
      <p className="text-sm font-black text-[#1A2E26]">{value}</p>
    </div>
  )
}

function ModuleCard({ href, icon, label, primary }: { href: string; icon: ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-2xl p-3 border flex flex-col items-center gap-1.5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
        primary
          ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white'
          : 'bg-white border-gray-100 text-[#1A2E26] hover:border-[#1F6F5F]'
      }`}
    >
      <div className="w-5 h-5">{icon}</div>
      <span className="text-[11px] font-bold text-center leading-tight">{label}</span>
    </Link>
  )
}
