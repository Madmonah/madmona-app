'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, Lock, AlertCircle, ArrowRight, ExternalLink, RefreshCw,
  // B2B
  Building2, Users, Wallet, TrendingUp, BadgePercent, Star,
  Clock, MapPin, Heart, Receipt, ShieldCheck, QrCode, ShieldAlert,
  // B2C
  Package, Calendar, Phone, Eye, Rss, FolderTree,
  // AI
  Bot, Sparkles, Brain, GitBranch, Activity, Zap, Network,
  // WA
  MessageSquare, Send, Inbox,
  // Marketing
  Megaphone, Video, Image as ImageIcon, Newspaper, Bell, Target,
  // Analytics
  BarChart3, Compass, Lightbulb, ScrollText, FileBarChart,
  // Ops
  Shield, FlaskConical, Handshake, Workflow, ClipboardList,
  // System
  Database, Cloud, Globe, Mail, Settings, BookOpen,
  // CTA
  Plus, ChevronLeft, CheckCircle2, XCircle, Crown,
} from 'lucide-react'

/* ============================================================
   /admin/dashboard — v2 (Phase B.10)
   
   Comprehensive Madmona admin hub, locked 5-color palette.
   Sections: B2B Partners · B2C Marketplace · AI OS · WhatsApp ·
             Marketing · Analytics · Operations · System · External
   ============================================================ */

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

type B2BPartner = {
  id: string
  business_name: string
  industry: string | null
  contract_status: string
  commission_pct: number
  branches: number
  employees: number
  revenue_month: number
  commission_month: number
  avg_rating: number | null
}

type DashboardData = {
  b2b: {
    active_partners: number
    leads_ready: number
    commission_today: number
    commission_month: number
    gmv_month: number
    transactions_today: number
    partners: B2BPartner[]
  }
  b2c: {
    bookings_total: number
    bookings_month: number
    bookings_pending: number
    gmv_month: number
    commission_month: number
    suppliers_approved: number
    suppliers_pending: number
    listings_published: number
    listings_draft: number
    total_customers: number
    total_reviews: number
    avg_rating: number
    push_subscribers: number
  }
  ai: {
    agents_total: number
    agents_enabled: number
    agents_healthy: number
    agents_stale: number
    alerts_unresolved: number
    runs_today: number
    runs_failed_today: number
  }
  whatsapp: {
    queue_pending: number
    queue_failed: number
    review_pending: number
    sent_today: number
    cold_leads_total: number
    cold_leads_new: number
    cold_leads_contacted: number
  }
  recent_b2b_txns: Array<{
    id: string; direction: 'in' | 'out'; amount_egp: number;
    category_snapshot: string | null; description: string | null;
    occurred_at: string; madmona_commission_amount: number | null;
    business_name: string; branch_name: string | null;
  }>
  recent_ratings: Array<{
    id: string; rating: number; comment: string | null;
    customer_name_snapshot: string | null;
    service_name_snapshot: string | null;
    created_at: string;
    business_name: string; branch_name: string | null;
  }>
}

