'use client'

/* ============================================================
   /admin/overview — Madmona Executive Overview (Premium)
   Boutique-grade owner dashboard. Wired LIVE to:
     • get_admin_dashboard_v2     (KPIs, B2B/B2C, AI, WhatsApp)
     • get_system_pulse_status    (health + pipelines)
     • get_admin_messages_summary (WhatsApp conversations)
     • get_owner_overview_charts  (monthly series + category mix)
   "تجريبي" toggle fills rich demo numbers for presentations.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { ActionHub } from '@/components/admin/ActionHub'
import { AgentDirectives } from '@/components/admin/AgentDirectives'
import { QuickHub } from '@/components/admin/QuickHub'

type Stage = 'loading' | 'unauthenticated' | 'ready'

type Monthly = { m: string; gmv: number; commission: number; bookings: number }
type CatRow = { slug: string; name_ar: string; cnt: number }
type Charts = { monthly: Monthly[]; by_category: CatRow[]; listings_by_category: CatRow[]; bookings_30d: number }

/* ---------- helpers ---------- */
const NUM = 'var(--font-inter), system-ui, sans-serif'
const PALETTE = ['#1F6F5F', '#2FA084', '#D4A017', '#6FCF97', '#2d7a52', '#B8861A', '#CBD6D0', '#175C4F', '#E9C45A']
const AR_MONTHS = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس']

function monthAr(m: string) {
  const idx = parseInt((m || '').split('-')[1] || '1', 10) - 1
  return AR_MONTHS[idx] || ''
}
function money(n: number): { v: string; s: string } {
  n = Number(n) || 0
  if (n >= 1e6) return { v: (n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 }), s: 'م ج' }
  if (n >= 1e5) return { v: Math.round(n / 1e3).toLocaleString('en-US'), s: 'ألف ج' }
  if (n >= 1e4) return { v: (n / 1e3).toLocaleString('en-US', { maximumFractionDigits: 1 }), s: 'ألف ج' }
  return { v: Math.round(n).toLocaleString('en-US'), s: 'ج' }
}
function count(n: number) { return (Number(n) || 0).toLocaleString('en-US') }

function emojiFor(slug: string, name: string) {
  const s = (slug + ' ' + name).toLowerCase()
  if (/car|vehicle|عرب|سيار|نقل/.test(s)) return '🚗'
  if (/video|photo|camera|تصوير|كامير|ميديا|media/.test(s)) return '📷'
  if (/rest|food|مطعم|مطاعم|طعام|كافيه|cafe/.test(s)) return '🍽️'
  if (/beauty|salon|spa|تجميل|صالون|سبا/.test(s)) return '💄'
  if (/propert|real|عقار|شق|فيلا|شاليه|chalet|apartment/.test(s)) return '🏠'
  if (/space|cowork|office|مساح|مكتب|قاع|hall/.test(s)) return '🏢'
  if (/product|wholesale|منتج|جمل|بيع/.test(s)) return '🛍️'
  if (/clinic|medical|عياد|طب|صح/.test(s)) return '🏥'
  if (/boat|marine|yacht|بحر|قارب|يخت/.test(s)) return '⛵'
  if (/equip|heavy|معد|آل/.test(s)) return '🚜'
  if (/tour|travel|سياح|رحل|تجرب/.test(s)) return '🏝️'
  if (/service|pro|خدم|احتراف/.test(s)) return '👨‍💼'
  return '📦'
}

