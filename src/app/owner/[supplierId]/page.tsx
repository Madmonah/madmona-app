'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { safeStorage } from '@/lib/safe-storage'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'
import {
  Loader2, LogOut, TrendingUp, Users, Calendar, Package, DollarSign,
  Building2, BarChart3, Heart, Sparkles, CheckCircle2, Clock, AlertCircle, ShieldCheck,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function OwnerDashboard({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const router = useRouter()
  const [access, setAccess] = useState<any>(null)
  const [supplier, setSupplier] = useState<any>(null)
  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  async function init() {
    setLoading(true)
    const token = safeStorage.get('madmona_owner_token')
    if (!token) {
      router.push('/owner/login')
      return
    }
    // Verify access via session token
    const { data: acc } = await supabase.rpc('owner_check_by_token', { p_token: token, p_supplier_id: supplierId })
    if (!acc?.allowed) {
      setDenied(true)
      setLoading(false)
      return
    }
    setAccess(acc)

    // Load supplier + KPIs
    const { data: s } = await supabase.from('suppliers').select('business_name, industry, contact_phone').eq('id', supplierId).single()
    setSupplier(s)
    const { data: k } = await supabase.rpc('admin_dashboard_kpis', { p_supplier_id: supplierId })
    setKpis(k)
    setLoading(false)
  }

  useEffect(() => { init() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  async function logout() {
    const token = safeStorage.get('madmona_owner_token')
    if (token) {
      await rpcSafe(supabase, 'owner_logout', { p_token: token })
      safeStorage.remove('madmona_owner_token')
    }
    router.push('/owner/login')
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div>

  if (denied) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl border border-gray-100 p-8 max-w-md text-center">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-black text-[#1A2E26]">مالكش صلاحية</h2>
          <p className="text-sm text-[#6B7280] mt-2">حسابك مش مربوط بالشركة دي. تواصل مع إدارة مضمونة.</p>
          <button onClick={logout} className="mt-4 px-5 py-2.5 rounded-xl bg-[#FA8125] text-white text-sm font-bold">تسجيل خروج</button>
        </div>
      </div>
    )
  }

  const revenue = kpis?.revenue || {}
  const isOwnerOrManager = access?.role === 'owner' || access?.role === 'manager'

  // Modules visible based on role
  const modules = [
    { href: 'dashboard', icon: <BarChart3 />, label: 'التقارير', roles: ['owner','manager','accountant','viewer'] },
    { href: 'bookings', icon: <Calendar />, label: 'الحجوزات', roles: ['owner','manager','viewer'] },
    { href: 'customers', icon: <Heart />, label: 'العملاء', roles: ['owner','manager'] },
    { href: 'team', icon: <Users />, label: 'الفريق', roles: ['owner','manager'] },
    { href: 'inventory', icon: <Package />, label: 'المخزون', roles: ['owner','manager'] },
    { href: 'services-catalog', icon: <Sparkles />, label: 'الخدمات', roles: ['owner','manager'] },
    { href: 'expenses', icon: <DollarSign />, label: 'المصاريف', roles: ['owner','accountant'] },
    { href: 'shifts', icon: <Clock />, label: 'مواعيد العمل', roles: ['owner','manager'] },
    { href: 'reports', icon: <BarChart3 />, label: 'تصدير', roles: ['owner','accountant'] },
    { href: 'branches', icon: <Building2 />, label: 'الفروع', roles: ['owner'] },
  ].filter(m => m.roles.includes(access?.role))

  const ROLE_LABELS: Record<string, string> = { owner: 'المالك', manager: 'مدير', accountant: 'محاسب', viewer: 'مشاهدة' }

  return (
    <div className="relative min-h-screen bg-[#FAFAF7] text-[#1A2E26] overflow-x-hidden" dir="rtl">
      <div className="pointer-events-none fixed inset-0 -z-10" style={{
        background:
          'radial-gradient(60% 50% at 88% -6%, rgba(47,160,132,0.12), transparent 60%),' +
          'radial-gradient(52% 46% at 6% 6%, rgba(250, 129, 37,0.10), transparent 60%),' +
          'radial-gradient(42% 40% at 50% 116%, rgba(212,160,23,0.07), transparent 60%)',
      }} />
      <header className="relative overflow-hidden text-white bg-gradient-to-l from-[#D4A017] via-[#2FA084] to-[#FA8125]">
        <div className="absolute -top-10 -left-10 w-44 h-44 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70 mb-1">بوابة الشركاء · مضمونة</p>
              <h1 className="text-2xl md:text-3xl font-black">{supplier?.business_name}</h1>
              <p className="text-sm text-white/80 mt-1">
                أهلاً {access?.full_name || ''} · <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold">{ROLE_LABELS[access?.role] || access?.role}</span>
              </p>
            </div>
            <button onClick={logout} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center gap-2">
              <LogOut className="w-4 h-4" /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <OwnerStat icon={<TrendingUp />} label="إيراد آخر 30 يوم" value={`${Number(revenue.total || 0).toLocaleString()} ج`} primary />
          <OwnerStat icon={<Calendar />} label="حجوزات" value={revenue.bookings_count || 0} />
          <OwnerStat icon={<CheckCircle2 />} label="خدمات مكتملة" value={revenue.completed_count || 0} />
          <OwnerStat icon={<DollarSign />} label="مصاريف" value={`${Number(kpis?.expenses?.total || 0).toLocaleString()} ج`} />
        </section>

        {/* Modules */}
        <section>
          <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-3">🎛️ الإدارة</h2>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {modules.map(m => (
              <Link
                key={m.href}
                href={`/admin/business-finance/${supplierId}/${m.href}`}
                className="group bg-white rounded-2xl p-4 border border-black/5 shadow-sm shadow-black/[0.04] flex flex-col items-center gap-2 hover:shadow-md hover:border-[#FA8125]/30 hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-[#FA8125]/10 text-[#FA8125] flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-[#2FA084] group-hover:to-[#FA8125] group-hover:text-white transition-colors"><div className="w-5 h-5">{m.icon}</div></div>
                <span className="text-xs font-bold text-[#1A2E26] text-center">{m.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Top services + branches */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-3">أكثر الخدمات مبيعاً</h3>
            <div className="space-y-2">
              {(kpis?.top_services || []).slice(0, 5).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[#1A2E26] font-bold">{s.service}</span>
                  <span className="font-mono text-[#FA8125] font-bold">{Number(s.revenue || 0).toLocaleString()} ج</span>
                </div>
              ))}
              {(!kpis?.top_services || kpis.top_services.length === 0) && <p className="text-xs text-[#6B7280]">لا توجد بيانات بعد</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-3">أداء الفروع</h3>
            <div className="space-y-2">
              {(kpis?.by_branch || []).map((b: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[#1A2E26] font-bold">{b.branch}</span>
                  <span className="font-mono text-[#FA8125] font-bold">{Number(b.revenue || 0).toLocaleString()} ج</span>
                </div>
              ))}
              {(!kpis?.by_branch || kpis.by_branch.length === 0) && <p className="text-xs text-[#6B7280]">لا توجد بيانات بعد</p>}
            </div>
          </div>
        </section>

        <section className="bg-[#FA8125]/5 border border-[#FA8125]/20 rounded-2xl p-4 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#FA8125] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#6B7280] leading-relaxed">
            دي بوابتك الخاصة كـ {ROLE_LABELS[access?.role]}. بتشوف بيانات شركتك بس. أي استفسار، تواصل مع إدارة مضمونة على madmonacairo.com.
          </p>
        </section>
      </main>
    </div>
  )
}

function OwnerStat({ icon, label, value, primary }: any) {
  return (
    <div className={`rounded-2xl p-4 border transition-all ${primary ? 'bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#FA8125] border-transparent text-white shadow-lg shadow-[#FA8125]/25' : 'bg-white border-black/5 shadow-sm shadow-black/[0.04]'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        <div className="w-4 h-4">{icon}</div>
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-xl md:text-2xl font-black ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p>
    </div>
  )
}