export default function AdminDashboardV2() {
  const [stage, setStage] = useState<Stage>('loading')
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }

      setRefreshing(true)
      // @ts-expect-error
      const { data: stats, error: rpcError } = await supabaseBrowser.rpc('get_admin_dashboard_v2')
      setRefreshing(false)

      if (rpcError) {
        const msg = (rpcError.message || '').toLowerCase()
        if (msg.includes('forbidden')) { setStage('forbidden'); return }
        setError(rpcError.message)
        setStage('ready')
        return
      }
      setData(stats as DashboardData)
      setStage('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التحميل')
      setStage('ready')
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#1F6F5F] mx-auto mb-3" />
          <h1 className="text-lg font-black text-[#1A2E26] mb-2">سجل دخول الأول</h1>
          <Link href="/auth/login?redirect=/admin/dashboard"
            className="block bg-[#1F6F5F] text-white py-3 rounded-xl font-bold mt-3">
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-black text-[#1A2E26]">للأدمن فقط</h1>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-[#6B7280] mb-4">{error || 'مفيش بيانات'}</p>
          <button onClick={load} className="bg-[#1F6F5F] text-white px-5 py-2.5 rounded-xl font-bold">حاول تاني</button>
        </div>
      </div>
    )
  }

  const aiHealthRatio = data.ai.agents_total > 0
    ? Math.round((data.ai.agents_healthy / data.ai.agents_total) * 100) : 0

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* ===== HEADER ===== */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/account"
              className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4 text-[#6B7280]" />
            </Link>
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-0.5">
                MADMONA · ADMIN
              </p>
              <h1 className="text-base md:text-lg font-black text-[#1A2E26] leading-none">
                مركز التحكم
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Health pill */}
            <div className="hidden md:flex items-center gap-1.5 bg-[#FAFAF7] rounded-full px-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${
                aiHealthRatio >= 90 ? 'bg-[#1F6F5F]' :
                aiHealthRatio >= 70 ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-[10px] font-bold text-[#1A2E26]">
                AI: {data.ai.agents_healthy}/{data.ai.agents_total}
              </span>
            </div>

            {data.ai.alerts_unresolved > 0 && (
              <Link href="/admin/alerts"
                className="px-2.5 py-1.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold flex items-center gap-1 hover:bg-red-100 transition-colors">
                <Bell className="w-3 h-3" />
                {data.ai.alerts_unresolved} تنبيه
              </Link>
            )}

            <button onClick={load} disabled={refreshing}
              className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors">
              <RefreshCw className={`w-4 h-4 text-[#6B7280] ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8 pb-12">

        {/* ===== HERO KPIs ===== */}
        <section>
          <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6B7280] mb-3">
            الأرقام اللي بـ تهم
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={<BadgePercent />}
              label="عمولة مضمونة — الشهر"
              value={`${Number(data.b2b.commission_month + data.b2c.commission_month).toLocaleString('ar-EG')} ج`}
              note={`${data.b2b.commission_month.toLocaleString('ar-EG')} B2B + ${data.b2c.commission_month.toLocaleString('ar-EG')} B2C`}
              primary
            />
            <KpiCard
              icon={<Building2 />}
              label="شركاء B2B"
              value={data.b2b.active_partners}
              note={`${data.b2b.leads_ready} lead جاهز للتحويل`}
              tone="positive"
            />
            <KpiCard
              icon={<Users />}
              label="موردين B2C"
              value={data.b2c.suppliers_approved}
              note={data.b2c.suppliers_pending > 0 ? `+ ${data.b2c.suppliers_pending} في الانتظار` : 'كله متعمد'}
              tone="neutral"
            />
            <KpiCard
              icon={<Bot />}
              label="نظام AI"
              value={`${data.ai.agents_enabled}/${data.ai.agents_total}`}
              note={data.ai.alerts_unresolved > 0 ? `⚠️ ${data.ai.alerts_unresolved} تنبيه` : 'كله شغال ✓'}
              tone={data.ai.alerts_unresolved > 0 ? 'negative' : 'positive'}
            />
          </div>
        </section>

        {/* ===== QUICK ACTIONS (top of fold) ===== */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <QuickAction href="/admin/ai-assistant" icon={<Sparkles className="w-5 h-5" />}
            title="المساعد الذكي" sub="اومر الـ agents بالعامية" accent />
          <QuickAction href="/admin/business-partners" icon={<Building2 className="w-5 h-5" />}
            title="شركاء B2B" sub={`${data.b2b.active_partners} نشط · ${data.b2b.leads_ready} lead`} />
          <QuickAction href="/admin/wa-review" icon={<MessageSquare className="w-5 h-5" />}
            title="مراجعة WhatsApp" sub={data.whatsapp.review_pending > 0 ? `${data.whatsapp.review_pending} في الانتظار` : 'كله متراجع'} 
            badge={data.whatsapp.review_pending > 0 ? data.whatsapp.review_pending : undefined} />
          <QuickAction href="/admin/ai-os" icon={<Bot className="w-5 h-5" />}
            title="AI OS" sub={`${data.ai.agents_enabled} agent شغال`} />
        </section>

        {/* ============ B2B SECTION ============ */}
        <Section title="💼 شركاء B2B" subtitle="Phase B · مضمونة بـ تحضن نشاط الفرع كامل">
          {/* B2B sub-KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SubKpi label="عمولة اليوم" value={`${data.b2b.commission_today.toLocaleString('ar-EG')} ج`} />
            <SubKpi label="GMV الشهر" value={`${data.b2b.gmv_month.toLocaleString('ar-EG')} ج`} />
            <SubKpi label="معاملات اليوم" value={data.b2b.transactions_today} />
            <SubKpi label="Leads جاهزة" value={data.b2b.leads_ready} />
          </div>

          {/* Partner cards */}
          {data.b2b.partners.length > 0 ? (
            <div className="space-y-3 mb-4">
              {data.b2b.partners.map((p) => <PartnerCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center mb-4">
              <Building2 className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm text-[#6B7280]">لسه ما فيش شركاء — حوّل lead</p>
            </div>
          )}

          {/* B2B tools */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/business-partners" icon={<Building2 />} title="كل الشركاء" sub="إدارة + leads" />
            <ToolCard href="/admin/business-partners/new" icon={<Plus />} title="ضيف شريك جديد" sub="3-step wizard" />
            <ToolCard href="/admin/leads" icon={<Phone />} title="Cold Leads" sub={`${data.whatsapp.cold_leads_total} موجود`} />
            <ToolCard href="/admin/leads-feed" icon={<Rss />} title="Leads Feed" sub="Realtime stream" />
          </div>
        </Section>

        {/* ============ B2C MARKETPLACE ============ */}
        <Section title="🛍️ Marketplace (B2C)" subtitle="رنتال مفتوح للعملاء">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SubKpi label="حجوزات الشهر" value={data.b2c.bookings_month}
              note={`${data.b2c.bookings_total} إجمالي`} />
            <SubKpi label="GMV الشهر" value={`${Number(data.b2c.gmv_month).toLocaleString('ar-EG')} ج`} />
            <SubKpi label="إعلانات منشورة" value={data.b2c.listings_published}
              note={data.b2c.listings_draft > 0 ? `${data.b2c.listings_draft} مسودة` : ''} />
            <SubKpi label="عملاء + reviews" value={data.b2c.total_customers}
              note={data.b2c.total_reviews > 0 ? `${data.b2c.avg_rating} ⭐` : ''} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/listings" icon={<Package />} title="الإعلانات" sub={`${data.b2c.listings_published} منشور`}
              badge={data.b2c.listings_draft || undefined} />
            <ToolCard href="/admin/sup" icon={<Users />} title="الموردين" sub={`${data.b2c.suppliers_approved} متعمد`}
              badge={data.b2c.suppliers_pending || undefined} />
            <ToolCard href="/admin/marketplace-bookings" icon={<Calendar />} title="الحجوزات" sub={`${data.b2c.bookings_pending} بانتظار`} />
            <ToolCard href="/admin/categories" icon={<FolderTree />} title="الفئات" sub="Categories + attrs" />
            <ToolCard href="/admin/payouts" icon={<Wallet />} title="المدفوعات" sub="Payouts" />
            <ToolCard href="/admin/listing-performance" icon={<FileBarChart />} title="أداء الإعلانات" sub="Performance" />
            <ToolCard href="/admin/notifications" icon={<Bell />} title="إشعارات Push" sub={`${data.b2c.push_subscribers} مشترك`} />
            <ToolCard href="/" icon={<Eye />} title="معاينة الموقع" sub="الواجهة العامة" />
          </div>
        </Section>

        {/* ============ AI OS ============ */}
        <Section title="🤖 AI OS" subtitle="49 agent عبر 8 فرق · self-improving prompts">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SubKpi label="Agents شغالين" value={`${data.ai.agents_enabled}/${data.ai.agents_total}`} />
            <SubKpi label="Healthy" value={data.ai.agents_healthy} tone="positive" />
            <SubKpi label="Stale/Warning" value={data.ai.agents_stale} tone={data.ai.agents_stale > 0 ? 'negative' : 'neutral'} />
            <SubKpi label="Runs اليوم" value={data.ai.runs_today}
              note={data.ai.runs_failed_today > 0 ? `${data.ai.runs_failed_today} فشل` : ''} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/ai-assistant" icon={<Sparkles />} title="المساعد الذكي" sub="Chat مباشر" />
            <ToolCard href="/admin/ai-os" icon={<Bot />} title="AI OS Hub" sub="8 فرق منظمة" />
            <ToolCard href="/admin/agents" icon={<Brain />} title="إدارة Agents" sub="enabled/disabled" />
            <ToolCard href="/admin/agent-health" icon={<Activity />} title="صحة Agents" sub="Per-agent stats"
              badge={data.ai.agents_stale > 0 ? data.ai.agents_stale : undefined} />
            <ToolCard href="/admin/agent-runs" icon={<Workflow />} title="Runs Logs" sub="كل تشغيل" />
            <ToolCard href="/admin/agent-network" icon={<Network />} title="Network Graph" sub="الـ collaborations" />
            <ToolCard href="/admin/prompt-versions" icon={<GitBranch />} title="Prompts" sub="META improvements" />
            <ToolCard href="/admin/alerts" icon={<Bell />} title="التنبيهات" sub={data.ai.alerts_unresolved > 0 ? `${data.ai.alerts_unresolved} unresolved` : 'كله نضيف'}
              badge={data.ai.alerts_unresolved || undefined} />
            <ToolCard href="/admin/capabilities" icon={<Zap />} title="Capabilities" sub="Tools agents يقدروا يستخدموا" />
            <ToolCard href="/admin/pipelines" icon={<Workflow />} title="Pipelines" sub="Multi-agent workflows" />
            <ToolCard href="/admin/policy-rules" icon={<ShieldCheck />} title="قواعد السياسة" sub="Policy enforcement" />
            <ToolCard href="/admin/insights" icon={<Lightbulb />} title="Agent Insights" sub="رؤى الـ agents" />
          </div>
        </Section>

        {/* ============ WHATSAPP ============ */}
        <Section title="📱 WhatsApp Pipeline" subtitle="WABA + supplier acquisition + AI auto-responder">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SubKpi label="مرسلة اليوم" value={data.whatsapp.sent_today} tone="positive" />
            <SubKpi label="في الطابور" value={data.whatsapp.queue_pending} />
            <SubKpi label="بانتظار المراجعة" value={data.whatsapp.review_pending}
              tone={data.whatsapp.review_pending > 0 ? 'amber' : 'neutral'} />
            <SubKpi label="فشلت" value={data.whatsapp.queue_failed}
              tone={data.whatsapp.queue_failed > 0 ? 'negative' : 'neutral'} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/wa-review" icon={<MessageSquare />} title="مراجعة الرسائل" sub="supplier_leads قبل الإرسال"
              badge={data.whatsapp.review_pending || undefined} />
            <ToolCard href="/admin/messages" icon={<Inbox />} title="المحادثات" sub="WhatsApp conversations" />
            <ToolCard href="/admin/leads" icon={<Phone />} title="Cold Leads" sub={`${data.whatsapp.cold_leads_new} جديد`} />
            <ToolCard href="/admin/leads-feed" icon={<Rss />} title="Realtime Leads" sub="Live stream" />
          </div>
        </Section>

        {/* ============ MARKETING & CONTENT ============ */}
        <Section title="🎨 التسويق والمحتوى" subtitle="creative tier · Cosmos V4 hero · Reels v13">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/marketing-hq" icon={<Target />} title="Marketing HQ" sub="مركز التسويق" />
            <ToolCard href="/admin/ad-builder" icon={<Sparkles />} title="مولد الإعلانات" sub="Ad Builder AI" />
            <ToolCard href="/admin/ad-creatives" icon={<ImageIcon />} title="مكتبة الإعلانات" sub="Creatives" />
            <ToolCard href="/admin/ad-review" icon={<Eye />} title="مراجعة إعلانات" sub="Before publishing" />
            <ToolCard href="/admin/reels" icon={<Video />} title="الـ Reels" sub="فيديوهات قصيرة" />
            <ToolCard href="/admin/social-packs" icon={<Megaphone />} title="Social Packs" sub="منشورات منظمة" />
            <ToolCard href="/admin/social-groups" icon={<Users />} title="فيسبوك Groups" sub="عمل value-first" />
            <ToolCard href="/admin/supplier-posts" icon={<Newspaper />} title="منشورات الموردين" sub="Supplier posts" />
            <ToolCard href="/admin/news" icon={<Newspaper />} title="الأخبار" sub="News + RSS" />
            <ToolCard href="/admin/daily-messages" icon={<Send />} title="رسالة اليوم" sub="Daily broadcasts" />
            <ToolCard href="/admin/email-templates" icon={<Mail />} title="قوالب الإيميل" sub="Email templates" />
            <ToolCard href="/admin/email-queue" icon={<Inbox />} title="طابور الإيميل" sub="Email queue" />
            <ToolCard href="/admin/sponsorships" icon={<Crown />} title="الرعاية" sub="Sponsorships" />
            <ToolCard href="/admin/site-settings" icon={<Settings />} title="إعدادات الموقع" sub="صور + سوشيال" />
          </div>
        </Section>

        {/* ============ ANALYTICS & INTELLIGENCE ============ */}
        <Section title="📊 التحليلات والذكاء التجاري" subtitle="kpis · forecasts · briefs · strategy">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/hq" icon={<Compass />} title="HQ · مركز القيادة" sub="Top-level overview" />
            <ToolCard href="/admin/insights" icon={<Lightbulb />} title="Insights" sub="رؤى الـ system" />
            <ToolCard href="/admin/funnel" icon={<TrendingUp />} title="Sales Funnel" sub="مسار التحويل" />
            <ToolCard href="/admin/demand-forecast" icon={<Zap />} title="توقعات الطلب" sub="Demand Forecast" />
            <ToolCard href="/admin/ceo-briefs" icon={<ScrollText />} title="CEO Briefs" sub="ملخصات يومية" />
            <ToolCard href="/admin/strategy" icon={<Target />} title="Strategy" sub="الاستراتيجية" />
            <ToolCard href="/admin/performance" icon={<Activity />} title="Performance" sub="System performance" />
            <ToolCard href="/admin/command-center" icon={<Compass />} title="Command Center" sub="عرض شامل" />
          </div>
        </Section>

        {/* ============ OPERATIONS & TRUST ============ */}
        <Section title="🛡️ العمليات والأمان" subtitle="fraud · qc · partnerships · activity">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/activity" icon={<Activity />} title="نشاط الموقع" sub="Activity feed" />
            <ToolCard href="/admin/fraud-alerts" icon={<ShieldAlert />} title="تنبيهات الاحتيال" sub="Fraud detection" />
            <ToolCard href="/admin/qc-reports" icon={<FlaskConical />} title="تقارير الجودة" sub="QC Reports" />
            <ToolCard href="/admin/collaborations" icon={<Network />} title="التعاونات" sub="Collaborations" />
            <ToolCard href="/admin/partnerships" icon={<Handshake />} title="الشراكات" sub="Partnerships" />
            <ToolCard href="/admin/listing-drafts" icon={<ClipboardList />} title="مسودات الإعلانات" sub="Drafts" />
          </div>
        </Section>

        {/* ============ SYSTEM ADMIN ============ */}
        <Section title="⚙️ النظام والإدارة" subtitle="runbook · workflows · email · system_runbook">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/runbook" icon={<BookOpen />} title="Runbook" sub="documentation + history" />
            <ToolCard href="/admin/workflows" icon={<Workflow />} title="Workflows" sub="Automation flows" />
            <ToolCard href="/admin/agent-runs" icon={<ClipboardList />} title="Agent Runs Log" sub="History" />
            <ToolCard href="/admin/refresh-fb-token" icon={<RefreshCw />} title="تجديد FB Token" sub="Meta API" />
          </div>
        </Section>

        {/* ============ EXTERNAL TOOLS ============ */}
        <Section title="🌐 الأدوات الخارجية" subtitle="services we depend on">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ExternalCard href="https://vercel.com/dashboard" icon={<Cloud />} title="Vercel" sub="Deployments + logs" />
            <ExternalCard href="https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig" icon={<Database />} title="Supabase" sub="DB + Edge Functions" />
            <ExternalCard href="https://dash.cloudflare.com" icon={<Globe />} title="Cloudflare" sub="DNS + CDN" />
            <ExternalCard href="https://github.com/Madmonah/madmona-app" icon={<GitBranch />} title="GitHub" sub="Source code" />
            <ExternalCard href="https://business.facebook.com" icon={<Megaphone />} title="Meta Business" sub="Ads + WhatsApp" />
            <ExternalCard href="https://resend.com/emails" icon={<Mail />} title="Resend" sub="Email logs" />
            <ExternalCard href="https://www.canva.com" icon={<ImageIcon />} title="Canva" sub="Designs" />
            <ExternalCard href="https://console.anthropic.com" icon={<Sparkles />} title="Anthropic" sub="Claude API" />
          </div>
        </Section>

        {/* ============ RECENT ACTIVITY ============ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent B2B transactions */}
          <div>
            <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6B7280] mb-3">
              💼 آخر معاملات B2B
            </h2>
            {data.recent_b2b_txns.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
                <Receipt className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">لسه ما فيش معاملات B2B</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {data.recent_b2b_txns.map((t) => (
                  <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        t.direction === 'in' ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' : 'bg-red-50 text-red-600'
                      }`}>
                        {t.direction === 'in' ? <TrendingUp className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1A2E26] truncate">
                          {t.category_snapshot || 'معاملة'}
                        </p>
                        <p className="text-[10px] text-[#6B7280] truncate">
                          {t.business_name}{t.branch_name && ` · ${t.branch_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className={`text-sm font-black font-mono ${
                        t.direction === 'in' ? 'text-[#1F6F5F]' : 'text-red-600'
                      }`}>
                        {t.direction === 'in' ? '+' : '−'}{Number(t.amount_egp).toLocaleString('ar-EG')}
                      </p>
                      {t.madmona_commission_amount && t.madmona_commission_amount > 0 && (
                        <p className="text-[9px] text-[#1F6F5F]">+{t.madmona_commission_amount}ج</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent ratings */}
          <div>
            <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6B7280] mb-3">
              ⭐ آخر التقييمات
            </h2>
            {data.recent_ratings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 text-center">
                <Star className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">لسه ما فيش تقييمات</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {data.recent_ratings.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {[1,2,3,4,5].map((n) => (
                          <Star key={n} className={`w-3.5 h-3.5 ${
                            n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                          }`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-[#6B7280]">{r.business_name}</p>
                    </div>
                    <p className="text-xs text-[#1A2E26]">
                      {r.customer_name_snapshot || 'عميل'} · {r.service_name_snapshot || '—'}
                    </p>
                    {r.comment && (
                      <p className="text-xs text-[#6B7280] mt-1 italic">"{r.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

/* ============================================================
   COMPONENTS
   ============================================================ */
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base md:text-lg font-black text-[#1A2E26]">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#6B7280] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function KpiCard({
  icon, label, value, note, primary, tone,
}: {
  icon: ReactNode; label: string; value: string | number; note?: string;
  primary?: boolean; tone?: 'positive' | 'negative' | 'neutral'
}) {
  const t = tone === 'positive' ? 'text-[#1F6F5F]' : tone === 'negative' ? 'text-red-600' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${
      primary ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white' : 'bg-white border-gray-100'
    }`}>
      <div className={`flex items-center gap-2 mb-2 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        <span className="w-4 h-4 inline-flex">{icon}</span>
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-black ${primary ? 'text-white' : t}`}>{value}</p>
      {note && <p className={`text-[10px] mt-1 ${primary ? 'text-white/70' : 'text-[#6B7280]'}`}>{note}</p>}
    </div>
  )
}