/* tiny sparkline points in a 64x24 box */
function sparkPoints(arr: number[], w = 64, h = 24) {
  if (!arr.length) return ''
  const max = Math.max(1, ...arr)
  const min = Math.min(0, ...arr)
  const n = arr.length
  return arr.map((v, i) => {
    const x = n === 1 ? w : (i / (n - 1)) * w
    const y = h - 2 - ((v - min) / ((max - min) || 1)) * (h - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

/* ---------- DEMO dataset (for presentations) ---------- */
const DEMO = {
  d: {
    b2b: { active_partners: 6, leads_ready: 14, commission_month: 96000, gmv_month: 1850000 },
    b2c: {
      bookings_total: 5210, bookings_month: 1284, bookings_pending: 23,
      gmv_month: 1950000, commission_month: 188000,
      suppliers_approved: 312, suppliers_pending: 14,
      listings_published: 1497, listings_draft: 38,
      total_customers: 8400, total_reviews: 642, avg_rating: 4.8, push_subscribers: 2100,
    },
    ai: { agents_total: 76, agents_enabled: 74, agents_healthy: 71, agents_stale: 3, alerts_unresolved: 2, runs_today: 482, runs_failed_today: 3 },
    whatsapp: { queue_pending: 6, queue_failed: 0, review_pending: 4, sent_today: 214, cold_leads_total: 540, cold_leads_new: 31, cold_leads_contacted: 120 },
    recent_b2b_txns: [
      { id: 'd1', direction: 'in', amount_egp: 8500, category_snapshot: 'إيجار شقة · مدينة نصر', description: null, occurred_at: new Date().toISOString(), madmona_commission_amount: 850, business_name: 'عقارات النخبة', branch_name: null },
      { id: 'd2', direction: 'in', amount_egp: 420, category_snapshot: 'حجز طاولة · مطعم بحري', description: null, occurred_at: new Date().toISOString(), madmona_commission_amount: 42, business_name: 'مطعم الميناء', branch_name: null },
      { id: 'd3', direction: 'in', amount_egp: 2100, category_snapshot: 'إيجار سيارة · ٣ أيام', description: null, occurred_at: new Date().toISOString(), madmona_commission_amount: 210, business_name: 'Drive Egypt', branch_name: null },
      { id: 'd4', direction: 'in', amount_egp: 6200, category_snapshot: 'باقة عروسة', description: null, occurred_at: new Date().toISOString(), madmona_commission_amount: 620, business_name: 'Elite Beauty', branch_name: 'مصر الجديدة' },
    ],
    recent_ratings: [],
  },
  c: {
    monthly: [
      { m: '2025-09', gmv: 1600000, commission: 96000, bookings: 540 },
      { m: '2025-10', gmv: 1900000, commission: 116000, bookings: 612 },
      { m: '2025-11', gmv: 1750000, commission: 104000, bookings: 560 },
      { m: '2025-12', gmv: 2300000, commission: 142000, bookings: 720 },
      { m: '2026-01', gmv: 2600000, commission: 160000, bookings: 815 },
      { m: '2026-02', gmv: 2900000, commission: 188000, bookings: 905 },
      { m: '2026-03', gmv: 3200000, commission: 214000, bookings: 1010 },
      { m: '2026-04', gmv: 3450000, commission: 246000, bookings: 1130 },
      { m: '2026-05', gmv: 3800000, commission: 284000, bookings: 1284 },
    ] as Monthly[],
    by_category: [
      { slug: 'properties', name_ar: 'عقارات', cnt: 411 },
      { slug: 'vehicles', name_ar: 'مركبات', cnt: 231 },
      { slug: 'restaurants', name_ar: 'مطاعم', cnt: 180 },
      { slug: 'beauty', name_ar: 'تجميل', cnt: 154 },
      { slug: 'spaces', name_ar: 'مساحات عمل', cnt: 116 },
      { slug: 'products', name_ar: 'منتجات', cnt: 103 },
      { slug: 'other', name_ar: 'أخرى', cnt: 89 },
    ] as CatRow[],
    listings_by_category: [
      { slug: 'properties', name_ar: 'عقارات', cnt: 482 },
      { slug: 'vehicles', name_ar: 'مركبات', cnt: 306 },
      { slug: 'products', name_ar: 'منتجات · جملة', cnt: 213 },
      { slug: 'beauty', name_ar: 'تجميل', cnt: 187 },
      { slug: 'services', name_ar: 'خدمات احترافية', cnt: 144 },
      { slug: 'restaurants', name_ar: 'مطاعم', cnt: 94 },
      { slug: 'videography', name_ar: 'معدات تصوير', cnt: 89 },
      { slug: 'spaces', name_ar: 'مساحات عمل', cnt: 71 },
      { slug: 'tourism', name_ar: 'سياحة وتجارب', cnt: 62 },
      { slug: 'heavy', name_ar: 'معدات ثقيلة', cnt: 43 },
      { slug: 'clinics', name_ar: 'عيادات · تأمين', cnt: 38 },
      { slug: 'marine', name_ar: 'مركبات بحرية', cnt: 27 },
    ] as CatRow[],
    bookings_30d: 1284,
  } as Charts,
  m: { whatsapp: { conversations_open: 37, unanswered: 5, inbound_today: 96, outbound_today: 118 } },
  p: { overall_status: 'healthy' as const, unresolved_alerts: 2, pipelines: { publishing: { hours_since_last_publish: 1 } } },
}

export default function AdminOverview() {
  const [stage, setStage] = useState<Stage>('loading')
  const [demo, setDemo] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [live, setLive] = useState<{ d: any; c: Charts | null; m: any; p: any }>({ d: null, c: null, m: null, p: null })

  async function load() {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }
      setRefreshing(true)
      const sb = supabaseBrowser as any
      const [statsRes, pulseRes, msgRes, chartsRes] = await Promise.all([
        sb.rpc('get_admin_dashboard_v2'),
        sb.rpc('get_system_pulse_status'),
        sb.rpc('get_admin_messages_summary'),
        sb.rpc('get_owner_overview_charts'),
      ])
      setLive({
        d: statsRes.data || null,
        c: (chartsRes.data as Charts) || null,
        m: msgRes.data || null,
        p: pulseRes.data || null,
      })
      setStage('ready')
    } catch {
      setStage('ready')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  /* active dataset */
  const d = demo ? DEMO.d : (live.d || {})
  const c: Charts = demo ? DEMO.c : (live.c || { monthly: [], by_category: [], listings_by_category: [], bookings_30d: 0 })
  const m = demo ? DEMO.m : (live.m || {})
  const p = demo ? DEMO.p : (live.p || {})

  const b2b = d.b2b || {}
  const b2c = d.b2c || {}
  const ai = d.ai || {}
  const wa = d.whatsapp || {}

  const gmv = (Number(b2b.gmv_month) || 0) + (Number(b2c.gmv_month) || 0)
  const commission = (Number(b2b.commission_month) || 0) + (Number(b2c.commission_month) || 0)

  const monthly = c.monthly || []
  const gmvSeries = monthly.map((x) => Number(x.gmv) || 0)
  const comSeries = monthly.map((x) => Number(x.commission) || 0)
  const bkSeries = monthly.map((x) => Number(x.bookings) || 0)

  function mom(series: number[]) {
    if (series.length < 2) return null
    const last = series[series.length - 1], prev = series[series.length - 2]
    if (prev <= 0) return last > 0 ? 100 : null
    return Math.round(((last - prev) / prev) * 100)
  }
  const gmvDelta = mom(gmvSeries)
  const comDelta = mom(comSeries)
  const bkDelta = mom(bkSeries)

  const healthScore = (Number(ai.agents_total) || 0) > 0
    ? Math.round(((Number(ai.agents_healthy) || 0) / (Number(ai.agents_total) || 1)) * 100)
    : (demo ? 84 : 100)
  const overall = p?.overall_status || 'healthy'
  const healthLabel = overall === 'critical' ? 'محتاجة تدخّل' : overall === 'warning' ? 'فيه تنبيهات' : 'ممتازة'

  /* alerts from live signals */
  const alerts = useMemo(() => {
    const a: { tone: string; title: string; sub: string; href: string }[] = []
    if ((Number(b2c.bookings_pending) || 0) > 0) a.push({ tone: 'gold', title: `${count(b2c.bookings_pending)} حجز بانتظار الدفع`, sub: 'راجع الحجوزات وتابع التحصيل.', href: '/admin/marketplace-bookings' })
    if ((Number(ai.alerts_unresolved) || 0) > 0) a.push({ tone: 'green', title: `${count(ai.alerts_unresolved)} تنبيه AI غير محلول`, sub: 'من نظام الـ AI OS — راجعه.', href: '/admin/alerts' })
    if ((Number(b2c.listings_draft) || 0) > 0) a.push({ tone: 'ink', title: `${count(b2c.listings_draft)} منتج في المسودات`, sub: 'محتاجة مراجعة أو تأكيد رقم (OTP).', href: '/admin/listing-drafts' })
    if ((Number(b2c.suppliers_pending) || 0) > 0) a.push({ tone: 'green', title: `${count(b2c.suppliers_pending)} مورّد بانتظار التفعيل`, sub: 'راجع طلبات الانضمام.', href: '/admin/marketplace-suppliers' })
    if ((Number(wa.cold_leads_new) || 0) > 0) a.push({ tone: 'gold', title: `${count(wa.cold_leads_new)} lead جديد`, sub: 'جاهزين للتواصل عبر واتساب.', href: '/admin/outreach-leads' })
    if ((Number(wa.queue_failed) || 0) > 0) a.push({ tone: 'ink', title: `${count(wa.queue_failed)} رسالة واتساب فشلت`, sub: 'في طابور الإرسال.', href: '/admin/wa-review' })
    return a.slice(0, 4)
  }, [b2c, ai, wa])

  const txns = (d.recent_b2b_txns || []) as any[]
  const modules = (c.listings_by_category || []).slice(0, 12)

  if (stage === 'loading') {
    return (
      <div className="ov" dir="rtl">
        <style jsx>{styles}</style>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="ov" dir="rtl">
        <style jsx>{styles}</style>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div className="card" style={{ padding: 30, textAlign: 'center', maxWidth: 340 }}>
            <h1 style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>سجّل دخول الأول</h1>
            <Link href="/auth/login?redirect=/admin/dashboard" className="cta" style={{ display: 'inline-flex' }}>تسجيل دخول</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ov" dir="rtl">
      <style jsx>{styles}</style>
      <div className="app">

        {/* ============ SIDEBAR ============ */}
        <aside className="side">
          <div className="brand">
            <div className="mark">م</div>
            <div><h1>مضمونة</h1><p>سوق الإيجار والخدمات</p></div>
          </div>

          <nav className="side-scroll">
            <div className="nav-group">
              <div className="lbl">🏠 الرئيسية</div>
              <Link className="nav-item active" href="/admin/dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>نظرة عامة</Link>
              <Link className="nav-item" href="/admin/overview"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="5" cy="5" r="1.6" /><circle cx="12" cy="5" r="1.6" /><circle cx="19" cy="5" r="1.6" /><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /><circle cx="5" cy="19" r="1.6" /><circle cx="12" cy="19" r="1.6" /><circle cx="19" cy="19" r="1.6" /></svg>كل الأدوات (Hub)</Link>
              <Link className="nav-item" href="/admin/cockpit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>Cockpit</Link>
              <Link className="nav-item" href="/admin/command-center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h6l3-9 3 18 3-9h3" /></svg>Command Center</Link>
              <Link className="nav-item" href="/admin/hq"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01" /></svg>HQ</Link>
              <Link className="nav-item" href="/admin/ceo-briefs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>CEO Briefs</Link>
              <Link className="nav-item" href="/admin/strategy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>Strategy</Link>
            </div>

            <div className="nav-group">
              <div className="lbl">🛒 السوق والمنتجات</div>
              <Link className="nav-item" href="/admin/listings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></svg>المنتجات</Link>
              <Link className="nav-item" href="/admin/listing-drafts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>مسودات المنتجات</Link>
              <Link className="nav-item" href="/admin/listing-performance"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 6-6" /></svg>أداء المنتجات</Link>
              <Link className="nav-item" href="/admin/marketplace-bookings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>حجوزات الماركتبليس</Link>
              <Link className="nav-item" href="/admin/marketplace-orders"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 01-8 0" /></svg>طلبات الماركتبليس</Link>
              <Link className="nav-item" href="/admin/bookings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>الحجوزات</Link>
              <Link className="nav-item" href="/admin/marketplace-suppliers"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>موردي الماركتبليس</Link>
              <Link className="nav-item" href="/admin/suppliers"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></svg>الموردين</Link>
              <Link className="nav-item" href="/admin/suppliers-v2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="7" r="4" /><circle cx="17" cy="7" r="3" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6" /></svg>موردين v2</Link>
              <Link className="nav-item" href="/admin/supplier-posts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 10h8M8 14h5" /></svg>بوستات الموردين</Link>
              <Link className="nav-item" href="/admin/units"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>الوحدات</Link>
              <Link className="nav-item" href="/admin/categories"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l1-5h16l1 5" /><path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" /></svg>الفئات / الموديولز</Link>
            </div>

            <div className="nav-group">
              <div className="lbl">💰 المالية والعمليات</div>
              <Link className="nav-item" href="/admin/payouts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h4" /></svg>المستحقات</Link>
              <Link className="nav-item" href="/admin/custody"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v7l9 4 9-4V7" /></svg>العهدة</Link>
              <Link className="nav-item" href="/admin/business-finance/c8b7b9d7-6178-4d0c-abdf-66f34b628e9d"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5S15.5 16.7 15.5 20" /></svg>الفريق والحضور</Link>
              <Link className="nav-item" href="/admin/business-partners"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>شركاء B2B</Link>
              <Link className="nav-item" href="/admin/partnerships"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 16l4 4M20 16l-4 4M2 12l5 5L19 5" /></svg>الشراكات</Link>
              <Link className="nav-item" href="/admin/sponsorships"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>الرعاية</Link>
              <Link className="nav-item" href="/admin/collaborations"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M17 3.13a4 4 0 010 7.75" /></svg>التعاون</Link>
              <Link className="nav-item" href="/admin/madmona"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>مضمونة (الشركة)</Link>
              <Link className="nav-item" href="/admin/careers"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18" /></svg>طلبات التوظيف</Link>
              <Link className="nav-item" href="/admin/flow-tasks"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>Flow Tasks</Link>
              <Link className="nav-item" href="/admin/company"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></svg>Company</Link>
            </div>

            <div className="nav-group">
              <div className="lbl">📲 الليدز والتواصل</div>
              <Link className="nav-item" href="/admin/outreach-leads"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /><circle cx="12" cy="12" r="4" /></svg>Outreach Leads</Link>
              <Link className="nav-item" href="/admin/leads"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>Leads</Link>
              <Link className="nav-item" href="/admin/leads-feed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16" /><circle cx="5" cy="19" r="1" /></svg>Leads Feed</Link>
              <Link className="nav-item" href="/admin/funnel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18l-7 8v6l-4 2v-8z" /></svg>Funnel</Link>
              <Link className="nav-item" href="/admin/messages"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1121 11.5z" /></svg>المحادثات</Link>
              <Link className="nav-item" href="/admin/wa-review"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>مراجعة WA</Link>
              <Link className="nav-item" href="/admin/marid-monitor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1121 11.5z" /></svg>🧞 مراقبة المارد لايف</Link>
            </div>

            <div className="nav-group">
              <div className="lbl">🎨 المحتوى والإعلانات</div>
              <Link className="nav-item" href="/admin/marketing-hq"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>مركز المحتوى</Link>
              <Link className="nav-item" href="/admin/social-packs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>Social Packs</Link>
              <Link className="nav-item" href="/admin/social-groups"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><circle cx="5" cy="19" r="2" /></svg>Social Groups</Link>
              <Link className="nav-item" href="/admin/reels"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18M15 3v18" /></svg>Reels</Link>
              <Link className="nav-item" href="/admin/ad-builder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" /></svg>Ad Builder</Link>
              <Link className="nav-item" href="/admin/ad-creatives"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><path d="M16 8l-8 8M8 8l8 8" /></svg>Ad Creatives</Link>
              <Link className="nav-item" href="/admin/ad-review"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></svg>Ad Review</Link>
              <Link className="nav-item" href="/admin/news"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zM18 14h-8M15 18h-5M10 6h8v4h-8z" /></svg>أخبار</Link>
              <Link className="nav-item" href="/admin/daily-messages"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>رسائل يومية</Link>
              <Link className="nav-item" href="/admin/welcome-messages"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 18l3-3 3 3 4-4 4 4 4-4" /><path d="M3 6h18" /></svg>رسائل ترحيب</Link>
              <Link className="nav-item" href="/admin/email-queue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16c1 0 2 1 2 2v12c0 1-1 2-2 2H4c-1 0-2-1-2-2V6c0-1 1-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>Email Queue</Link>
              <Link className="nav-item" href="/admin/email-templates"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 8h16M8 4v16" /></svg>Email Templates</Link>
            </div>

            <div className="nav-group">
              <div className="lbl">🤖 الـ AI OS</div>
              <Link className="nav-item" href="/admin/ai-os"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 9h6v6H9z" /></svg>AI OS</Link>
              <Link className="nav-item" href="/admin/ai-assistant"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><path d="M8 9h.01M16 9h.01M8 15c1 1 2 2 4 2s3-1 4-2" /></svg>المساعد الذكي</Link>
              <Link className="nav-item" href="/admin/agents"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="7" r="4" /><path d="M3 21v-2a7 7 0 0118 0v2" /></svg>Agents</Link>
              <Link className="nav-item" href="/admin/agent-runs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><polyline points="10 8 16 12 10 16 10 8" /></svg>Agent Runs</Link>
              <Link className="nav-item" href="/admin/agent-health"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>Agent Health</Link>
              <Link className="nav-item" href="/admin/agent-network"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="2" /><circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="18" r="2" /><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" /></svg>شبكة Agents</Link>
              <Link className="nav-item" href="/admin/workflows"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="6" height="6" /><rect x="15" y="3" width="6" height="6" /><rect x="3" y="15" width="6" height="6" /><rect x="15" y="15" width="6" height="6" /><path d="M9 6h6M9 18h6M6 9v6M18 9v6" /></svg>Workflows</Link>
              <Link className="nav-item" href="/admin/pipelines"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h6m6 0h6" /><circle cx="12" cy="12" r="3" /></svg>Pipelines</Link>
              <Link className="nav-item" href="/admin/capabilities"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>Capabilities</Link>
              <Link className="nav-item" href="/admin/prompt-versions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h6M8 16h4" /></svg>Prompts</Link>
              <Link className="nav-item" href="/admin/policy-rules"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>Policy Rules</Link>
              <Link className="nav-item" href="/admin/qc-reports"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4" /><rect x="3" y="4" width="18" height="16" rx="2" /></svg>QC Reports</Link>
            </div>

            <div className="nav-group">
              <div className="lbl">📊 المراقبة والذكاء</div>
              <Link className="nav-item" href="/admin/insights"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>Insights</Link>
              <Link className="nav-item" href="/admin/demand-forecast"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18" /><path d="M7 17l4-8 4 4 6-6" /></svg>توقعات الطلب</Link>
              <Link className="nav-item" href="/admin/performance"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18" /><path d="M7 12l3-3 4 4 6-6" /></svg>الأداء</Link>
              <Link className="nav-item" href="/admin/activity"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>النشاط</Link>
              <Link className="nav-item" href="/admin/alerts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>تنبيهات</Link>
              <Link className="nav-item" href="/admin/notifications"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>الإشعارات</Link>
              <Link className="nav-item" href="/admin/fraud-alerts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2L4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>تنبيهات الاحتيال</Link>
            </div>

            <div className="nav-group">
              <div className="lbl">⚙️ الإعدادات والأنظمة</div>
              <Link className="nav-item" href="/admin/site-settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.91 19a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 005 8.91a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>إعدادات الموقع</Link>
              <Link className="nav-item" href="/admin/permissions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>الصلاحيات</Link>
              <Link className="nav-item" href="/admin/runbook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16v16H4z" /><path d="M4 9h16M9 4v16" /></svg>System Runbook</Link>
            </div>
          </nav>

          <Link className="cta" href="/add-listing"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" /></svg>ضيف منتج</Link>

          <div className="profile">
            <div className="av">م</div>
            <div><div className="nm">محمد</div><div className="rl">المالك · مضمونة</div></div>
            <div className="dot" />
          </div>
        </aside>

        {/* ============ MAIN ============ */}
        <div className="main">
          <header className="topbar">
            <div className="ttl"><h2>نظرة عامة</h2><p>{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
            <div className="tb-right">
              <button className={`switch ${demo ? 'demo' : 'live'}`} onClick={() => setDemo(v => !v)} title="بدّل بين البيانات الحيّة والعرض التجريبي">
                <span className={demo ? '' : 'on'}>● حيّة</span>
                <span className={demo ? 'on' : ''}>تجريبي</span>
              </button>
              <button className="icon-btn" onClick={load} title="تحديث">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={refreshing ? 'spin' : ''}><path d="M21 12a9 9 0 11-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
              </button>
              <Link className="icon-btn" href="/admin/overview" title="كل الأدوات">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="5" cy="5" r="1.6" /><circle cx="12" cy="5" r="1.6" /><circle cx="19" cy="5" r="1.6" /><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /><circle cx="5" cy="19" r="1.6" /><circle cx="12" cy="19" r="1.6" /><circle cx="19" cy="19" r="1.6" /></svg>
              </Link>
            </div>
          </header>

          <div className="wrap">

            {/* Quick Hub — 8 cards لكل مركز تحكم (التوظيف بيبان هنا) */}
            <QuickHub />

            {/* Agent Directives — توجيهات الـ AI agents من Mohamed */}
            <AgentDirectives />

            {/* Action Hub — كل المهام المعلّقة في مكان واحد */}
            <ActionHub />

            {/* greeting */}
            <div className="greet reveal">
              <div>
                <h2>أهلاً محمد <span className="wave">👋</span></h2>
                <p>{demo ? 'عرض تجريبي — أرقام كاملة لتصوّر شكل المنصّة وهي شغّالة بالكامل.' : 'دي أرقامك الحيّة من مضمونة دلوقتي — كله في مكان واحد.'}</p>
              </div>
              <div className="health">
                <div className="ring">
                  <svg viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#E7F1ED" strokeWidth="6" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="url(#hg)" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 20} strokeDashoffset={(2 * Math.PI * 20) * (1 - healthScore / 100)} transform="rotate(-90 24 24)" />
                    <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D4A017" /><stop offset="1" stopColor="#1F6F5F" /></linearGradient></defs>
                  </svg>
                  <b style={{ fontFamily: NUM }}>{healthScore}</b>
                </div>
                <div><div className="t">صحة المنصّة</div><div className="v">{healthLabel}</div></div>
              </div>
            </div>

            {/* PILLARS */}
            <section className="sec reveal" style={{ animationDelay: '.05s' }}>
              <div className="kicker">ركائز مضمونة · وعد الـ B2B</div>
              <div className="pillars">
                <div className="card hover pillar">
                  <span className="rank" style={{ fontFamily: NUM }}>1</span>
                  <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg></div>
                  <h4>حماية كاملة</h4>
                  <p>كل صفقة مؤمّنة من الأول للآخر — الفلوس محجوزة لحد ما الطرفين يتطمّنوا.</p>
                  <div className="metric"><b style={{ fontFamily: NUM }}>100%</b><span>من الصفقات مغطّاة بالضمان</span></div>
                </div>
                <div className="card hover pillar">
                  <span className="rank" style={{ fontFamily: NUM }}>2</span>
                  <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg></div>
                  <h4>دفع مستحقات سريع</h4>
                  <p>المورّد بياخد فلوسه بسرعة بعد إتمام الخدمة — من غير تعطيل ولا تعقيد.</p>
                  <div className="metric"><b style={{ fontFamily: NUM }}>24<span style={{ fontSize: 13 }}>س</span></b><span>متوسط وقت صرف المستحقات</span></div>
                </div>
                <div className="card hover pillar">
                  <span className="rank" style={{ fontFamily: NUM }}>3</span>
                  <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 18v-6a8 8 0 1116 0v6" /><path d="M4 16a2 2 0 012-2h1v6H6a2 2 0 01-2-2zM20 16a2 2 0 00-2-2h-1v6h1a2 2 0 002-2z" /></svg></div>
                  <h4>دعم مستمر</h4>
                  <p>فريق ومنظومة AI شغّالة ٢٤/٧ تساند المورّد والعميل في أي وقت.</p>
                  <div className="metric"><b style={{ fontFamily: NUM }}>&lt;5<span style={{ fontSize: 13 }}>د</span></b><span>متوسط زمن الرد على واتساب</span></div>
                </div>
              </div>

              {/* B2B strip */}
              <div className="b2b">
                <div className="lead">
                  <span className="bdg">B2B</span>
                  <div><h4>بوابة الشركات</h4><p>{count(b2b.active_partners || 0)} شركة شريكة · كل اللي شركتك محتاجاه</p></div>
                </div>
                <div className="feats">
                  <span className="feat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h12" /></svg>عمولة موحدة 10%</span>
                  <span className="feat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18" /></svg>CRM + ERP باشتراك شهري</span>
                  <span className="feat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" /></svg>إضافة منتج مجانية</span>
                </div>
                <Link className="goto" href="/admin/business-partners">افتح البوابة<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 6l-6 6 6 6" /></svg></Link>
              </div>
            </section>

            {/* KPIs */}
            <section className="sec reveal" style={{ animationDelay: '.1s' }}>
              <div className="kicker">المؤشرات الرئيسية {demo ? '· تجريبي' : '· حيّة'}</div>
              <div className="kpis">
                <Kpi label="إجمالي المبيعات (GMV)" mv={money(gmv)} delta={gmvDelta} spark={sparkPoints(gmvSeries)} sparkColor="#2FA084"
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>} />
                <Kpi label="العمولة المحصّلة" mv={money(commission)} delta={comDelta} spark={sparkPoints(comSeries)} sparkColor="#D4A017"
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="6" width="20" height="13" rx="2" /><circle cx="12" cy="12.5" r="3" /></svg>} />
                <Kpi label="الموردين النشطين" mv={{ v: count(b2c.suppliers_approved || 0), s: '' }} note={(b2c.suppliers_pending || 0) > 0 ? `+${count(b2c.suppliers_pending)} في الانتظار` : 'الكل مفعّل'}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></svg>} />
                <Kpi label="منتجات منشورة" mv={{ v: count(b2c.listings_published || 0), s: '' }} note={(b2c.listings_draft || 0) > 0 ? `${count(b2c.listings_draft)} مسودة` : 'مفيش مسودات'}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></svg>} />
                <Kpi label="الحجوزات (الشهر)" mv={{ v: count(b2c.bookings_month || 0), s: '' }} delta={bkDelta} spark={sparkPoints(bkSeries)} sparkColor="#2FA084"
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>} />
                <Kpi label="حجوزات بانتظار الدفع" mv={{ v: count(b2c.bookings_pending || 0), s: '' }} note={(b2c.bookings_pending || 0) > 0 ? 'محتاجة متابعة' : 'مفيش معلّق'}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>} />
              </div>
            </section>

            {/* analytics */}
            <section className="sec reveal" style={{ animationDelay: '.15s' }}>
              <div className="grid-2">
                <div className="card panel">
                  <div className="ph">
                    <div><h4>الإيرادات والعمولة</h4><p>آخر ٩ شهور · بالجنيه {demo ? '' : '(حيّة)'}</p></div>
                    <div className="legend">
                      <i><b style={{ background: '#2FA084' }} />GMV</i>
                      <i><b style={{ background: '#D4A017' }} />العمولة</i>
                    </div>
                  </div>
                  <div className="bigfig" style={{ fontFamily: NUM }}>{money(gmv).v}<span style={{ fontFamily: 'inherit', fontSize: 13, color: 'var(--ink-mute)', fontWeight: 600 }}> {money(gmv).s}</span>
                    {gmvDelta !== null && <span style={{ fontSize: 12, color: gmvDelta >= 0 ? '#0e7a52' : '#a8531a', fontWeight: 700, marginInlineStart: 8 }}>{gmvDelta >= 0 ? '▲' : '▼'} {Math.abs(gmvDelta)}%</span>}
                  </div>
                  <AreaChart monthly={monthly} />
                </div>

                <div className="card panel">
                  <div className="ph"><div><h4>الحجوزات حسب القطاع</h4><p>{demo ? 'توزيع تجريبي' : `${count(c.bookings_30d || 0)} حجز · آخر ٣٠ يوم`}</p></div></div>
                  <Donut data={c.by_category || []} />
                </div>
              </div>
            </section>

            {/* modules */}
            <section className="sec reveal" style={{ animationDelay: '.2s' }}>
              <div className="sec-head">
                <div><div className="kicker">قطاعات السوق</div><h3>الموديولز {demo ? '' : '· منتجات منشورة'}</h3></div>
                <Link className="more" href="/admin/categories">إدارة الموديولز<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 6l-6 6 6 6" /></svg></Link>
              </div>
              {modules.length === 0 ? (
                <div className="card" style={{ padding: 22, textAlign: 'center', color: 'var(--ink-mute)', fontWeight: 600 }}>لسه مفيش منتجات منشورة لعرضها هنا.</div>
              ) : (
                <div className="mods">
                  {modules.map((mo) => (
                    <Link key={mo.slug} href={`/marketplace?category=${mo.slug}`} className="card hover mod">
                      <div className="em">{emojiFor(mo.slug, mo.name_ar)}</div>
                      <div className="nm">{mo.name_ar}</div>
                      <div className="st"><b style={{ fontFamily: NUM }}>{count(mo.cnt)}</b><span>منتج</span></div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* operations + systems */}
            <section className="sec reveal" style={{ animationDelay: '.25s' }}>
              <div className="kicker">العمليات والأنظمة</div>
              <div className="grid-3">
                {/* payouts */}
                <div className="card opc">
                  <div className="h"><span className="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20M6 15h4" /></svg></span><h4>المبيعات والمستحقات</h4></div>
                  <div className="rowline"><span className="k">مبيعات الشهر (GMV)</span><span className="v" style={{ fontFamily: NUM }}>{money(gmv).v} {money(gmv).s}</span></div>
                  <div className="rowline"><span className="k">عمولة مضمونة (الشهر)</span><span className="v" style={{ fontFamily: NUM }}>{money(commission).v} {money(commission).s}</span></div>
                  <div className="rowline"><span className="k">حجوزات بانتظار الدفع</span><span className={`v ${(b2c.bookings_pending || 0) > 0 ? 'warn' : ''}`} style={{ fontFamily: NUM }}>{count(b2c.bookings_pending || 0)}</span></div>
                  <Link className="minibtn" href="/admin/payouts">إدارة المستحقات<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 13, height: 13 }}><path d="M15 6l-6 6 6 6" /></svg></Link>
                </div>

                {/* AI OS */}
                <div className="card opc">
                  <div className="h"><span className="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 9h6v6H9z" /></svg></span><h4>الـ AI OS</h4><span className="live"><span className="d" />شغّال</span></div>
                  <div className="rowline"><span className="k">Agents مفعّلة</span><span className="v" style={{ fontFamily: NUM }}>{count(ai.agents_enabled || 0)}/{count(ai.agents_total || 0)}</span></div>
                  <div className="rowline"><span className="k">مهام نُفّذت اليوم</span><span className="v" style={{ fontFamily: NUM }}>{count(ai.runs_today || 0)}</span></div>
                  <div className="rowline"><span className="k">تنبيهات غير محلولة</span><span className={`v ${(ai.alerts_unresolved || 0) > 0 ? 'warn' : ''}`} style={{ fontFamily: NUM }}>{count(ai.alerts_unresolved || 0)}</span></div>
                  <div className="bar"><i style={{ width: `${healthScore}%` }} /></div>
                </div>

                {/* WhatsApp */}
                <div className="card opc">
                  <div className="h"><span className="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1121 11.5z" /></svg></span><h4>واتساب</h4><span className="live"><span className="d" />Live</span></div>
                  <div className="rowline"><span className="k">محادثات مفتوحة</span><span className="v" style={{ fontFamily: NUM }}>{count(m?.whatsapp?.conversations_open || 0)}</span></div>
                  <div className="rowline"><span className="k">اتبعت النهاردة</span><span className="v" style={{ fontFamily: NUM }}>{count(wa.sent_today || 0)}</span></div>
                  <div className="rowline"><span className="k">Leads جديدة</span><span className="v" style={{ fontFamily: NUM }}>{count(wa.cold_leads_new || 0)}</span></div>
                  <Link className="minibtn" href="/admin/messages">افتح المحادثات<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 13, height: 13 }}><path d="M15 6l-6 6 6 6" /></svg></Link>
                </div>
              </div>
            </section>

            {/* activity + alerts */}
            <section className="sec reveal" style={{ animationDelay: '.3s' }}>
              <div className="grid-last">
                <div className="card panel" style={{ paddingTop: 18 }}>
                  <div className="sec-head" style={{ marginBottom: 8 }}><h3 style={{ fontSize: 15 }}>آخر المعاملات</h3><Link className="more" href="/admin/business-finance/c8b7b9d7-6178-4d0c-abdf-66f34b628e9d">الكل<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 6l-6 6 6 6" /></svg></Link></div>
                  {txns.length === 0 ? (
                    <div style={{ padding: '26px 0', textAlign: 'center', color: 'var(--ink-mute)', fontWeight: 600, fontSize: 13 }}>لسه مفيش معاملات لعرضها.</div>
                  ) : (
                    <table className="tbl">
                      <thead><tr><th>الوصف</th><th>الجهة</th><th>القيمة</th></tr></thead>
                      <tbody>
                        {txns.slice(0, 6).map((t) => (
                          <tr key={t.id}>
                            <td><span className="who"><span className="ava">{t.direction === 'in' ? '▲' : '▼'}</span>{t.category_snapshot || t.description || 'معاملة'}</span></td>
                            <td>{t.business_name}{t.branch_name ? ` · ${t.branch_name}` : ''}</td>
                            <td className="amt" style={{ fontFamily: NUM, color: t.direction === 'in' ? '#0e7a52' : '#a8531a' }}>{t.direction === 'in' ? '+' : '−'}{count(t.amount_egp)} ج</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="card alerts">
                  <div className="sec-head" style={{ marginBottom: 6 }}><h3 style={{ fontSize: 15 }}>يحتاج انتباهك</h3></div>
                  {alerts.length === 0 ? (
                    <div className="alert green">
                      <span className="ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 12a10 10 0 11-5-8.7" /><path d="M22 4l-10 10-3-3" /></svg></span>
                      <div className="tx"><h5>كل حاجة تمام ✓</h5><p>مفيش حاجة محتاجة تدخّل دلوقتي.</p></div>
                    </div>
                  ) : alerts.map((al, i) => (
                    <Link key={i} href={al.href} className={`alert ${al.tone}`} style={{ textDecoration: 'none' }}>
                      <span className="ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z" /></svg></span>
                      <div className="tx"><h5>{al.title}</h5><p>{al.sub}</p></div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <footer>
              <span><span className="sl">مضمونة</span> — احنا بتوع الإيجار · لوحة التحكم</span>
              <span>{demo ? 'عرض تجريبي · أرقام للعرض فقط' : 'بيانات حيّة من قاعدة البيانات'}</span>
            </footer>

          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */
function Kpi({ label, mv, note, delta, spark, sparkColor, icon }: {
  label: string; mv: { v: string; s: string }; note?: string; delta?: number | null; spark?: string; sparkColor?: string; icon: React.ReactNode
}) {
  return (
    <div className="card hover kpi">
      <div className="top"><span className="ki">{icon}</span><span className="lbl">{label}</span></div>
      <div className="val" style={{ fontFamily: NUM }}>{mv.v}{mv.s ? <small> {mv.s}</small> : null}</div>
      <div className="foot">
        {delta !== undefined && delta !== null ? (
          <span className={`delta ${delta >= 0 ? 'up' : 'dn'}`} style={{ fontFamily: NUM }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>
        ) : (
          <span className="note">{note || ''}</span>
        )}
        {spark ? <svg className="spark" viewBox="0 0 64 24"><polyline points={spark} fill="none" stroke={sparkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
      </div>
    </div>
  )
}

function AreaChart({ monthly }: { monthly: Monthly[] }) {
  const W = 720, H = 250, padL = 40, padR = 20, padT = 28, padB = 40
  if (!monthly.length) return <div style={{ height: 170, display: 'grid', placeItems: 'center', color: '#7C8A84', fontWeight: 600, fontSize: 13 }}>مفيش بيانات كفاية للرسم.</div>
  const n = monthly.length
  const gmv = monthly.map(d => Number(d.gmv) || 0)
  const com = monthly.map(d => Number(d.commission) || 0)
  const maxV = Math.max(1, ...gmv)
  const x = (i: number) => padL + (n === 1 ? 0 : (i / (n - 1)) * (W - padL - padR))
  const yG = (v: number) => (H - padB) - (v / maxV) * (H - padT - padB)
  const gmvPts = monthly.map((_, i) => `${x(i).toFixed(1)},${yG(gmv[i]).toFixed(1)}`).join(' ')
  const comPts = monthly.map((_, i) => `${x(i).toFixed(1)},${yG(com[i]).toFixed(1)}`).join(' ')
  const areaD = `M${x(0).toFixed(1)},${(H - padB)} L${monthly.map((_, i) => `${x(i).toFixed(1)},${yG(gmv[i]).toFixed(1)}`).join(' L')} L${x(n - 1).toFixed(1)},${(H - padB)} Z`
  const grid = [0, 1, 2, 3].map(k => padT + k * ((H - padT - padB) / 3))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 6 }}>
      <defs><linearGradient id="ovarea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2FA084" stopOpacity=".28" /><stop offset="1" stopColor="#2FA084" stopOpacity="0" /></linearGradient></defs>
      <g stroke="#1F6F5F" strokeOpacity=".08" strokeDasharray="3 5">{grid.map((gy, i) => <line key={i} x1={padL} y1={gy} x2={W - padR} y2={gy} />)}</g>
      <path d={areaD} fill="url(#ovarea)" />
      <polyline points={gmvPts} fill="none" stroke="#2FA084" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={comPts} fill="none" stroke="#D4A017" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={yG(gmv[n - 1])} r="4.5" fill="#2FA084" stroke="#fff" strokeWidth="2" />
      <circle cx={x(n - 1)} cy={yG(com[n - 1])} r="4" fill="#D4A017" stroke="#fff" strokeWidth="2" />
      <g fill="#7C8A84" fontSize="11" textAnchor="middle" style={{ fontFamily: NUM }}>
        {monthly.map((d, i) => <text key={i} x={x(i)} y={H - 14}>{monthAr(d.m)}</text>)}
      </g>
    </svg>
  )
}

function Donut({ data }: { data: CatRow[] }) {
  const r = 62, C = 2 * Math.PI * r
  const total = data.reduce((s, x) => s + (Number(x.cnt) || 0), 0)
  if (!total) return <div style={{ height: 150, display: 'grid', placeItems: 'center', color: '#7C8A84', fontWeight: 600, fontSize: 13 }}>لسه مفيش حجوزات بقطاعات.</div>
  let acc = 0
  const segs = data.map((x, i) => {
    const frac = (Number(x.cnt) || 0) / total
    const dash = frac * C
    const offset = -acc
    acc += dash
    return { dash, offset, color: PALETTE[i % PALETTE.length], ...x }
  })
  return (
    <div className="donut-wrap" style={{ marginTop: 14 }}>
      <div className="donut">
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#EEF3F0" strokeWidth="18" />
          <g transform="rotate(-90 80 80)" strokeWidth="18" fill="none">
            {segs.map((sg, i) => (
              <circle key={i} cx="80" cy="80" r={r} stroke={sg.color} strokeDasharray={`${sg.dash.toFixed(2)} ${(C - sg.dash).toFixed(2)}`} strokeDashoffset={sg.offset.toFixed(2)} />
            ))}
          </g>
        </svg>
        <div className="ctr"><b style={{ fontFamily: NUM }}>{count(total)}</b><span>حجز</span></div>
      </div>
      <div className="dleg">
        {segs.slice(0, 7).map((sg, i) => (
          <div className="row" key={i}><b style={{ background: sg.color }} />{sg.name_ar}<span className="pc" style={{ fontFamily: NUM }}>{Math.round(((Number(sg.cnt) || 0) / total) * 100)}%</span></div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   STYLES (boutique premium · brand tokens)
   ============================================================ */
const styles = `
.ov{
  --cream:#FAFAF7; --cream-2:#F3F1EA; --paper:#FFFFFF;
  --ink:#0A0A0A; --ink-soft:#41504A; --ink-mute:#7C8A84;
  --green-deep:#1F6F5F; --green-700:#175C4F; --green-mid:#2FA084; --green-soft:#6FCF97; --green-fog:#E7F1ED;
  --gold:#D4A017; --gold-soft:#E9C45A; --gold-deep:#B8861A;
  --line-2:rgba(10,10,10,.07); --line-3:rgba(31,111,95,.07);
  --shadow-sm:0 1px 2px rgba(16,40,34,.05);
  --shadow:0 1px 2px rgba(16,40,34,.04), 0 10px 34px -12px rgba(16,40,34,.16);
  --shadow-lg:0 24px 60px -22px rgba(16,40,34,.30);
  --grad-cta:linear-gradient(118deg,#D4A017 0%,#2FA084 56%,#1F6F5F 100%);
  --grad-ink:linear-gradient(110deg,#0A0A0A,#1F6F5F);
  color:var(--ink); min-height:100vh;
  background-color:var(--cream);
  background-image:
    radial-gradient(680px 420px at 92% -6%, rgba(212,160,23,.10), transparent 60%),
    radial-gradient(720px 520px at 6% 0%, rgba(47,160,132,.12), transparent 58%),
    radial-gradient(900px 700px at 80% 110%, rgba(31,111,95,.08), transparent 60%);
}
.ov *{box-sizing:border-box}
.ov svg{display:block}
.ov a{text-decoration:none;color:inherit}
.spinner{width:34px;height:34px;border-radius:50%;border:3px solid var(--green-fog);border-top-color:var(--green-deep);animation:sp 1s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.spin{animation:sp 1s linear infinite}

.app{display:grid;grid-template-columns:262px 1fr;min-height:100vh}

.side{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;
  background:linear-gradient(180deg,rgba(255,255,255,.86),rgba(248,248,244,.7));
  backdrop-filter:blur(14px);border-inline-start:1px solid var(--line-2);padding:24px 16px 16px}
.side-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding-inline-end:4px;scrollbar-width:thin;scrollbar-color:rgba(31,111,95,.18) transparent}
.side-scroll::-webkit-scrollbar{width:6px}
.side-scroll::-webkit-scrollbar-track{background:transparent}
.side-scroll::-webkit-scrollbar-thumb{background:rgba(31,111,95,.18);border-radius:99px}
.side-scroll::-webkit-scrollbar-thumb:hover{background:rgba(31,111,95,.32)}
.brand{display:flex;align-items:center;gap:11px;padding:4px 8px 20px}
.brand .mark{width:38px;height:38px;border-radius:12px;background:var(--grad-cta);display:grid;place-items:center;color:#fff;font-weight:900;font-size:20px;box-shadow:0 8px 18px -8px rgba(31,111,95,.6)}
.brand h1{font-size:20px;font-weight:800;letter-spacing:-.02em;margin:0}
.brand p{font-size:10.5px;color:var(--ink-mute);font-weight:600;margin:1px 0 0}
.nav-group{margin:12px 0 4px}
.nav-group .lbl{font-size:10px;font-weight:700;color:var(--ink-mute);letter-spacing:.1em;padding:0 12px 7px}
.nav-item{display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:11px;color:var(--ink-soft);font-weight:600;font-size:13px;position:relative;transition:.18s;margin-bottom:1px}
.nav-item svg{width:17px;height:17px;stroke-width:1.7;opacity:.8;flex:none}
.nav-item:hover{background:rgba(31,111,95,.06);color:var(--green-deep)}
.nav-item.active{background:var(--green-fog);color:var(--green-deep);box-shadow:inset 0 0 0 1px rgba(31,111,95,.1)}
.nav-item.active::before{content:"";position:absolute;inset-inline-end:-16px;top:50%;transform:translateY(-50%);width:4px;height:22px;border-radius:4px;background:var(--grad-cta)}
.side .cta{margin:16px 6px 10px;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:14px;background:var(--grad-cta);color:#fff;font-weight:800;font-size:14px;box-shadow:0 14px 26px -12px rgba(31,111,95,.6);transition:.2s}
.side .cta:hover{transform:translateY(-2px)}
.side .cta svg{width:17px;height:17px;stroke-width:2.2}
.profile{margin-top:auto;display:flex;align-items:center;gap:11px;padding:11px;border-radius:14px;background:rgba(255,255,255,.7);border:1px solid var(--line-2)}
.profile .av{width:36px;height:36px;border-radius:10px;background:var(--grad-ink);color:#fff;display:grid;place-items:center;font-weight:800;font-size:14px;flex:none}
.profile .nm{font-size:13px;font-weight:700;line-height:1.2}
.profile .rl{font-size:10.5px;color:var(--ink-mute);font-weight:600}
.profile .dot{margin-inline-start:auto;width:8px;height:8px;border-radius:50%;background:var(--green-mid);box-shadow:0 0 0 3px rgba(47,160,132,.2)}

.main{min-width:0;padding:0 0 50px}
.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:16px;padding:16px 30px;background:rgba(250,250,247,.72);backdrop-filter:blur(16px);border-bottom:1px solid var(--line-2)}
.topbar .ttl h2{font-size:20px;font-weight:800;letter-spacing:-.02em;margin:0}
.topbar .ttl p{font-size:12px;color:var(--ink-mute);font-weight:600;margin:0}
.tb-right{margin-inline-start:auto;display:flex;align-items:center;gap:10px}
.switch{display:flex;align-items:center;gap:2px;padding:4px;border-radius:11px;background:var(--paper);border:1px solid var(--line-2);font-size:12px;font-weight:700}
.switch span{padding:6px 11px;border-radius:8px;color:var(--ink-mute);transition:.18s}
.switch span.on{background:var(--green-fog);color:var(--green-deep)}
.switch.demo span.on{background:linear-gradient(120deg,rgba(212,160,23,.2),rgba(47,160,132,.16));color:var(--gold-deep)}
.icon-btn{width:40px;height:40px;border-radius:11px;background:var(--paper);border:1px solid var(--line-2);display:grid;place-items:center;color:var(--ink-soft);transition:.18s}
.icon-btn:hover{color:var(--green-deep)}
.icon-btn svg{width:18px;height:18px;stroke-width:1.8}

.wrap{padding:28px 30px 0;max-width:1320px}
.kicker{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.08em;color:var(--green-deep);margin-bottom:14px}
.kicker::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--grad-cta)}
.sec{margin-bottom:32px}
.sec-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:16px;gap:16px}
.sec-head h3{font-size:17px;font-weight:800;margin:0}
.sec-head .more{font-size:12.5px;font-weight:700;color:var(--green-mid);display:flex;align-items:center;gap:5px}
.sec-head .more svg{width:14px;height:14px;stroke-width:2}

.card{background:rgba(255,255,255,.82);backdrop-filter:blur(8px);border:1px solid var(--line-2);border-radius:16px;box-shadow:var(--shadow);transition:transform .22s,box-shadow .22s}
.card.hover:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg)}

.greet{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px;flex-wrap:wrap}
.greet h2{font-size:26px;font-weight:800;letter-spacing:-.025em;margin:0}
.greet .wave{display:inline-block;animation:wave 2.4s ease-in-out infinite;transform-origin:70% 70%}
@keyframes wave{0%,60%,100%{transform:rotate(0)}15%{transform:rotate(16deg)}30%{transform:rotate(-8deg)}45%{transform:rotate(12deg)}}
.greet p{font-size:13.5px;color:var(--ink-soft);font-weight:500;margin:5px 0 0;max-width:560px}
.greet .health{display:flex;align-items:center;gap:13px;padding:12px 18px;border-radius:16px;background:rgba(255,255,255,.8);border:1px solid var(--line-2);box-shadow:var(--shadow-sm)}
.greet .health .ring{position:relative;width:48px;height:48px}
.greet .health .ring b{position:absolute;inset:0;display:grid;place-items:center;font-weight:700;font-size:13px;color:var(--green-deep)}
.greet .health .t{font-size:11px;color:var(--ink-mute);font-weight:700}
.greet .health .v{font-size:14px;font-weight:800}

.pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.pillar{padding:22px;position:relative;overflow:hidden}
.pillar .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;margin-bottom:16px;background:linear-gradient(135deg,rgba(212,160,23,.16),rgba(47,160,132,.16));border:1px solid var(--line-3)}
.pillar .ic svg{width:23px;height:23px;stroke-width:1.7;color:var(--green-deep)}
.pillar h4{font-size:16px;font-weight:800;margin:0 0 6px}
.pillar p{font-size:12.7px;color:var(--ink-soft);font-weight:500;line-height:1.6;margin:0 0 16px}
.pillar .metric{display:flex;align-items:baseline;gap:7px}
.pillar .metric b{font-size:21px;font-weight:700;color:var(--green-deep)}
.pillar .metric span{font-size:11.5px;color:var(--ink-mute);font-weight:600}
.pillar .rank{position:absolute;top:18px;inset-inline-end:18px;font-size:12px;font-weight:700;color:var(--green-soft);background:var(--green-fog);width:24px;height:24px;border-radius:8px;display:grid;place-items:center}

.b2b{margin-top:16px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:18px 22px;border-radius:18px;background:linear-gradient(115deg,#175C4F,#1F6F5F 45%,#2FA084 115%);color:#fff;box-shadow:0 22px 50px -24px rgba(31,111,95,.7);position:relative;overflow:hidden}
.b2b::before{content:"";position:absolute;inset-inline-end:-40px;top:-60px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(212,160,23,.34),transparent 65%)}
.b2b .lead{display:flex;align-items:center;gap:13px}
.b2b .lead .bdg{font-size:10px;font-weight:800;letter-spacing:.14em;background:rgba(255,255,255,.16);padding:5px 11px;border-radius:999px}
.b2b .lead h4{font-size:16px;font-weight:800;margin:0}
.b2b .lead p{font-size:12px;opacity:.85;font-weight:500;margin:0}
.b2b .feats{display:flex;gap:10px;margin-inline-start:auto;flex-wrap:wrap;z-index:1}
.b2b .feat{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);padding:9px 14px;border-radius:12px;font-size:12.5px;font-weight:700;border:1px solid rgba(255,255,255,.14)}
.b2b .feat svg{width:15px;height:15px;stroke-width:2;color:var(--gold-soft)}
.b2b .goto{display:flex;align-items:center;gap:7px;background:#fff;color:var(--green-deep);padding:11px 18px;border-radius:12px;font-weight:800;font-size:13px;z-index:1;transition:.2s}
.b2b .goto:hover{transform:translateY(-2px)}
.b2b .goto svg{width:15px;height:15px;stroke-width:2.4}

.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.kpi{padding:17px 17px 13px}
.kpi .top{display:flex;align-items:center;gap:8px;margin-bottom:11px}
.kpi .top .ki{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--green-fog);color:var(--green-deep);flex:none}
.kpi .top .ki svg{width:15px;height:15px;stroke-width:1.9}
.kpi .top .lbl{font-size:11.5px;font-weight:700;color:var(--ink-mute);line-height:1.3}
.kpi .val{font-size:23px;font-weight:700;letter-spacing:-.02em}
.kpi .val small{font-size:12px;font-weight:600;color:var(--ink-mute)}
.kpi .foot{display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:8px;min-height:24px}
.kpi .note{font-size:11px;color:var(--ink-mute);font-weight:600}
.delta{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;font-weight:700;padding:2px 7px;border-radius:999px}
.delta.up{color:#0e7a52;background:rgba(47,160,132,.14)}
.delta.dn{color:#a8531a;background:rgba(212,160,23,.16)}
.spark{width:64px;height:24px;flex:none}

.grid-2{display:grid;grid-template-columns:1.7fr 1fr;gap:16px}
.panel{padding:20px 22px}
.panel .ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;gap:10px}
.panel .ph h4{font-size:15px;font-weight:800;margin:0}
.panel .ph p{font-size:11.5px;color:var(--ink-mute);font-weight:600;margin:2px 0 0}
.legend{display:flex;gap:14px;align-items:center}
.legend i{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--ink-soft);font-style:normal}
.legend i b{width:9px;height:9px;border-radius:3px;display:inline-block}
.bigfig{font-size:26px;font-weight:700;letter-spacing:-.02em}

.donut-wrap{display:flex;align-items:center;gap:18px}
.donut{position:relative;width:150px;height:150px;flex:none}
.donut .ctr{position:absolute;inset:0;display:grid;place-items:center;text-align:center}
.donut .ctr b{font-size:22px;font-weight:700}
.donut .ctr span{font-size:10.5px;color:var(--ink-mute);font-weight:700}
.dleg{display:flex;flex-direction:column;gap:9px;flex:1}
.dleg .row{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:600;color:var(--ink-soft)}
.dleg .row b{width:9px;height:9px;border-radius:3px;flex:none}
.dleg .row .pc{margin-inline-start:auto;font-weight:700;color:var(--ink)}

.mods{display:grid;grid-template-columns:repeat(6,1fr);gap:13px}
.mod{padding:16px;display:flex;flex-direction:column;gap:10px}
.mod .em{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:20px;background:linear-gradient(135deg,var(--cream-2),#fff);border:1px solid var(--line-3)}
.mod .nm{font-size:13px;font-weight:800;letter-spacing:-.01em}
.mod .st{display:flex;align-items:baseline;gap:5px}
.mod .st b{font-size:16px;font-weight:700}
.mod .st span{font-size:10.5px;color:var(--ink-mute);font-weight:600}

.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.opc{padding:19px 20px}
.opc .h{display:flex;align-items:center;gap:11px;margin-bottom:14px}
.opc .h .i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--green-fog);color:var(--green-deep);flex:none}
.opc .h .i svg{width:17px;height:17px;stroke-width:1.8}
.opc .h h4{font-size:14.5px;font-weight:800;margin:0}
.opc .h .live{margin-inline-start:auto;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:var(--green-mid)}
.opc .h .live .d{width:7px;height:7px;border-radius:50%;background:var(--green-mid);box-shadow:0 0 0 3px rgba(47,160,132,.2);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.opc .rowline{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px dashed var(--line-3);font-size:12.5px}
.opc .rowline:last-child{border-bottom:none}
.opc .rowline .k{color:var(--ink-soft);font-weight:600}
.opc .rowline .v{font-weight:700;color:var(--ink)}
.opc .rowline .v.warn{color:var(--gold-deep)}
.minibtn{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--green-deep);background:var(--green-fog);padding:7px 12px;border-radius:9px;margin-top:14px;transition:.18s}
.minibtn:hover{background:rgba(31,111,95,.13)}
.bar{height:7px;border-radius:99px;background:var(--green-fog);overflow:hidden;margin-top:8px}
.bar i{display:block;height:100%;border-radius:99px;background:var(--grad-cta)}

.grid-last{display:grid;grid-template-columns:1.6fr 1fr;gap:16px}
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:start;font-size:10.5px;font-weight:800;color:var(--ink-mute);letter-spacing:.04em;padding:0 10px 12px}
.tbl td{padding:12px 10px;border-top:1px solid var(--line-3);font-size:12.5px;font-weight:600;color:var(--ink-soft)}
.tbl tr:hover td{background:rgba(31,111,95,.03)}
.tbl .who{display:flex;align-items:center;gap:10px;color:var(--ink);font-weight:700}
.tbl .who .ava{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:11px;background:var(--cream-2);border:1px solid var(--line-3);flex:none;color:var(--green-deep)}
.tbl .amt{font-weight:700;color:var(--ink);white-space:nowrap}

.alerts{padding:19px 20px}
.alert{display:flex;gap:12px;padding:13px 0;border-bottom:1px solid var(--line-3)}
.alert:last-child{border-bottom:none;padding-bottom:0}
.alert .ai{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none}
.alert .ai svg{width:16px;height:16px;stroke-width:1.9}
.alert.gold .ai{background:rgba(212,160,23,.16);color:var(--gold-deep)}
.alert.green .ai{background:var(--green-fog);color:var(--green-deep)}
.alert.ink .ai{background:rgba(10,10,10,.06);color:var(--ink)}
.alert .tx h5{font-size:13px;font-weight:800;margin:0 0 2px}
.alert .tx p{font-size:11.5px;color:var(--ink-mute);font-weight:600;line-height:1.5;margin:0}

footer{padding:26px 30px 8px;display:flex;align-items:center;justify-content:space-between;gap:14px;color:var(--ink-mute);font-size:11.5px;font-weight:600;flex-wrap:wrap}
footer .sl{font-weight:800;color:var(--green-deep)}

.reveal{opacity:0;transform:translateY(12px);animation:rise .7s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes rise{to{opacity:1;transform:none}}

@media(max-width:1180px){.kpis{grid-template-columns:repeat(3,1fr)}.mods{grid-template-columns:repeat(4,1fr)}}
@media(max-width:980px){.app{grid-template-columns:1fr}.side{display:none}.grid-2,.grid-last,.grid-3{grid-template-columns:1fr}.pillars{grid-template-columns:1fr}}
@media(max-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}.mods{grid-template-columns:repeat(2,1fr)}.wrap,.topbar{padding-inline:16px}}
`
