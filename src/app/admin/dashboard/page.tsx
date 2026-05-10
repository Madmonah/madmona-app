'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, Crown, Building2, Calendar,
  TrendingUp, DollarSign, Users, Package, Eye, Star,
  AlertCircle, FolderTree, ChevronLeft, UserCog, Wallet,
  Settings, Layers, Bell, Image as ImageIcon, Phone,
  ClipboardList, History, Briefcase, Bot, Sparkles, Target,
  Megaphone, Video, BarChart3, Activity, Shield, ShieldAlert,
  FlaskConical, MessageSquare, GitBranch, Brain, Lightbulb,
  Compass, Newspaper, Handshake, FileBarChart, Network,
  Rss, Zap, ScrollText, Mail, ExternalLink, Cloud, Database, Globe,
} from 'lucide-react'

// ============================================================================
// /admin/dashboard — full admin hub with ALL admin routes
// FAST VERSION: uses get_admin_dashboard_stats() RPC (1 query instead of 9)
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

interface DashboardData {
  totalBookings: number
  monthBookings: number
  pendingBookings: number
  confirmedBookings: number
  completedBookings: number
  cancelledBookings: number
  totalCommission: number
  monthCommission: number
  totalGMV: number
  monthGMV: number
  approvedSuppliers: number
  pendingSuppliers: number
  publishedListings: number
  draftListings: number
  totalCustomers: number
  totalReviews: number
  averageRating: number
  pushSubscribers: number
  recentBookings: RecentBooking[]
  topListings: TopListing[]
}

interface RecentBooking {
  id: string
  reference_code: string | null
  total_amount: number
  status: string
  created_at: string
  listing: { title: string } | null
  supplier: { business_name: string } | null
  customer: { full_name: string | null } | null
}

interface TopListing {
  id: string
  title: string
  slug: string
  views_count: number
  bookings_count: number
  rating: number | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'بانتظار', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكّد', color: 'bg-green-100 text-green-800' },
  active: { label: 'جاري', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'تمّ', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'مُسترد', color: 'bg-purple-100 text-purple-800' },
}