function SubKpi({ label, value, note, tone }: {
  label: string; value: string | number; note?: string;
  tone?: 'positive' | 'negative' | 'amber' | 'neutral'
}) {
  const t = tone === 'positive' ? 'text-[#1F6F5F]'
    : tone === 'negative' ? 'text-red-600'
    : tone === 'amber' ? 'text-amber-600'
    : 'text-[#1A2E26]'
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1">{label}</p>
      <p className={`text-xl font-black ${t}`}>{value}</p>
      {note && <p className="text-[10px] text-[#6B7280] mt-0.5">{note}</p>}
    </div>
  )
}

function QuickAction({ href, icon, title, sub, accent, badge }: {
  href: string; icon: ReactNode; title: string; sub: string; accent?: boolean; badge?: number
}) {
  return (
    <Link href={href}
      className={`relative rounded-2xl border p-4 transition-all hover:shadow-md active:scale-[0.98] ${
        accent ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white hover:bg-[#185547]'
               : 'bg-white border-gray-100 text-[#1A2E26] hover:border-[#1F6F5F]'
      }`}>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2.5 ${
        accent ? 'bg-white/15 text-white' : 'bg-[#FAFAF7] text-[#1F6F5F]'
      }`}>{icon}</div>
      <p className={`text-sm font-black ${accent ? 'text-white' : 'text-[#1A2E26]'}`}>{title}</p>
      <p className={`text-[11px] mt-0.5 ${accent ? 'text-white/80' : 'text-[#6B7280]'}`}>{sub}</p>
    </Link>
  )
}

function ToolCard({ href, icon, title, sub, badge }: {
  href: string; icon: ReactNode; title: string; sub: string; badge?: number
}) {
  return (
    <Link href={href}
      className="relative bg-white rounded-2xl border border-gray-100 hover:border-[#1F6F5F] hover:shadow-sm p-3.5 transition-all active:scale-[0.98] group">
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#FAFAF7] text-[#1F6F5F] mb-2 group-hover:bg-[#1F6F5F] group-hover:text-white transition-colors">
        <span className="w-4 h-4 inline-flex">{icon}</span>
      </div>
      <p className="text-sm font-bold text-[#1A2E26] leading-tight">{title}</p>
      <p className="text-[10px] text-[#6B7280] mt-0.5 line-clamp-2">{sub}</p>
    </Link>
  )
}

function ExternalCard({ href, icon, title, sub }: {
  href: string; icon: ReactNode; title: string; sub: string
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="relative bg-white rounded-2xl border border-gray-100 hover:border-[#1F6F5F] hover:shadow-sm p-3.5 transition-all group">
      <ExternalLink className="absolute top-2 left-2 w-3 h-3 text-[#6B7280] group-hover:text-[#1F6F5F]" />
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#FAFAF7] text-[#1F6F5F] mb-2">
        <span className="w-4 h-4 inline-flex">{icon}</span>
      </div>
      <p className="text-sm font-bold text-[#1A2E26] leading-tight">{title}</p>
      <p className="text-[10px] text-[#6B7280] mt-0.5">{sub}</p>
    </a>
  )
}

function PartnerCard({ p }: { p: B2BPartner }) {
  const statusColor =
    p.contract_status === 'active' ? 'text-[#1F6F5F] bg-[#1F6F5F]/10' :
    p.contract_status === 'signed' ? 'text-amber-700 bg-amber-50' :
    p.contract_status === 'negotiating' ? 'text-[#6B7280] bg-[#FAFAF7]' :
    'text-gray-600 bg-gray-50'

  const statusLabel =
    p.contract_status === 'active' ? 'نشط' :
    p.contract_status === 'signed' ? 'موقّع' :
    p.contract_status === 'negotiating' ? 'قيد التفاوض' :
    p.contract_status

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#1F6F5F] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-[#1A2E26] truncate">{p.business_name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
              <span className="text-[10px] text-[#6B7280]">
                {p.branches} فرع · {p.employees} موظف · عمولة {p.commission_pct}%
              </span>
              {p.avg_rating !== null && p.avg_rating > 0 && (
                <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                  {p.avg_rating}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-left">
          <p className="text-[10px] text-[#6B7280]">إيراد الشهر</p>
          <p className="text-base font-black font-mono text-[#1A2E26]">{Number(p.revenue_month).toLocaleString('ar-EG')}ج</p>
          <p className="text-[10px] text-[#1F6F5F]">عمولة: {Number(p.commission_month).toLocaleString('ar-EG')}ج</p>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-7 gap-1.5 pt-3 border-t border-gray-50">
        <PartnerLink href={`/admin/business-finance/${p.id}`} icon={<Wallet />} label="Finance" />
        <PartnerLink href={`/admin/business-finance/${p.id}/operations`} icon={<Plus />} label="Operations" accent />
        <PartnerLink href={`/admin/business-finance/${p.id}/team`} icon={<Users />} label="الفريق" />
        <PartnerLink href={`/admin/business-finance/${p.id}/ratings`} icon={<Star />} label="التقييمات" />
        <PartnerLink href={`/admin/business-finance/${p.id}/attendance`} icon={<ShieldCheck />} label="الحضور" />
        <PartnerLink href={`/admin/business-finance/${p.id}/qr-posters`} icon={<QrCode />} label="QR" />
        <PartnerLink href={`/admin/business-finance/${p.id}/settings`} icon={<Settings />} label="إعدادات" />
      </div>
    </div>
  )
}

function PartnerLink({ href, icon, label, accent }: {
  href: string; icon: ReactNode; label: string; accent?: boolean
}) {
  return (
    <Link href={href}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors text-center ${
        accent
          ? 'bg-[#1F6F5F] text-white hover:bg-[#185547]'
          : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100'
      }`}>
      <span className="w-4 h-4 inline-flex">{icon}</span>
      <span className="text-[9px] font-bold">{label}</span>
    </Link>
  )
}
