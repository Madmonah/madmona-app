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

type MessagesData = {
  whatsapp: {
    conversations_open: number
    unanswered: number
    inbound_today: number
    outbound_today: number
    failed_today: number
    queue_pending: number
    queue_failed: number
    review_pending: number
    policy_violations_recent: number
  }
  email: {
    admin_queued: number
    admin_sent_today: number
    admin_failed: number
    customer_queued: number
    customer_sent_today: number
    customer_failed: number
  }
  push: {
    queued: number
    sent_today: number
    subscribers: number
  }
  daily: { today: number; total: number }
  agents: { unread: number; today: number; urgent: number }
  recent_conversations: Array<{
    id: string
    contact_phone: string
    contact_name: string | null
    contact_type: string | null
    last_message_at: string
    last_message_direction: string
    message_count: number
    first_category: string | null
    first_intent: string | null
    needs_reply: boolean
  }>
  recent_agent_msgs: Array<{
    id: string
    from_agent: string
    to_agent: string
    subject: string | null
    message_type: string
    priority: string
    status: string
    created_at: string
  }>
}

type PulseData = {
  checked_at: string
  overall_status: 'healthy' | 'warning' | 'critical'
  unresolved_alerts: number
  pipelines: {
    publishing: { status: string; hours_since_last_publish: number; stuck_approved: number }
    whatsapp:   { status: string; queue_stuck: number; failed_6h: number; unanswered: number }
    email:      { status: string; queued_stuck: number }
    bookings:   { status: string; pending_payment: number }
    listings:   { status: string; drafts_abandoned: number }
    leads:      { status: string; uncontacted: number }
  }
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
  const [messages, setMessages] = useState<MessagesData | null>(null)
  const [pulse, setPulse] = useState<PulseData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }

      setRefreshing(true)
      const [statsRes, msgsRes, pulseRes] = await Promise.all([
        // @ts-expect-error
        supabaseBrowser.rpc('get_admin_dashboard_v2'),
        // @ts-expect-error
        supabaseBrowser.rpc('get_admin_messages_summary'),
        // @ts-expect-error
        supabaseBrowser.rpc('get_system_pulse_status'),
      ])
      setRefreshing(false)

      if (statsRes.error) {
        const msg = (statsRes.error.message || '').toLowerCase()
        if (msg.includes('forbidden')) { setStage('forbidden'); return }
        setError(statsRes.error.message)
        setStage('ready')
        return
      }
      setData(statsRes.data as DashboardData)
      if (msgsRes.data) setMessages(msgsRes.data as MessagesData)
      if (pulseRes.data) setPulse(pulseRes.data as PulseData)
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
    <div className="min-h-screen text-[#1A2E26]" dir="rtl" style={{ background: 'radial-gradient(1100px 560px at 88% -8%, rgba(47,160,132,0.10), transparent 60%), radial-gradient(900px 480px at -5% 4%, rgba(31,111,95,0.09), transparent 55%), radial-gradient(800px 500px at 50% 118%, rgba(212,160,23,0.06), transparent 60%), #FAFAF7' }}>
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-[#1F6F5F]/10 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/account"
              className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4 text-[#6B7280]" />
            </Link>
            <div>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-0.5 bg-gradient-to-r from-[#D4A017] to-[#1F6F5F] bg-clip-text text-transparent">
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

      <SectionNav />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8 pb-12">

        {/* ===== SYSTEM PULSE (Watchdog Bar) ===== */}
        {pulse && <SystemPulseBar pulse={pulse} />}

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

        {/* ===== COMPANY OVERVIEW BANNER ===== */}
        <Link href="/admin/company"
          className="block bg-gradient-to-l from-[#D4A017] via-[#2FA084] to-[#1F6F5F] text-white rounded-2xl p-4 hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/80 mb-0.5">MADMONA · COMPANY</p>
                <h3 className="text-base font-black">🏢 مضمونة كشركة</h3>
                <p className="text-xs text-white/85">الصورة المالية الكاملة · إيراد · مصاريف · صافي ربح · عملاء · موظفين</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 -scale-x-100 group-hover:-translate-x-1 transition-transform hidden md:block" />
          </div>
        </Link>

        {/* ===== QUICK ACTIONS (top of fold) ===== */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <QuickAction href="/admin/ai-assistant" icon={<Sparkles className="w-5 h-5" />}
            title="المساعد الذكي" sub="اومر الـ agents بالعامية" accent />
          <QuickAction href="/admin/business-partners" icon={<Building2 className="w-5 h-5" />}
            title="شركاء B2B" sub={`${data.b2b.active_partners} نشط · ${data.b2b.leads_ready} lead`} />
          <QuickAction href="/admin/messages" icon={<MessageSquare className="w-5 h-5" />}
            title="المحادثات" sub={messages?.whatsapp.unanswered ? `${messages.whatsapp.unanswered} محتاجة رد` : 'كله مترد عليه'} 
            badge={messages?.whatsapp.unanswered || undefined} />
          <QuickAction href="/admin/ai-os" icon={<Bot className="w-5 h-5" />}
            title="AI OS" sub={`${data.ai.agents_enabled} agent شغال`} />
        </section>

        {/* ============ COLLECTION ACCOUNT (InstaPay / Bank Misr) ============ */}
        <Section title="💳 حساب التحصيل" subtitle="كل المدفوعات (إنستاباي / تحويل بنكي) بتروح على حساب مضمونة">
          <div className="bg-[#1F6F5F] text-white rounded-2xl p-5 md:p-6 shadow-lg shadow-[#1F6F5F]/20 max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5" />
              <p className="text-sm font-black">مضمونة · إنستاباي / تحويل بنكي</p>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                <span className="text-[12px] text-white/70">البنك</span>
                <span className="font-bold">بنك مصر</span>
              </div>
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                <span className="text-[12px] text-white/70">اسم الحساب</span>
                <span className="font-bold">مضمونة</span>
              </div>
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                <span className="text-[12px] text-white/70">رقم الحساب / إنستاباي</span>
                <span className="font-mono font-black text-lg tracking-wide select-all" dir="ltr">5220001000009207</span>
              </div>
            </div>
            <p className="text-[11px] text-white/70 mt-4 leading-relaxed">التيبس والمنتجات والحجوزات بتتحوّل على الحساب ده، وبعدين بتتسوّى مع الشركاء ناقص العمولة (١٠٪ أفراد / ٥٪ شركات).</p>
          </div>
        </Section>

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

        {/* ============ ELITE PARTNER LINKS ============ */}
        <Section title="💇‍♀️ Elite Beauty Salon & Spa" subtitle="كل لينكات إيليت — صفحات العملاء، الحجز، حضور الموظفين، والإدارة">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/elite" icon={<Sparkles />} title="صفحة إيليت" sub="الهوم بيدج للعملاء" />
            <ToolCard href="/admin/business-finance/93eaa8cf-1def-4101-bca6-8fa33450cdce" icon={<Wallet />} title="إدارة إيليت" sub="فاينانس · فريق · حضور · QR" />
            <ToolCard href="/v/HQ" icon={<QrCode />} title="زيارة · مصر الجديدة" sub="/v/HQ" />
            <ToolCard href="/v/GOLF" icon={<QrCode />} title="زيارة · الجولف" sub="/v/GOLF" />
            <ToolCard href="/v/HIJAB" icon={<QrCode />} title="زيارة · المحجبات" sub="/v/HIJAB" />
            <ToolCard href="/v/TAGAMOA" icon={<QrCode />} title="زيارة · التجمع" sub="/v/TAGAMOA" />
            <ToolCard href="/book/HQ" icon={<Calendar />} title="حجز · مصر الجديدة" sub="/book/HQ" />
            <ToolCard href="/book/GOLF" icon={<Calendar />} title="حجز · الجولف" sub="/book/GOLF" />
            <ToolCard href="/book/HIJAB" icon={<Calendar />} title="حجز · المحجبات" sub="/book/HIJAB" />
            <ToolCard href="/book/TAGAMOA" icon={<Calendar />} title="حجز · التجمع" sub="/book/TAGAMOA" />
            <ToolCard href="/clock/HQ" icon={<Clock />} title="حضور · مصر الجديدة" sub="/clock/HQ" />
            <ToolCard href="/clock/GOLF" icon={<Clock />} title="حضور · الجولف" sub="/clock/GOLF" />
            <ToolCard href="/clock/HIJAB" icon={<Clock />} title="حضور · المحجبات" sub="/clock/HIJAB" />
            <ToolCard href="/clock/TAGAMOA" icon={<Clock />} title="حضور · التجمع" sub="/clock/TAGAMOA" />
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
            <ToolCard href="/" icon={<Eye />} title="معاينة الموقع" sub="الواجهة العامة" />
          </div>
        </Section>

        {/* ============ AI OS ============ */}
        <Section title="🤖 AI OS" subtitle="8 فرق منظّمة · self-improving prompts">
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

        {/* ============ 💬 MESSAGES & COMMUNICATIONS (4 channels) ============ */}
        <Section title="💬 الرسائل والاتصالات" subtitle="WhatsApp · Email · Push · رسالة اليوم · Agent-to-agent">
          {/* 💌 WELCOME + 📬 DAILY BANNERS (side-by-side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Link href="/admin/welcome-messages"
              className="block bg-gradient-to-l from-[#1F6F5F] to-[#185547] text-white rounded-2xl p-4 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/80 mb-0.5">WELCOME FLOWS</p>
                    <h3 className="text-base font-black">💌 الرسائل الترحيبية</h3>
                    <p className="text-xs text-white/85">Email + WhatsApp + B2B onboarding</p>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 -scale-x-100 group-hover:-translate-x-1 transition-transform hidden md:block" />
              </div>
            </Link>

            <Link href="/admin/daily-messages"
              className="block bg-gradient-to-l from-[#1F6F5F] to-[#185547] text-white rounded-2xl p-4 hover:shadow-lg transition-all group relative overflow-hidden">
              <div className="absolute -top-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <div className="flex items-center justify-between gap-3 relative">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/80 mb-0.5">DAILY MESSAGES</p>
                    <h3 className="text-base font-black">📬 رسالة اليوم</h3>
                    <p className="text-xs text-white/85">{messages?.daily.total || 5} رسالة تتغير تلقائيًا · بانر حي</p>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 -scale-x-100 group-hover:-translate-x-1 transition-transform hidden md:block" />
              </div>
            </Link>
          </div>

          {/* WA pipeline KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <SubKpi label="💪 محادثات WhatsApp" value={messages?.whatsapp.conversations_open || 0}
              note={`${messages?.whatsapp.unanswered || 0} محتاجة رد`}
              tone={(messages?.whatsapp.unanswered || 0) > 10 ? 'amber' : 'neutral'} />
            <SubKpi label="✉️ إيميل اليوم" value={(messages?.email.admin_sent_today || 0) + (messages?.email.customer_sent_today || 0)}
              note={`admin ${messages?.email.admin_sent_today || 0} + customer ${messages?.email.customer_sent_today || 0}`}
              tone="positive" />
            <SubKpi label="🔔 Push notifications" value={messages?.push.sent_today || 0}
              note={`${messages?.push.subscribers || 0} مشترك`} />
            <SubKpi label="🤖 رسايل بين Agents" value={messages?.agents.urgent || 0}
              note={`${messages?.agents.unread || 0} غير مقروءة`}
              tone={(messages?.agents.urgent || 0) > 0 ? 'amber' : 'neutral'} />
          </div>

          {/* Alert bar for problems */}
          {messages && (
            messages.whatsapp.queue_failed > 0 ||
            messages.whatsapp.policy_violations_recent > 0 ||
            messages.email.admin_failed > 0 ||
            messages.email.customer_failed > 0
          ) && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-3 text-xs space-y-1">
              <p className="font-bold text-red-900 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> تنبيهات
              </p>
              {messages.whatsapp.queue_failed > 0 && (
                <p className="text-red-800">• {messages.whatsapp.queue_failed} رسالة WhatsApp فشلت في الطابور</p>
              )}
              {messages.whatsapp.policy_violations_recent > 0 && (
                <p className="text-red-800">• {messages.whatsapp.policy_violations_recent} مخالفة سياسة WhatsApp في آخر أسبوع</p>
              )}
              {(messages.email.admin_failed > 0 || messages.email.customer_failed > 0) && (
                <p className="text-red-800">• {messages.email.admin_failed + messages.email.customer_failed} إيميل فشل</p>
              )}
            </div>
          )}

          {/* Two columns: conversations + agent messages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            {/* WhatsApp conversations */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-[#FAFAF7] border-b border-gray-100 flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">آخر محادثات WhatsApp</p>
                <Link href="/admin/messages" className="text-[10px] font-bold text-[#1F6F5F] hover:underline">عرض الكل</Link>
              </div>
              {!messages?.recent_conversations.length ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-2" />
                  <p className="text-xs text-[#6B7280]">مفيش محادثات</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {messages.recent_conversations.map((c) => (
                    <Link key={c.id} href={`/admin/messages?id=${c.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#FAFAF7]/50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          c.needs_reply ? 'bg-amber-50 text-amber-600' : 'bg-[#1F6F5F]/10 text-[#1F6F5F]'
                        }`}>
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1A2E26] truncate">
                            {c.contact_name || c.contact_phone}
                            {c.needs_reply && <span className="text-[9px] text-amber-600 mr-1.5">• محتاجة رد</span>}
                          </p>
                          <p className="text-[10px] text-[#6B7280] truncate">
                            {c.contact_type || 'غير معروف'}{c.first_category && ` · ${c.first_category}`}
                            {' · '}{c.message_count} رسالة
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#6B7280] flex-shrink-0 font-mono">
                        {new Date(c.last_message_at).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Agent-to-agent messages */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-[#FAFAF7] border-b border-gray-100 flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">رسايل بين الـ Agents</p>
                <Link href="/admin/agents" className="text-[10px] font-bold text-[#1F6F5F] hover:underline">عرض الكل</Link>
              </div>
              {!messages?.recent_agent_msgs.length ? (
                <div className="p-8 text-center">
                  <Bot className="w-8 h-8 text-[#6B7280] opacity-30 mx-auto mb-2" />
                  <p className="text-xs text-[#6B7280]">مفيش رسايل agent-to-agent</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {messages.recent_agent_msgs.map((m) => (
                    <div key={m.id} className="px-4 py-2.5">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded ${
                          m.priority === 'urgent' ? 'bg-red-50 text-red-700' :
                          m.priority === 'high' ? 'bg-amber-50 text-amber-700' :
                          'bg-[#FAFAF7] text-[#6B7280]'
                        }`}>
                          {m.priority}
                        </span>
                        <span className="text-[10px] text-[#1F6F5F] font-mono">
                          {m.from_agent} → {m.to_agent}
                        </span>
                      </div>
                      <p className="text-xs text-[#1A2E26] line-clamp-2">{m.subject || '(بدون عنوان)'}</p>
                      <p className="text-[10px] text-[#6B7280] mt-1 font-mono">
                        {new Date(m.created_at).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All messaging tools */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/messages" icon={<Inbox />} title="المحادثات" sub={`${messages?.whatsapp.conversations_open || 0} مفتوحة`}
              badge={messages?.whatsapp.unanswered || undefined} />
            <ToolCard href="/admin/wa-review" icon={<MessageSquare />} title="مراجعة WhatsApp" sub={messages?.whatsapp.review_pending ? `${messages.whatsapp.review_pending} في الانتظار` : 'كله متراجع'}
              badge={messages?.whatsapp.review_pending || undefined} />
            <ToolCard href="/admin/email-queue" icon={<Mail />} title="طابور الإيميل" sub={`${(messages?.email.admin_queued || 0) + (messages?.email.customer_queued || 0)} في الطابور`}
              badge={(messages?.email.admin_failed || 0) + (messages?.email.customer_failed || 0) || undefined} />
            <ToolCard href="/admin/email-templates" icon={<ScrollText />} title="قوالب الإيميل" sub="Email templates" />
            <ToolCard href="/admin/notifications" icon={<Bell />} title="إرسال Push" sub={`${messages?.push.subscribers || 0} مشترك`} />
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
            <ToolCard href="/admin/sponsorships" icon={<Crown />} title="الرعاية" sub="Sponsorships" />
            <ToolCard href="/admin/site-settings" icon={<Settings />} title="إعدادات الموقع" sub="صور + سوشيال" />
          </div>
        </Section>

        {/* ============ ANALYTICS & INTELLIGENCE ============ */}
        <Section title="📊 التحليلات والذكاء التجاري" subtitle="kpis · forecasts · briefs · strategy">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/admin/hq" icon={<Compass />} title="HQ · مركز القيادة" sub="Top-level overview" />
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
            <ToolCard href="/admin/refresh-fb-token" icon={<RefreshCw />} title="تجديد FB Token" sub="Meta API" />
          </div>
        </Section>

        {/* ============ 🏪 SUPPLIER PORTAL ============ */}
        <Section title="🏪 لوحة المورد (Supplier Portal)" subtitle="صفحات المورد لإدارة إعلاناته وحجوزاته وفريقه">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/supplier" icon={<Building2 />} title="الرئيسية" sub="/supplier landing" />
            <ToolCard href="/supplier/dashboard" icon={<Compass />} title="لوحة المورد" sub="Supplier dashboard" />
            <ToolCard href="/supplier/marketplace" icon={<Package />} title="إعلاناتي" sub="My listings" />
            <ToolCard href="/supplier/marketplace/new" icon={<Plus />} title="إعلان جديد" sub="Add listing" />
            <ToolCard href="/supplier/marketplace/bookings" icon={<Calendar />} title="حجوزاتي" sub="Supplier bookings" />
            <ToolCard href="/supplier/marketplace/reviews" icon={<Star />} title="تقييماتي" sub="Customer reviews" />
            <ToolCard href="/supplier/bookings" icon={<ClipboardList />} title="Legacy Bookings" sub="نسخة قديمة" />
            <ToolCard href="/supplier/team" icon={<Users />} title="الفريق" sub="إدارة الموظفين" />
            <ToolCard href="/supplier/register" icon={<Plus />} title="إنشاء مورد" sub="Supplier register" />
            <ToolCard href="/supplier/signup" icon={<Plus />} title="تسجيل سريع" sub="Supplier signup" />
            <ToolCard href="/supplier/login" icon={<Lock />} title="دخول المورد" sub="Supplier login" />
            <ToolCard href="/list-your-asset" icon={<Sparkles />} title="ضيف ليستنج" sub="الصفحة التعريفية" />
          </div>
        </Section>

        {/* ============ 👤 PUBLIC / CUSTOMER PAGES ============ */}
        <Section title="👤 صفحات الموقع العامة" subtitle="اللي العميل والزائر بيشوفوه">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <ToolCard href="/" icon={<Compass />} title="الصفحة الرئيسية" sub="/ home" />
            <ToolCard href="/marketplace" icon={<Package />} title="الماركتبليس" sub="كل الإيجارات" />
            <ToolCard href="/browse" icon={<Eye />} title="تصفح" sub="Browse" />
            <ToolCard href="/add-listing" icon={<Plus />} title="إضافة إيجار" sub="Add listing wizard" />
            <ToolCard href="/account" icon={<Users />} title="حسابي" sub="My account" />
            <ToolCard href="/my-bookings" icon={<Calendar />} title="حجوزاتي" sub="My bookings" />
            <ToolCard href="/about" icon={<BookOpen />} title="عن مضمونة" sub="About" />
            <ToolCard href="/privacy" icon={<Shield />} title="الخصوصية" sub="Privacy" />
            <ToolCard href="/terms" icon={<ScrollText />} title="الشروط" sub="Terms" />
          </div>
        </Section>

        {/* ============ 🗂️ MASTER INDEX (A-Z) ============ */}
        <Section title="🗂️ فهرس كامل (أـي)" subtitle="كل صفحات الـ admin بترتيب أبجدي · لو فرضاً واحدة مفقودة فوق">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1.5">
              <CompactLink href="/admin/activity" label="activity" />
              <CompactLink href="/admin/ad-builder" label="ad-builder" />
              <CompactLink href="/admin/ad-creatives" label="ad-creatives" />
              <CompactLink href="/admin/ad-review" label="ad-review" />
              <CompactLink href="/admin/agent-health" label="agent-health" />
              <CompactLink href="/admin/agent-network" label="agent-network" />
              <CompactLink href="/admin/agent-runs" label="agent-runs" />
              <CompactLink href="/admin/agents" label="agents" />
              <CompactLink href="/admin/ai-assistant" label="ai-assistant" />
              <CompactLink href="/admin/ai-os" label="ai-os" />
              <CompactLink href="/admin/alerts" label="alerts" />
              <CompactLink href="/admin/business-finance" label="business-finance" />
              <CompactLink href="/admin/business-partners" label="business-partners" />
              <CompactLink href="/admin/business-partners/new" label="business-partners/new" />
              <CompactLink href="/admin/capabilities" label="capabilities" />
              <CompactLink href="/admin/categories" label="categories" />
              <CompactLink href="/admin/ceo-briefs" label="ceo-briefs" />
              <CompactLink href="/admin/collaborations" label="collaborations" />
              <CompactLink href="/admin/command-center" label="command-center" />
              <CompactLink href="/admin/company" label="company ⭐" />
              <CompactLink href="/admin/daily-messages" label="daily-messages" />
              <CompactLink href="/admin/dashboard" label="dashboard (أنت هنا)" muted />
              <CompactLink href="/admin/demand-forecast" label="demand-forecast" />
              <CompactLink href="/admin/email-queue" label="email-queue" />
              <CompactLink href="/admin/email-templates" label="email-templates" />
              <CompactLink href="/admin/fraud-alerts" label="fraud-alerts" />
              <CompactLink href="/admin/funnel" label="funnel" />
              <CompactLink href="/admin/hq" label="hq" />
              <CompactLink href="/admin/insights" label="insights" />
              <CompactLink href="/admin/leads" label="leads" />
              <CompactLink href="/admin/leads-feed" label="leads-feed" />
              <CompactLink href="/admin/listing-drafts" label="listing-drafts" />
              <CompactLink href="/admin/listing-performance" label="listing-performance" />
              <CompactLink href="/admin/listings" label="listings" />
              <CompactLink href="/admin/marketing-hq" label="marketing-hq" />
              <CompactLink href="/admin/marketplace-bookings" label="marketplace-bookings" />
              <CompactLink href="/admin/messages" label="messages" />
              <CompactLink href="/admin/news" label="news" />
              <CompactLink href="/admin/notifications" label="notifications" />
              <CompactLink href="/admin/partnerships" label="partnerships" />
              <CompactLink href="/admin/payouts" label="payouts" />
              <CompactLink href="/admin/performance" label="performance" />
              <CompactLink href="/admin/pipelines" label="pipelines" />
              <CompactLink href="/admin/policy-rules" label="policy-rules" />
              <CompactLink href="/admin/prompt-versions" label="prompt-versions" />
              <CompactLink href="/admin/qc-reports" label="qc-reports" />
              <CompactLink href="/admin/reels" label="reels" />
              <CompactLink href="/admin/refresh-fb-token" label="refresh-fb-token" />
              <CompactLink href="/admin/runbook" label="runbook" />
              <CompactLink href="/admin/site-settings" label="site-settings" />
              <CompactLink href="/admin/social-groups" label="social-groups" />
              <CompactLink href="/admin/social-packs" label="social-packs" />
              <CompactLink href="/admin/sponsorships" label="sponsorships" />
              <CompactLink href="/admin/strategy" label="strategy" />
              <CompactLink href="/admin/sup" label="sup" />
              <CompactLink href="/admin/supplier-posts" label="supplier-posts" />
              <CompactLink href="/admin/wa-review" label="wa-review" />
              <CompactLink href="/admin/welcome-messages" label="welcome-messages" />
              <CompactLink href="/admin/workflows" label="workflows" />
            </div>
            <p className="text-[10px] text-[#6B7280] mt-3 pt-3 border-t border-gray-100">
              📊 {59} صفحة admin
            </p>
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
function SectionNav() {
  const [items, setItems] = useState<{ id: string; label: string }[]>([])
  const [active, setActive] = useState('')

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    const secs = Array.from(main.querySelectorAll(':scope > section')) as HTMLElement[]
    const list: { id: string; label: string }[] = []
    secs.forEach((s, i) => {
      const h = s.querySelector('h2')
      const txt = h?.textContent?.trim()
      if (!txt) return
      const label = txt.length > 20 ? txt.slice(0, 20) + '…' : txt
      if (!s.id) s.id = `dsec-${i}`
      list.push({ id: s.id, label })
    })
    setItems(list)
    const onScroll = () => {
      const y = window.scrollY + 130
      let cur = list[0]?.id || ''
      for (const it of list) {
        const el = document.getElementById(it.id)
        if (el && el.offsetTop <= y) cur = it.id
      }
      setActive(cur)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function go(id: string) {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.offsetTop - 110, behavior: 'smooth' })
  }

  if (items.length === 0) return null
  return (
    <div className="sticky top-14 z-20 border-b border-[#1F6F5F]/10 bg-white/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        {items.map((it) => (
          <button key={it.id} onClick={() => go(it.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              active === it.id
                ? 'bg-gradient-to-br from-[#D4A017] to-[#1F6F5F] text-white shadow-sm'
                : 'bg-white text-[#6B7280] border border-black/5 hover:text-[#1A2E26] hover:border-[#1F6F5F]/30'
            }`}>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-1 w-1 h-7 rounded-full bg-gradient-to-b from-[#D4A017] to-[#1F6F5F] flex-shrink-0" />
        <div>
          <h2 className="text-base md:text-lg font-black text-[#1A2E26]">{title}</h2>
          {subtitle && <p className="text-[11px] text-[#6B7280] mt-0.5">{subtitle}</p>}
        </div>
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
    <div className={`rounded-2xl p-4 border transition-all ${
      primary ? 'bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#1F6F5F] border-transparent text-white shadow-lg shadow-[#1F6F5F]/25' : 'bg-white border-black/5 shadow-sm shadow-black/[0.04] hover:shadow-md'
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
    <div className="bg-white rounded-xl border border-black/5 shadow-sm shadow-black/[0.03] p-3">
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
      className={`relative rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${
        accent ? 'bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#1F6F5F] border-transparent text-white shadow-lg shadow-[#1F6F5F]/25'
               : 'bg-white border-black/5 text-[#1A2E26] shadow-sm shadow-black/[0.04] hover:border-[#1F6F5F]/30'
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
      className="relative bg-white rounded-2xl border border-black/5 shadow-sm shadow-black/[0.04] hover:border-[#1F6F5F]/30 hover:shadow-md hover:-translate-y-0.5 p-3.5 transition-all active:scale-[0.98] group">
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] mb-2 group-hover:bg-gradient-to-br group-hover:from-[#2FA084] group-hover:to-[#1F6F5F] group-hover:text-white transition-colors">
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

function SystemPulseBar({ pulse }: { pulse: PulseData }) {
  const overall = pulse.overall_status
  const overallBg =
    overall === 'critical' ? 'from-red-600 to-red-700' :
    overall === 'warning'  ? 'from-amber-500 to-amber-600' :
                             'from-[#1F6F5F] to-[#185547]'
  const overallLabel =
    overall === 'critical' ? 'فيه مشكلة كبيرة' :
    overall === 'warning'  ? 'فيه تنبيهات' :
                             'كل حاجة شغّالة'

  const pipes = [
    { key: 'publishing', label: '📱 النشر',     value: pulse.pipelines.publishing.hours_since_last_publish > 0
        ? `آخر نشر منذ ${pulse.pipelines.publishing.hours_since_last_publish}س` : '—',
      status: pulse.pipelines.publishing.status, href: '/admin/agent-runs' },
    { key: 'whatsapp',   label: '💬 WhatsApp',  value: `${pulse.pipelines.whatsapp.unanswered} بدون رد`,
      status: pulse.pipelines.whatsapp.status, href: '/admin/messages' },
    { key: 'email',      label: '✉️ الإيميل',    value: `${pulse.pipelines.email.queued_stuck} عالق`,
      status: pulse.pipelines.email.status, href: '/admin/email-queue' },
    { key: 'bookings',   label: '📅 الحجوزات',  value: `${pulse.pipelines.bookings.pending_payment} pending`,
      status: pulse.pipelines.bookings.status, href: '/admin/marketplace-bookings' },
    { key: 'listings',   label: '📦 الإعلانات', value: `${pulse.pipelines.listings.drafts_abandoned} مسودة`,
      status: pulse.pipelines.listings.status, href: '/admin/listing-drafts' },
    { key: 'leads',      label: '📞 Leads',      value: `${pulse.pipelines.leads.uncontacted} مش متواصل`,
      status: pulse.pipelines.leads.status, href: '/admin/leads' },
  ]

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#6B7280]">SYSTEM PULSE</p>
          <h2 className="text-base md:text-lg font-black text-[#1A2E26]">نبض النظام</h2>
        </div>
        <Link href="/admin/alerts"
          className={`bg-gradient-to-l ${overallBg} text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity`}>
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          {overallLabel}
          {pulse.unresolved_alerts > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{pulse.unresolved_alerts}</span>
          )}
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {pipes.map((p) => (
          <Link key={p.key} href={p.href}
            className={`relative bg-white rounded-xl border p-3 hover:shadow-sm transition-all active:scale-[0.98] ${
              p.status === 'critical' ? 'border-red-200' :
              p.status === 'warning'  ? 'border-amber-200' :
                                        'border-gray-100'
            }`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[10px] font-bold text-[#1A2E26] leading-tight">{p.label}</p>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                p.status === 'critical' ? 'bg-red-500' :
                p.status === 'warning'  ? 'bg-amber-500' :
                                          'bg-[#1F6F5F]'
              }`} />
            </div>
            <p className={`text-[11px] font-bold ${
              p.status === 'critical' ? 'text-red-700' :
              p.status === 'warning'  ? 'text-amber-700' :
                                        'text-[#6B7280]'
            }`}>{p.value}</p>
          </Link>
        ))}
      </div>

      <p className="text-[10px] text-[#6B7280] mt-2 font-mono">
        تحديث تلقائي كل دقيقة · 6 watchdogs بـ تُ راقب · أي alert بـ يوصلك push + WhatsApp
      </p>

      {/* Buffer + Make health check */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <BufferHealthCheck />
      </div>
    </section>
  )
}

function BufferHealthCheck() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    overall: string
    checks: Array<{ name: string; status: string; detail?: string }>
    db_queue: { approved_ready: number; drafted: number; sent_to_make: number }
  } | null>(null)

  async function check() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/buffer-check', { credentials: 'include' })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({
        overall: 'error',
        checks: [{ name: 'fetch', status: 'error', detail: String(e) }],
        db_queue: { approved_ready: 0, drafted: 0, sent_to_make: 0 },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={check} disabled={loading}
        className="text-xs font-bold bg-[#1F6F5F] text-white px-3 py-1.5 rounded-lg hover:bg-[#185547] disabled:opacity-50 flex items-center gap-2">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
        🔍 افحص Buffer + Make الآن
      </button>

      {result && (
        <div className="mt-3 bg-[#FAFAF7] rounded-xl p-3 text-xs">
          <p className={`font-black mb-2 ${
            result.overall === 'healthy' ? 'text-[#1F6F5F]' : 'text-red-700'
          }`}>
            {result.overall === 'healthy' ? '✅ كل حاجة تمام' : '⚠️ فيه مشاكل'}
          </p>
          <div className="space-y-1">
            {result.checks.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 font-bold ${
                  c.status === 'ok' ? 'text-[#1F6F5F]' :
                  c.status === 'missing' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {c.status === 'ok' ? '✓' : c.status === 'missing' ? '⚠' : '✕'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] font-bold">{c.name}</p>
                  {c.detail && <p className="text-[10px] text-[#6B7280] break-all">{c.detail}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[9px] text-[#6B7280]">approved</p>
              <p className="text-sm font-black text-[#1F6F5F]">{result.db_queue.approved_ready}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#6B7280]">drafted</p>
              <p className="text-sm font-black text-[#6B7280]">{result.db_queue.drafted}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#6B7280]">stuck make</p>
              <p className={`text-sm font-black ${result.db_queue.sent_to_make > 0 ? 'text-amber-600' : 'text-[#1F6F5F]'}`}>
                {result.db_queue.sent_to_make}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CompactLink({ href, label, muted }: { href: string; label: string; muted?: boolean }) {
  return (
    <Link href={href}
      className={`flex items-center gap-1.5 text-xs font-mono py-1 px-2 rounded-md transition-colors ${
        muted
          ? 'text-[#6B7280] hover:bg-gray-50 hover:text-[#1A2E26]'
          : 'text-[#1A2E26] hover:bg-[#1F6F5F]/5 hover:text-[#1F6F5F]'
      }`}>
      <ChevronLeft className="w-3 h-3 -scale-x-100 flex-shrink-0 opacity-40" />
      <span className="truncate">{label}</span>
    </Link>
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
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm shadow-black/[0.04] p-4 hover:border-[#1F6F5F]/30 hover:shadow-md transition-all">
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
          ? 'bg-gradient-to-br from-[#2FA084] to-[#1F6F5F] text-white hover:shadow-md'
          : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100'
      }`}>
      <span className="w-4 h-4 inline-flex">{icon}</span>
      <span className="text-[9px] font-bold">{label}</span>
    </Link>
  )
}
