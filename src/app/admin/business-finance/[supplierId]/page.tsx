'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import BusinessSetupSteps from '@/components/BusinessSetupSteps'
import { financeRpc } from '@/lib/financeRpc'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  TrendingUp, TrendingDown, Wallet, Building2, Users, Calendar,
  ArrowDownCircle, ArrowUpCircle, Loader2, RefreshCw, Eye,
  CheckCircle2, AlertCircle, BadgePercent, ChevronDown, Plus, Heart, Package,
  BarChart3, DollarSign, Clock, ShoppingCart, Truck, Gift,
  MessageCircle, FileText, Calculator, FileCheck, Tag, Workflow, UserX, Receipt,
  CalendarClock, Download, ListChecks, Link2, ShieldCheck, ClipboardList,
  FolderKanban, ScrollText, Table2, GitBranchPlus, HardHat,
  Briefcase, Coins, HandCoins, Wrench,
  Banknote, Gavel, CalendarRange, PackageOpen, ClipboardCheck, Fuel, FileBadge,
  Smartphone,
  Car, Ship, BadgeCheck, Store, UtensilsCrossed,
  Sparkles, Activity,
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
  green: '#059669',
  cream: '#FAFAF7',
  dark: '#1A2E26',
  gray: '#6B7280',
  white: '#FFFFFF',
}

// Madmona itself = the platform/company, NOT a B2B client.
const MADMONA_ID = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'


/* ============================================================
   MODULE REGISTRY — single source of truth for back-office tabs.
   Each module declares which verticals it belongs to:
     'core'         -> shown to every client (shared Business OS)
     'beauty_salon' -> Elite
     'polyclinic'   -> Polyclinic
     'restaurant'   -> CityMart
     'contracting'  -> Pillars
   Render = filter(core OR supplier.industry). Adding a client/
   vertical is now a data change, not a JSX change.
   (Phase 2: move this to a `supplier_modules` table = per-client toggles.)
   ============================================================ */
// ⬇️ مصدر واحد لقائمة الموديولات — من src/lib/erpModules.ts (نفس اللي يستخدمه تبويب الإعدادات)
import { MODULE_DEFS, VERTICAL_ALIAS, canOpenModule, type VKey } from '@/lib/erpModules'
// الأيقونات تفضل هنا (بيانات الموديولات نفسها في src/lib/erpModules.ts)
const ICON_MAP: Record<string, any> = {
  confirmations: CheckCircle2, links: Link2, dashboard: BarChart3, team: Users,
  identity: Sparkles,
  permissions: ShieldCheck,
  requests: ClipboardCheck, custody: ShieldCheck, 'flow-tasks': ClipboardList,
  schedule: CalendarClock, monitor: Activity,
  branches: Building2, customers: Heart, expenses: DollarSign, accounting: Calculator,
  attendance: Clock, 'attendance-devices': Smartphone, 'cash-recon': Wallet, payroll: Calculator,
  documents: FileCheck, 'audit-log': FileText, 'at-risk': UserX, reports: Download,
  'vat-report': Receipt, crm: MessageCircle, promotions: Gift,
  inventory: Package, vendors: Truck, 'purchase-orders': ShoppingCart,
  bookings: CalendarClock, 'services-catalog': Tag, services: Workflow,
  shifts: CalendarClock, waitlist: ListChecks, appointments: Calendar,
  'quote-orders': ShoppingCart, showroom: Car, import: Ship, workshop: Wrench,
  brands: BadgeCheck, catalog: Store, projects: FolderKanban,
  'payment-certificates': ScrollText, boq: Table2, 'variation-orders': GitBranchPlus,
  guarantees: ShieldCheck, subcontractors: HardHat, assignments: Briefcase,
  'custody-projects': Coins, advances: HandCoins, equipment: Wrench, pnl: BarChart3,
  'expenses-projects': Receipt, collections: Banknote, tenders: Gavel,
  milestones: CalendarRange, 'daily-reports': ClipboardList, 'material-requests': PackageOpen,
  inspections: ClipboardCheck, 'equipment-logs': Fuel, 'company-docs': FileBadge,
}

const MODULE_REGISTRY: { href: string; Icon: any; label: string; primary?: boolean; v: VKey[] }[] =
  MODULE_DEFS.map((m) => ({ href: m.href, Icon: ICON_MAP[m.href] || FileText, label: m.label, primary: m.primary, v: m.v }))

