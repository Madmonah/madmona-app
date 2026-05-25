'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Building2, TrendingUp, Wallet, CircleDollarSign, Users, Store, ClipboardList,
  Bot, UserCog, Truck, RefreshCw, Loader2, ChevronLeft,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const fmt = (n: any) => Number(n || 0).toLocaleString('en-US')

const TEAM_AR: Record<string, string> = {
  sales: 'المبيعات', marketing: 'التسويق', operations: 'العمليات', creative: 'الإبداع',
  intelligence: 'الذكاء', support: 'الدعم', growth: 'النمو', strategic: 'الاستراتيجي', unassigned: 'غير محدد',
}
const SOURCE_AR: Record<string, string> = {
  olx_individuals: 'OLX أفراد', 'supplier-hunter-ai': 'هانتر AI', google_maps: 'جوجل مابس',
  web_search: 'بحث ويب', partner_personal: 'شخصي', manual: 'يدوي', unknown: 'غير معروف',
}

export default function CompanyOverviewPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    // @ts-expect-error rpc types not generated
    const { data: res } = await supabase.rpc('get_madmona_company_overview')
    setData(res)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const o = data?.overview
  const leads: any[] = data?.leads_by_source || []
  const teams: any[] = data?.employees_by_team || []
  const revenue: any[] = data?.revenue_by_source || []
  const expenses: any[] = data?.expenses_by_category || []
  const maxLead = Math.max(1, ...leads.map(l => Number(l.count)))
  const maxTeam = Math.max(1, ...teams.map(t => Number(t.runs)))

  if (loading && !data) return <Loader />

  return (
    <div className="relative min-h-screen bg-[#FAFAF7] overflow-x-hidden" dir="rtl">
      {/* gradient mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10" style={{
        background:
          'radial-gradient(60% 50% at 85% 0%, rgba(47,160,132,0.10), transparent 60%),' +
          'radial-gradient(50% 45% at 10% 10%, rgba(31,111,95,0.08), transparent 60%)',
      }} />

      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-[#1F6F5F]/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/admin/dashboard" className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للداشبورد
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D4A017] to-[#1F6F5F] flex items-center justify-center shadow-lg shadow-[#1F6F5F]/20">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-0.5">MADMONA · COMPANY</p>
                <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">مضمونة كشركة</h1>
              </div>
            </div>
            <button onClick={load} className="p-2.5 rounded-xl bg-white border border-gray-100 text-[#1A2E26] shadow-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-7 pb-16">

        {/* ===== P&L ===== */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1 rounded-3xl p-5 bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#1F6F5F] text-white shadow-xl shadow-[#1F6F5F]/20">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <CircleDollarSign className="w-4 h-4" />
              <p className="text-[11px] font-bold tracking-wider uppercase">صافي الربح</p>
            </div>
            <p className="text-4xl font-black font-mono">{fmt(o?.net_profit_egp)} <span className="text-lg">ج</span></p>
            <p className="text-[11px] opacity-80 mt-1">إيراد − مصاريف</p>
          </div>
          <Stat icon={TrendingUp} label="الإيراد" value={`${fmt(o?.revenue_egp)} ج`} hint="من كل المصادر" />
          <Stat icon={Wallet} label="المصاريف" value={`${fmt(o?.expenses_egp)} ج`} hint={Number(o?.expenses_egp) ? 'مسجّلة' : 'مفيش مصاريف مسجّلة لسه'} />
        </section>

        {/* ===== Customers ===== */}
        <Section title="العملاء" subtitle="الجهتين اللي مضمونة بتخدمهم">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Stat icon={Users} label="مؤجّرين" value={fmt(o?.renters)} hint="عملاء التطبيق" />
            <Stat icon={Store} label="مضيفين مسجّلين" value={fmt(o?.registered_listers)} hint="بيزنس معتمد" />
            <Stat icon={ClipboardList} label="مضيفين في الـpipeline" value={fmt(o?.lead_listers)} hint="ليدز جاهزة للتحويل" />
          </div>
          {leads.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280] mb-3">الليدز حسب المصدر</h4>
              <div className="space-y-2.5">
                {leads.map((l, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#1A2E26] w-24 shrink-0">{SOURCE_AR[l.source] || l.source}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-[#FAFAF7] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#2FA084] to-[#1F6F5F]"
                        style={{ width: `${(Number(l.count) / maxLead) * 100}%` }} />
                    </div>
                    <span className="text-xs font-black font-mono text-[#1A2E26] w-10 text-left">{fmt(l.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ===== Employees ===== */}
        <Section title="الموظفين" subtitle="فريق مضمونة — أجينتس + بشر">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Stat icon={Bot} label="أجينتس AI" value={fmt(o?.ai_agents)} hint={`${fmt(o?.ai_agents_active)} شغّال · نجاح ${o?.ai_success_pct ?? 0}%`} />
            <Stat icon={UserCog} label="موظفين بشر" value={fmt(o?.human_employees)} hint="مضمونة-HQ" />
            <Stat icon={Truck} label="موردين" value={fmt(o?.vendors)} hint="اللي بندفعلهم" />
          </div>
          {teams.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h4 className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280] mb-3">الأجينتس حسب الفريق (بالإنتاج)</h4>
              <div className="space-y-2.5">
                {teams.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#1A2E26] w-20 shrink-0">{TEAM_AR[t.team] || t.team}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-[#FAFAF7] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-l from-[#6FCF97] to-[#1F6F5F]"
                        style={{ width: `${(Number(t.runs) / maxTeam) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-[#6B7280] w-28 text-left shrink-0">
                      {t.count} موظف · {fmt(t.runs)} مهمة
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ===== Revenue by source ===== */}
        <Section title="الإيراد بالمصدر" subtitle="كل جنيه معروف جاي منين">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {revenue.length === 0 ? (
              <Empty text="مفيش إيراد مسجّل لسه" />
            ) : revenue.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-[#1A2E26]">{r.business || '—'}</p>
                  <p className="text-[11px] text-[#6B7280]">
                    {r.source === 'marketplace_commission' ? 'عمولة ماركت بليس' : 'عمولة نظام'}
                    {' · '}{r.origin === 'marketplace' ? 'من الماركت بليس' : 'بره الماركت بليس'}
                  </p>
                </div>
                <p className="text-sm font-black font-mono text-[#1F6F5F]">{fmt(r.amount)} ج</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ===== Expenses by category ===== */}
        <Section title="المصاريف بالفئة" subtitle="مصاريف الشركة متقسّمة">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {expenses.length === 0 ? (
              <Empty text="مفيش مصاريف مسجّلة لسه" />
            ) : expenses.map((x, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <p className="text-sm font-bold text-[#1A2E26]">{x.category}</p>
                <p className="text-sm font-black font-mono text-[#1A2E26]">{fmt(x.amount)} ج</p>
              </div>
            ))}
          </div>
        </Section>

      </main>
    </div>
  )
}

function Stat({ icon: Icon, label, value, hint }: any) {
  return (
    <div className="rounded-3xl p-5 bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-2 text-[#1F6F5F]">
        <Icon className="w-4 h-4" />
        <p className="text-[11px] font-bold tracking-wider uppercase text-[#6B7280]">{label}</p>
      </div>
      <p className="text-3xl font-black text-[#1A2E26] font-mono">{value}</p>
      {hint && <p className="text-[11px] text-[#6B7280] mt-1">{hint}</p>}
    </div>
  )
}

function Section({ title, subtitle, children }: any) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-black text-[#1A2E26]">{title}</h2>
        {subtitle && <p className="text-xs text-[#6B7280]">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function Empty({ text }: any) {
  return <div className="py-8 text-center text-sm font-bold text-[#6B7280]">{text}</div>
}

function Loader() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
      <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
    </div>
  )
}