export default function AdminDashboardPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) { setStage('unauthenticated'); return }

        // @ts-expect-error
        const { data: stats, error } = await supabaseBrowser.rpc('get_admin_dashboard_stats')

        if (error) {
          const msg = (error.message || '').toLowerCase()
          if (msg.includes('forbidden')) { setStage('forbidden'); return }
          if (msg.includes('unauthenticated')) { setStage('unauthenticated'); return }
          setLoadError(error.message || 'فشل تحميل البيانات')
          setStage('ready')
          return
        }

        setData(stats as DashboardData)
        setStage('ready')
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'حصلت مشكلة')
        setStage('ready')
      }
    }
    init()
  }, [])

  if (stage === 'loading') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F5F3F] animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#1F5F3F] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link href="/auth/login?redirect=/admin/dashboard" className="block bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold">
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'forbidden') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مش مسموح</h1>
          <p className="text-sm text-gray-600 mb-4">الصفحة دي للأدمن فقط.</p>
          <Link href="/account" className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold">
            ارجع للحساب
          </Link>
        </div>
      </div>
    )
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h1 className="font-bold mb-2">حصلت مشكلة في التحميل</h1>
          <p className="text-sm text-gray-600 mb-4">{loadError || 'مفيش بيانات'}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            حاول تاني
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-mesh" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/account" className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#B8860B]" />
            <h1 className="text-lg font-black text-gray-900">Admin Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8 pb-12">
        {/* Big metrics */}
        <section>
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">الأرقام الكبرى</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="عمولة Madmona (شهر)" value={`${Number(data.monthCommission).toLocaleString('ar-EG')} ج.م`} subtitle={`إجمالي: ${Number(data.totalCommission).toLocaleString('ar-EG')}`} accent="bg-[#1F5F3F]/10 text-[#1F5F3F]" />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="GMV (شهر)" value={`${Number(data.monthGMV).toLocaleString('ar-EG')} ج.م`} subtitle={`إجمالي: ${Number(data.totalGMV).toLocaleString('ar-EG')}`} accent="bg-[#B8860B]/10 text-[#B8860B]" />
            <MetricCard icon={<Calendar className="w-4 h-4" />} label="حجوزات الشهر" value={data.monthBookings.toString()} subtitle={`إجمالي: ${data.totalBookings}`} accent="bg-blue-100 text-blue-700" />
            <MetricCard icon={<Users className="w-4 h-4" />} label="أجر مننا (عملاء)" value={data.totalCustomers.toString()} subtitle={`${data.approvedSuppliers} أجر معانا · ${data.pendingSuppliers} معلّق · ${data.pushSubscribers} 🔔`} accent="bg-purple-100 text-purple-700" />
          </div>
        </section>

        {/* AI Assistant Big Banner — chat with all 46 agents */}
        <Link href="/admin/ai-assistant" className="block bg-gradient-to-l from-[#B8860B] via-[#d4a017] to-[#B8860B] text-white rounded-3xl p-6 shadow-luxe hover:shadow-2xl hover:-translate-y-0.5 transition-all no-underline relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#1F5F3F]/30 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/80 mb-1">CHAT · NATURAL LANGUAGE</p>
                <h3 className="text-2xl font-black mb-1">المساعد الذكي</h3>
                <p className="text-sm text-white/90">اومر الـ 46 agent بالعامية وهم ينفذوا</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 -scale-x-100 transition-transform hidden md:block" />
          </div>
        </Link>

        {/* AI OS Big Banner */}
        <Link href="/admin/ai-os" className="block bg-gradient-to-l from-[#1F5F3F] via-[#2d7a52] to-[#1F5F3F] text-white rounded-3xl p-6 shadow-luxe hover:shadow-2xl hover:-translate-y-0.5 transition-all no-underline relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-[#B8860B]/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/70 mb-1">42 AGENTS · 8 TEAMS</p>
                <h3 className="text-2xl font-black mb-1">AI OS · مركز التحكم</h3>
                <p className="text-sm text-white/85">Sales · Marketing · Creative · Operations · Strategic · Support · Intelligence · Growth</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 -scale-x-100 group-hover:-translate-x-1 transition-transform hidden md:block" />
          </div>
        </Link>

        {/* All admin tools by section */}
        <section>
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">أدوات الإدارة</h2>
            {data.pendingSuppliers > 0 && (
              <Link href="/admin/sup" className="text-xs bg-yellow-400 text-gray-900 px-2.5 py-1 rounded-full font-bold animate-pulse-soft">
                {data.pendingSuppliers} أجر معانا يحتاج موافقة
              </Link>
            )}
          </div>

          {/* 1. MARKETPLACE */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-[#1F5F3F] uppercase tracking-widest mb-2 px-1">Marketplace</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToolCard href="/admin/listings" icon={<Package className="w-5 h-5" />} title="إدارة الخدمات" subtitle={`${data.publishedListings} منشور · ${data.draftListings} مسودة`} accent="bg-emerald-100 text-emerald-700" badge={data.draftListings > 0 ? data.draftListings : undefined} />
              <ToolCard href="/admin/sup" icon={<Building2 className="w-5 h-5" />} title="أجر معانا (Suppliers)" subtitle={`${data.approvedSuppliers} معتمد · ${data.pendingSuppliers} معلّق`} accent="bg-[#1F5F3F]/10 text-[#1F5F3F]" badge={data.pendingSuppliers > 0 ? data.pendingSuppliers : undefined} />
              <ToolCard href="/admin/marketplace-bookings" icon={<Calendar className="w-5 h-5" />} title="كل الحجوزات" subtitle={`${data.pendingBookings} بانتظار · ${data.confirmedBookings} مؤكّد`} accent="bg-blue-100 text-blue-700" />
              <ToolCard href="/admin/categories" icon={<FolderTree className="w-5 h-5" />} title="الفئات والخصائص" subtitle="Categories + Attributes" accent="bg-purple-100 text-purple-700" />
              <ToolCard href="/admin/payouts" icon={<Wallet className="w-5 h-5" />} title="المدفوعات" subtitle="حساب وإصدار التحويلات" accent="bg-green-100 text-green-700" />
              <ToolCard href="/admin/listing-performance" icon={<FileBarChart className="w-5 h-5" />} title="أداء الإعلانات" subtitle="Performance per listing" accent="bg-teal-100 text-teal-700" />
              <ToolCard href="/admin/leads" icon={<Phone className="w-5 h-5" />} title="العملاء المحتملين" subtitle="Leads من الفورمات" accent="bg-orange-100 text-orange-700" />
              <ToolCard href="/admin/leads-feed" icon={<Rss className="w-5 h-5" />} title="Leads Feed" subtitle="Realtime leads stream" accent="bg-rose-100 text-rose-700" />
            </div>
          </div>

          {/* 2. AI & AUTOMATION */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
              <Bot className="w-3 h-3" /> الذكاء الاصطناعي والأتمتة
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToolCard href="/admin/ai-assistant" icon={<Sparkles className="w-5 h-5" />} title="المساعد الذكي" subtitle="اومر الـ agents بالعامية" accent="bg-gradient-to-br from-[#B8860B] to-[#1F5F3F] text-white" />
              <ToolCard href="/admin/ai-os" icon={<Bot className="w-5 h-5" />} title="AI OS Hub" subtitle="42 agents · 8 teams" accent="bg-[#1F5F3F] text-white" />
              <ToolCard href="/admin/agents" icon={<Brain className="w-5 h-5" />} title="إدارة الـ Agents" subtitle="تحكم في كل agent" accent="bg-purple-100 text-purple-700" />
              <ToolCard href="/admin/prompt-versions" icon={<GitBranch className="w-5 h-5" />} title="نسخ الـ Prompts" subtitle="META agent self-improving" accent="bg-indigo-100 text-indigo-700" />
              <ToolCard href="/admin/performance" icon={<Activity className="w-5 h-5" />} title="أداء الـ AI" subtitle="Performance metrics" accent="bg-violet-100 text-violet-700" />
            </div>
          </div>

          {/* 2.5 EXTERNAL SERVICES — Resend, Vercel, Supabase, Cloudflare, GitHub */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> الخدمات الخارجية
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ExternalToolCard href="https://resend.com/emails" icon={<Mail className="w-5 h-5" />} title="Resend Emails" subtitle="سجل الإيميلات المرسلة" accent="bg-blue-100 text-blue-700" />
              <ExternalToolCard href="https://vercel.com/dashboard" icon={<Cloud className="w-5 h-5" />} title="Vercel" subtitle="Deployments + Logs" accent="bg-black text-white" />
              <ExternalToolCard href="https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig" icon={<Database className="w-5 h-5" />} title="Supabase" subtitle="DB + Edge Functions" accent="bg-emerald-100 text-emerald-700" />
              <ExternalToolCard href="https://dash.cloudflare.com" icon={<Globe className="w-5 h-5" />} title="Cloudflare" subtitle="DNS + CDN" accent="bg-orange-100 text-orange-700" />
              <ExternalToolCard href="https://github.com/Madmonah/madmona-app" icon={<GitBranch className="w-5 h-5" />} title="GitHub Repo" subtitle="الكود + Commits" accent="bg-gray-900 text-white" />
              <ExternalToolCard href="https://business.facebook.com" icon={<Megaphone className="w-5 h-5" />} title="Meta Business" subtitle="إعلانات + WhatsApp" accent="bg-blue-600 text-white" />
              <ExternalToolCard href="https://www.canva.com" icon={<ImageIcon className="w-5 h-5" />} title="Canva" subtitle="تصاميم + قوالب" accent="bg-purple-600 text-white" />
              <ExternalToolCard href="https://console.anthropic.com" icon={<Sparkles className="w-5 h-5" />} title="Anthropic Console" subtitle="Claude API usage" accent="bg-[#B8860B] text-white" />
            </div>
          </div>

          {/* 3. MARKETING & CONTENT */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-[#B8860B] uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
              <Megaphone className="w-3 h-3" /> التسويق والمحتوى
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToolCard href="/admin/marketing-hq" icon={<Target className="w-5 h-5" />} title="Marketing HQ" subtitle="مركز التسويق" accent="bg-[#B8860B]/10 text-[#B8860B]" />
              <ToolCard href="/admin/news" icon={<Newspaper className="w-5 h-5" />} title="إدارة الأخبار" subtitle="Admin news + RSS" accent="bg-amber-100 text-amber-700" />
              <ToolCard href="/admin/ad-builder" icon={<Sparkles className="w-5 h-5" />} title="مولد الإعلانات" subtitle="Ad Builder AI" accent="bg-pink-100 text-pink-700" />
              <ToolCard href="/admin/ad-creatives" icon={<ImageIcon className="w-5 h-5" />} title="إعلاناتي" subtitle="Ad Creatives library" accent="bg-fuchsia-100 text-fuchsia-700" />
              <ToolCard href="/admin/reels" icon={<Video className="w-5 h-5" />} title="الـ Reels" subtitle="فيديوهات قصيرة" accent="bg-rose-100 text-rose-700" />
              <ToolCard href="/admin/site-settings" icon={<ImageIcon className="w-5 h-5" />} title="إعدادات الموقع" subtitle="صور + سوشيال ميديا" accent="bg-pink-100 text-pink-700" />
              <ToolCard href="/admin/notifications" icon={<Bell className="w-5 h-5" />} title="إرسال إشعارات" subtitle={`${data.pushSubscribers} مفعّل الإشعارات`} accent="bg-blue-100 text-blue-700" />
            </div>
          </div>

          {/* 4. ANALYTICS & INTELLIGENCE */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> التحليلات والذكاء التجاري
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToolCard href="/admin/hq" icon={<Compass className="w-5 h-5" />} title="HQ · مركز القيادة" subtitle="Top-level overview" accent="bg-[#1F5F3F]/10 text-[#1F5F3F]" />
              <ToolCard href="/admin/insights" icon={<Lightbulb className="w-5 h-5" />} title="Insights" subtitle="رؤى وتحليلات" accent="bg-yellow-100 text-yellow-700" />
              <ToolCard href="/admin/funnel" icon={<TrendingUp className="w-5 h-5" />} title="Sales Funnel" subtitle="مسار التحويل" accent="bg-cyan-100 text-cyan-700" />
              <ToolCard href="/admin/demand-forecast" icon={<Zap className="w-5 h-5" />} title="توقعات الطلب" subtitle="Demand Forecast AI" accent="bg-blue-100 text-blue-700" />
              <ToolCard href="/admin/ceo-briefs" icon={<ScrollText className="w-5 h-5" />} title="CEO Briefs" subtitle="ملخصات يومية" accent="bg-slate-100 text-slate-700" />
              <ToolCard href="/admin/strategy" icon={<Target className="w-5 h-5" />} title="Strategy" subtitle="الاستراتيجية" accent="bg-indigo-100 text-indigo-700" />
            </div>
          </div>

          {/* 5. OPERATIONS & TRUST */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> العمليات والأمان
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToolCard href="/admin/activity" icon={<Activity className="w-5 h-5" />} title="نشاط الموقع" subtitle="Activity feed live" accent="bg-cyan-100 text-cyan-700" />
              <ToolCard href="/admin/fraud-alerts" icon={<ShieldAlert className="w-5 h-5" />} title="تنبيهات الاحتيال" subtitle="Fraud detection" accent="bg-red-100 text-red-700" />
              <ToolCard href="/admin/qc-reports" icon={<FlaskConical className="w-5 h-5" />} title="تقارير الجودة" subtitle="QC Reports" accent="bg-emerald-100 text-emerald-700" />
              <ToolCard href="/admin/collaborations" icon={<Network className="w-5 h-5" />} title="التعاونات" subtitle="Collaborations" accent="bg-teal-100 text-teal-700" />
              <ToolCard href="/admin/partnerships" icon={<Handshake className="w-5 h-5" />} title="الشراكات" subtitle="Partnerships" accent="bg-amber-100 text-amber-700" />
            </div>
          </div>

          {/* 6. OUR LISTINGS (Madmona supplier acct) */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-[#B8860B] uppercase tracking-widest mb-2 px-1">إعلاناتنا (Madmona Coworking)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToolCard href="/supplier/marketplace" icon={<Settings className="w-5 h-5" />} title="لوحة أجر معانا" subtitle="إدارة إعلاناتنا" accent="bg-[#1F5F3F]/10 text-[#1F5F3F]" />
              <ToolCard href="/supplier/marketplace/new" icon={<Package className="w-5 h-5" />} title="إضافة إعلان جديد" subtitle="مساحة، معدة، عربية..." accent="bg-blue-100 text-blue-700" />
              <ToolCard href="/supplier/marketplace/reviews" icon={<Star className="w-5 h-5" />} title="التقييمات" subtitle={data.totalReviews > 0 ? `${data.totalReviews} تقييم · ${Number(data.averageRating).toFixed(1)} ⭐` : 'مفيش تقييمات'} accent="bg-yellow-100 text-yellow-700" />
              <ToolCard href="/" icon={<Eye className="w-5 h-5" />} title="عرض الموقع" subtitle="شوف الموقع كما يراه أجر مننا" accent="bg-pink-100 text-pink-700" />
            </div>
          </div>

          {/* 7. TEAM & ACCOUNT */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">فريق العمل والحساب</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToolCard href="/supplier/team" icon={<UserCog className="w-5 h-5" />} title="إدارة الفريق" subtitle="موظفين بصلاحيات" accent="bg-orange-100 text-orange-700" />
              <ToolCard href="/account" icon={<Layers className="w-5 h-5" />} title="حسابي" subtitle="الإعدادات الشخصية" accent="bg-gray-100 text-gray-700" />
            </div>
          </div>

          {/* 8. LEGACY */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">صفحات قديمة (Legacy)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToolCard href="/admin/marketplace-suppliers" icon={<Building2 className="w-5 h-5" />} title="Suppliers (Old)" subtitle="نسخة قديمة → /admin/sup" accent="bg-gray-100 text-gray-600" />
              <ToolCard href="/admin/suppliers" icon={<Briefcase className="w-5 h-5" />} title="أجر معانا (V1)" subtitle="Legacy suppliers" accent="bg-gray-100 text-gray-600" />
              <ToolCard href="/admin/suppliers-v2" icon={<Briefcase className="w-5 h-5" />} title="أجر معانا (V2)" subtitle="Legacy suppliers v2" accent="bg-gray-100 text-gray-600" />
              <ToolCard href="/admin/bookings" icon={<History className="w-5 h-5" />} title="حجوزات قديمة" subtitle="Legacy bookings" accent="bg-gray-100 text-gray-600" />
              <ToolCard href="/admin/units" icon={<ClipboardList className="w-5 h-5" />} title="Units (قديم)" subtitle="نظام الوحدات القديم" accent="bg-gray-100 text-gray-600" />
            </div>
          </div>
        </section>

        {/* Booking distribution */}
        <section>
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">توزيع الحجوزات</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatusCard label="بانتظار" value={data.pendingBookings} color="text-yellow-700 bg-yellow-50" />
            <StatusCard label="مؤكّد" value={data.confirmedBookings} color="text-green-700 bg-green-50" />
            <StatusCard label="تمّ" value={data.completedBookings} color="text-gray-700 bg-gray-50" />
            <StatusCard label="ملغي" value={data.cancelledBookings} color="text-red-700 bg-red-50" />
            <StatusCard label="تقييم متوسط" value={data.averageRating > 0 ? `${Number(data.averageRating).toFixed(1)}` : '—'} color="text-[#B8860B] bg-[#B8860B]/10" suffix={data.totalReviews > 0 ? `(${data.totalReviews})` : ''} />
          </div>
        </section>

        {/* Top listings + recent bookings */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.topListings.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">الأكثر مشاهدة</h2>
              <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                {data.topListings.map((listing, i) => (
                  <Link key={listing.id} href={`/marketplace/${listing.slug}`} target="_blank" className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 no-underline">
                    <span className="w-6 h-6 bg-[#1F5F3F]/10 text-[#1F5F3F] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <h4 className="flex-1 text-sm font-medium text-gray-900 truncate">{listing.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {listing.views_count}</span>
                      {listing.rating && Number(listing.rating) > 0 && (
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-[#B8860B] text-[#B8860B]" />{Number(listing.rating).toFixed(1)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {data.recentBookings.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">آخر الحجوزات</h2>
              <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                {data.recentBookings.map(booking => {
                  const status = STATUS_LABELS[booking.status] || STATUS_LABELS.pending_payment
                  return (
                    <Link key={booking.id} href={`/bookings/${booking.id}`} className="flex items-center gap-3 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 no-underline">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                          {booking.reference_code && (<span className="text-[10px] text-gray-400 font-mono">#{booking.reference_code}</span>)}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">{booking.listing?.title || 'Listing محذوف'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{booking.customer?.full_name || 'أجر مننا'} · {booking.supplier?.business_name || 'أجر معانا'}</p>
                      </div>
                      <div className="text-left flex-shrink-0">
                        <p className="text-sm font-bold text-[#1F5F3F]">{Number(booking.total_amount).toLocaleString('ar-EG')} <span className="text-xs font-normal">ج.م</span></p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(booking.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function ToolCard({ href, icon, title, subtitle, accent, badge }: { href: string; icon: React.ReactNode; title: string; subtitle: string; accent: string; badge?: number }) {
  return (
    <Link href={href} className="group block bg-white rounded-2xl shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 p-4 no-underline relative">
      {badge && badge > 0 && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{badge}</span>
      )}
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${accent}`}>{icon}</div>
      <p className="font-bold text-gray-900 text-sm mb-1 leading-tight">{title}</p>
      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{subtitle}</p>
      <ChevronLeft className="absolute bottom-4 left-4 w-3.5 h-3.5 text-gray-300 group-hover:text-[#1F5F3F] group-hover:-translate-x-1 transition-all" />
    </Link>
  )
}

function ExternalToolCard({ href, icon, title, subtitle, accent }: { href: string; icon: React.ReactNode; title: string; subtitle: string; accent: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="group block bg-white rounded-2xl shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 p-4 no-underline relative">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${accent}`}>{icon}</div>
      <p className="font-bold text-gray-900 text-sm mb-1 leading-tight">{title}</p>
      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{subtitle}</p>
      <ExternalLink className="absolute bottom-4 left-4 w-3.5 h-3.5 text-gray-300 group-hover:text-[#1F5F3F] transition-all" />
    </a>
  )
}

function MetricCard({ icon, label, value, subtitle, accent }: { icon: React.ReactNode; label: string; value: string; subtitle?: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg mb-2 ${accent}`}>{icon}</div>
      <p className="text-[11px] text-gray-500 mb-1 leading-tight">{label}</p>
      <p className="text-lg sm:text-xl font-black text-gray-900 tabular">{value}</p>
      {subtitle && (<p className="text-[10px] text-gray-400 mt-1 tabular">{subtitle}</p>)}
    </div>
  )
}

function StatusCard({ label, value, color, suffix }: { label: string; value: string | number; color: string; suffix?: string }) {
  return (
    <div className={`rounded-2xl p-3 ${color}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-75">{label}</p>
      <p className="text-xl font-black tabular">
        {value}
        {suffix && <span className="text-xs font-normal opacity-75 mr-1">{suffix}</span>}
      </p>
    </div>
  )
}