type Supplier = {
  id: string
  business_name: string
  logo_url: string | null
  industry: string | null
  business_type: string
  contract_status: string
  commission_rate: number | null
  commission_extra_rate: number | null
  contact_phone: string | null
  theme: { accent?: string; accent2?: string; dark?: boolean } | null
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
  // 🔐 صلاحيات اليوزر الحالي جوّه البيزنس ده (null = مالك/أدمن → مفيش قفل)
  const [memberPerms, setMemberPerms] = useState<Record<string, boolean> | null>(null)
  // 💰 (٥/٩/٢٠٢٦) العمولة تظهر للأدمن بس — من الداتابيز (business_overview_bundle.is_admin)
  const [isAdmin, setIsAdmin] = useState(false)
  const isMadmona = supplierId === MADMONA_ID
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBranch, setActiveBranch] = useState<string>('all')
  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [modOverrides, setModOverrides] = useState<Record<string, any>>({})

  async function loadAll() {
    setLoading(true)
    // 🐞 (٥ سبتمبر ٢٠٢٦) كانت ٥ قراءات بعميل anon من غير جلسة ولا توكن —
    //    بعد إغلاق ٢٨/٨ (anon مالوش select على suppliers) أي صاحب بيزنس داخل
    //    بتوكن الواتساب كان بيشوف «شركة غير موجودة» (لمونة أول ما استلم
    //    حسابه). RPC واحدة بتقبل النظامين عبر financeRpc (p_token تلقائي) —
    //    «الدرس الأكبر ٢٥/٨». أرقام العمولة بتتصفّر لغير الأدمن في الداتابيز.
    const { data: bundle } = await financeRpc('business_overview_bundle', { p_supplier_id: supplierId })
    const ok = bundle && bundle.ok
    setSupplier((ok ? bundle.supplier : null) as Supplier | null)
    setIsAdmin(!!(ok && bundle.is_admin))
    setBranches((ok ? bundle.branches : []) as Branch[])
    setTransactions((ok ? bundle.transactions : []) as Transaction[])
    setSummaries((ok ? bundle.summaries : []) as DailySummary[])
    const omap: Record<string, any> = {}
    ;(ok && Array.isArray(bundle.modules) ? bundle.modules : []).forEach((r: any) => { omap[r.module_href] = r })
    setModOverrides(omap)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const id = setInterval(loadAll, 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  // 🔐 صلاحيات اليوزر الحالي جوّه البيزنس ده — نفس المصدر اللي بيستخدمه الحارس
  //    في الـlayout، عشان اللي بيظهر في الكروت يبقى هو نفسه اللي بيفتح فعلًا.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) return
        const { data } = await (supabaseBrowser.rpc as unknown as (
          fn: string, args: Record<string, unknown>,
        ) => Promise<{ data: { full?: boolean; is_staff?: boolean; permissions?: Record<string, boolean> } | null }>)(
          'my_supplier_access', { p_supplier_id: supplierId },
        )
        if (cancelled) return
        if (data?.is_staff === true && data.full !== true) setMemberPerms(data.permissions ?? {})
        else setMemberPerms(null)
      } catch { /* مالك/أدمن أو توكن — مفيش قفل */ }
    })()
    return () => { cancelled = true }
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

  // Effective module tiles = MODULE_REGISTRY filtered by core/industry, then overridden by supplier_modules (toggle/reorder/rename/promote). Empty overrides = defaults.
  const visibleModules = useMemo(() => {
    const industry = (VERTICAL_ALIAS[(supplier?.industry || '').toLowerCase()] || '') as VKey
    const baseVisible = (m: { v: VKey[] }) => m.v.includes('core') || m.v.includes(industry)
    return MODULE_REGISTRY
      .map((m, idx) => {
        const o = modOverrides[m.href]
        const shown = o ? o.enabled !== false : baseVisible(m)
        const order = (o && o.display_order != null) ? o.display_order : 1000 + idx
        return {
          href: m.href,
          Icon: m.Icon,
          label: (o && o.label_override) ? o.label_override : m.label,
          primary: (o && o.is_primary != null) ? o.is_primary : m.primary,
          isCore: m.v.includes('core'),
          order,
          shown,
        }
      })
      .filter((m) => m.shown)
      // 🔐 (٢٠ أغسطس ٢٠٢٦) الموظف يشوف الكروت اللي صلاحياته بتسمح بيها بس —
      //    محمد: «عايز التاب بتاع الفاينانس يفتح لأي موظف طبقًا لصلاحيته».
      //    `memberPerms === null` = مالك أو أدمن أو داخل بتوكن → يشوف الكل.
      .filter((m) => memberPerms === null || canOpenModule(m.href, false, memberPerms))
      .sort((a, b) => a.order - b.order)
  }, [supplier, modOverrides, memberPerms])

  // لون البراند بتاع الـbusiness (من suppliers.theme) + اسم النشاط للتجميع.
  const accent = supplier?.theme?.accent || PALETTE.green
  const vertLabel = ({ beauty_salon: 'الصالون', spa: 'السبا', vehicle_agency: 'المعرض', contracting: 'المقاولات', restaurant: 'المطعم', clinic: 'العيادة', polyclinic: 'العيادة', gym: 'الجيم', retail_shop: 'المحل', retail: 'المتجر', real_estate: 'العقارات', factory: 'المصنع', tourism: 'السياحة', marine: 'المراكب', home_services: 'الخدمات', hotel: 'الفندق' } as Record<string, string>)[supplier?.industry || ''] || 'النشاط'
  const vertModules = useMemo(() => visibleModules.filter((m) => !m.isCore), [visibleModules])
  const coreModules = useMemo(() => visibleModules.filter((m) => m.isCore), [visibleModules])

  if (loading && !supplier) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
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
            <div className="flex items-center gap-3">
              {supplier.logo_url && (
                <img
                  src={supplier.logo_url}
                  alt={supplier.business_name}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl object-cover border border-gray-100 shadow-sm shrink-0"
                />
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: accent }}>
                    {isMadmona ? 'مضمونة · الإدارة الداخلية' : 'لوحة الإدارة · مضمونة'}
                  </p>
                  <ContractBadge status={supplier.contract_status} />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
                  {supplier.business_name}
                </h1>
                <p className="text-sm text-[#6B7280] mt-1">
                  {(({ beauty_salon: 'صالون تجميل', spa: 'سبا', vehicle_agency: 'توكيلات مركبات', contracting: 'مقاولات · فئة أولى', restaurant: 'مطعم', clinic: 'عيادة', polyclinic: 'بوليكلينك', gym: 'جيم', retail_shop: 'محل تجزئة' } as Record<string, string>)[supplier.industry || ''] || supplier.industry || '')} ·{' '}
                  {branches.length} فروع · {supplier.contact_phone}
                </p>
              </div>
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
              className="px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 hover:shadow-md transition-shadow"
              style={{ backgroundColor: accent }}
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
                    activePeriod === p ? 'text-white shadow-sm' : 'text-[#6B7280] hover:text-[#1A2E26]'
                  }`}
                  style={activePeriod === p ? { backgroundColor: accent } : undefined}
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
        {/* 🧭 (٥/٩/٢٠٢٦) خطوات استكمال حساب الشركة — محمد: «نمشي معاه بخطوات
            لحد ما يخلص بناء الشركة بالكامل». بتتحسب من الداتا الحقيقية. */}
        <BusinessSetupSteps supplierId={supplierId} />
        {/* MODULES — مجمّعة: وحدات النشاط (بلون البراند) ثم الإدارة العامة */}
        {vertModules.length > 0 && (
          <section>
            <h2 className="text-sm font-black tracking-wider uppercase mb-3 flex items-center gap-2" style={{ color: accent }}>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
              وحدات {vertLabel}
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {vertModules.map((m) => {
                const Icon = m.Icon
                return (
                  <ModuleCard
                    key={m.href}
                    href={`/admin/business-finance/${supplierId}/${m.href}`}
                    icon={<Icon />}
                    label={m.label}
                    primary={m.primary}
                    accent={accent}
                  />
                )
              })}
            </div>
          </section>
        )}
        <section>
          <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />
            الإدارة العامة
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {coreModules.map((m) => {
              const Icon = m.Icon
              return (
                <ModuleCard
                  key={m.href}
                  href={`/admin/business-finance/${supplierId}/${m.href}`}
                  icon={<Icon />}
                  label={m.label}
                  primary={m.primary}
                  accent={accent}
                />
              )
            })}
          </div>
        </section>

        {/* TOP: 4 stat cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            icon={<ArrowDownCircle className="w-5 h-5" />}
            label="إجمالي داخل"
            amount={stats.totalIn}
            tone="positive"
            accent={accent}
          />
          <StatCard
            icon={<ArrowUpCircle className="w-5 h-5" />}
            label="إجمالي خارج"
            amount={stats.totalOut}
            tone="negative"
            accent={accent}
          />
          <StatCard
            icon={<Wallet className="w-5 h-5" />}
            label="صافي"
            amount={stats.net}
            tone={stats.net >= 0 ? 'positive' : 'negative'}
            primary
            accent={accent}
          />
          {isAdmin && (
          <StatCard
            icon={<BadgePercent className="w-5 h-5" />}
            label="كوميشن مضمونة"
            amount={stats.madmonaEarned}
            tone="madmona"
            note={`${stats.txnCount} عملية`}
          />
          )}
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
                    {isAdmin && <Th className="text-left">كوميشن</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.slice(0, 50).map((t) => (
                    <TxnRow key={t.id} t={t} showCommission={isAdmin} />
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

        {/* Footer: contract terms — hidden for Madmona (it's the platform, not a partner) */}
        {!isMadmona && isAdmin && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-[#1A2E26] mb-3 flex items-center gap-2">
            <BadgePercent className="w-4 h-4 text-[#059669]" />
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
        )}
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
    active: { label: 'نشط', color: 'bg-[#34D399]/10 text-[#059669]' },
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
  icon, label, amount, tone, primary, note, accent = '#059669',
}: {
  icon: ReactNode
  label: string
  amount: number
  tone: 'positive' | 'negative' | 'madmona' | 'neutral'
  primary?: boolean
  note?: string
  accent?: string
}) {
  // الفلوس بتفضل بلونها الدلالي (أخضر داخل / أحمر خارج)؛ لون البراند
  // بيتستخدم بس في خلفية الكارد الرئيسي عشان الدخل مايظهرش بلون خسارة.
  const valueColor =
    primary ? '#FFFFFF' :
    tone === 'negative' ? '#DC2626' :
    tone === 'neutral' ? '#1A2E26' :
    '#059669'

  return (
    <div className={`rounded-2xl p-4 md:p-5 border transition-shadow ${primary ? '' : 'bg-white border-gray-100 hover:shadow-sm'}`}
      style={primary ? { backgroundColor: accent, borderColor: accent } : undefined}>
      <div className={`flex items-center gap-2 mb-2 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        {icon}
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: valueColor }}>
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
  const color = tone === 'positive' ? 'text-[#059669]' : tone === 'negative' ? 'text-red-600' : 'text-[#059669]'
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

function TxnRow({ t , showCommission }: { t: Transaction ; showCommission?: boolean }) {
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
          t.direction === 'in' ? 'text-[#059669]' : 'text-red-600'
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
        t.direction === 'in' ? 'text-[#059669]' : 'text-red-600'
      }`}>
        {t.direction === 'in' ? '+' : '-'}{Number(t.amount_egp).toLocaleString('ar-EG')} ج
      </td>
      {showCommission && (
      <td className="px-3 py-2.5 text-xs text-left font-mono text-[#6B7280]">
        {t.madmona_commission_amount && Number(t.madmona_commission_amount) > 0 
          ? `${Number(t.madmona_commission_amount).toLocaleString('ar-EG')} ج`
          : '—'}
      </td>
      )}
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

function ModuleCard({ href, icon, label, primary, accent = '#059669' }: { href: string; icon: ReactNode; label: string; primary?: boolean; accent?: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl p-3 border flex flex-col items-center gap-1.5 transition-all hover:shadow-md hover:-translate-y-0.5"
      style={primary
        ? { backgroundColor: accent, borderColor: accent, color: '#FFFFFF' }
        : { backgroundColor: '#FFFFFF', borderColor: '#F0F0EC', color: '#1A2E26' }}
    >
      <div className="w-5 h-5" style={{ color: primary ? '#FFFFFF' : accent }}>{icon}</div>
      <span className="text-[11px] font-bold text-center leading-tight">{label}</span>
    </Link>
  )
}
