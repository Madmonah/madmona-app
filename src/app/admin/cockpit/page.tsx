// src/app/admin/cockpit/page.tsx
// =====================================================================
// مضمونة — كوكبيت المالك (Owner Cockpit)
// لوحة واحدة منظّمة: أرقام حيّة + كل صفحات الأدمن (67) مجمّعة حسب الوظيفة.
// الهدف: المالك ميتوهش — أهم الصفحات فوق كبيرة، والباقي مرتّب تحتها.
// Server component — يقرأ مباشرة من Supabase (service role) زي qc-reports.
// لإضافة/حذف صفحة: عدّل مصفوفة STAR (الأهم) أو GROUPS (الخريطة الكاملة).
// =====================================================================

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ---- brand ----
const C = {
  green: '#1F6F5F',
  greenMid: '#2FA084',
  greenSoft: '#6FCF97',
  gold: '#d4a017',
  cream: '#FAFAF7',
  ink: '#0A0A0A',
  gray: '#6B7280',
  line: '#e8e6df',
  white: '#FFFFFF',
}

type Counts = {
  pendingApprovals: number
  ccApproved: number
  ccScheduled: number
  ccPublished: number
  ccPubToday: number
  waPending: number
  agentsOn: number
  agentsTotal: number
}

async function loadCounts(): Promise<Counts> {
  const c: Counts = {
    pendingApprovals: 0, ccApproved: 0, ccScheduled: 0,
    ccPublished: 0, ccPubToday: 0, waPending: 0,
    agentsOn: 0, agentsTotal: 0,
  }

  try {
    const { count } = await supabaseAdmin
      .from('v_pending_approvals' as never)
      .select('*', { count: 'exact', head: true })
    c.pendingApprovals = count ?? 0
  } catch { /* view guard */ }

  try {
    const { data } = await supabaseAdmin.from('content_calendar').select('status, published_at')
    const rows = (data ?? []) as Array<{ status: string | null; published_at: string | null }>
    const today = new Date().toISOString().slice(0, 10)
    for (const r of rows) {
      if (r.status === 'approved') c.ccApproved++
      else if (r.status === 'scheduled') c.ccScheduled++
      else if (r.status === 'published') {
        c.ccPublished++
        if ((r.published_at ?? '').slice(0, 10) === today) c.ccPubToday++
      }
    }
  } catch { /* table guard */ }

  try {
    const { count } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review')
    c.waPending = count ?? 0
  } catch { /* table guard */ }

  try {
    const { data } = await supabaseAdmin.from('agent_registry').select('enabled')
    const rows = (data ?? []) as Array<{ enabled: boolean | null }>
    c.agentsTotal = rows.length
    c.agentsOn = rows.filter(r => r.enabled).length
  } catch { /* table guard */ }

  return c
}

// ---- أهم الصفحات (اللي بتستخدمها يوميًا) ----
const STAR: Array<{ href: string; emoji: string; label: string; desc: string; badgeKey?: keyof Counts }> = [
  { href: '/admin/marketing-hq', emoji: '📣', label: 'مركز التسويق', desc: 'الحملات والمحتوى والجدولة' },
  { href: '/admin/wa-review', emoji: '💬', label: 'مراجعة واتساب', desc: 'ردود AI للعملاء قبل الإرسال', badgeKey: 'waPending' },
  { href: '/admin/leads', emoji: '🎯', label: 'الليدز', desc: 'العملاء والموردين المحتملين' },
  { href: '/admin/suppliers', emoji: '🏷️', label: 'الموردين', desc: 'كل الموردين على المنصة' },
  { href: '/admin/listings', emoji: '📦', label: 'الليستنجس', desc: 'كل المعروضات للإيجار' },
  { href: '/admin/payouts', emoji: '💰', label: 'المدفوعات', desc: 'الفلوس والتحويلات' },
  { href: '/admin/qc-reports', emoji: '✅', label: 'الجودة', desc: 'فحص المحتوى والإعلانات' },
  { href: '/admin/ai-os', emoji: '🤖', label: 'نظام التشغيل', desc: 'الوكلاء والصحة والتنبيهات' },
]

// ---- الخريطة الكاملة (كل الـ67 صفحة) ----
const GROUPS: Array<{ title: string; icon: string; links: Array<[string, string]> }> = [
  {
    title: 'التسويق والمحتوى', icon: '📣', links: [
      ['/admin/marketing-hq', 'مركز التسويق'], ['/admin/ad-builder', 'منشئ الإعلانات'],
      ['/admin/ad-creatives', 'كرياتيف الإعلانات'], ['/admin/social-packs', 'باقات السوشيال'],
      ['/admin/social-groups', 'المجموعات'], ['/admin/reels', 'الريلز'],
      ['/admin/supplier-posts', 'بوستات الموردين'], ['/admin/news', 'الأخبار'],
      ['/admin/daily-messages', 'الرسائل اليومية'], ['/admin/welcome-messages', 'رسائل الترحيب'],
      ['/admin/email-templates', 'قوالب الإيميل'], ['/admin/email-queue', 'طابور الإيميل'],
    ],
  },
  {
    title: 'واتساب · عملاء · ليدز', icon: '💬', links: [
      ['/admin/wa-review', 'مراجعة واتساب'], ['/admin/leads', 'الليدز'],
      ['/admin/leads-feed', 'موجز الليدز'], ['/admin/messages', 'الرسائل'],
      ['/admin/notifications', 'الإشعارات'], ['/admin/funnel', 'المسار (Funnel)'],
    ],
  },
  {
    title: 'الموردين · الليستنجس · الحجوزات', icon: '🏷️', links: [
      ['/admin/suppliers', 'الموردين'], ['/admin/suppliers-v2', 'الموردين v2'],
      ['/admin/marketplace-suppliers', 'موردي السوق'], ['/admin/business-partners', 'شركاء الأعمال'],
      ['/admin/partnerships', 'الشراكات'], ['/admin/collaborations', 'التعاونات'],
      ['/admin/listings', 'الليستنجس'], ['/admin/listing-drafts', 'مسودّات الليستنج'],
      ['/admin/listing-performance', 'أداء الليستنج'], ['/admin/units', 'الوحدات'],
      ['/admin/categories', 'التصنيفات'], ['/admin/bookings', 'الحجوزات'],
      ['/admin/marketplace-bookings', 'حجوزات السوق'],
    ],
  },
  {
    title: 'الفلوس', icon: '💰', links: [
      ['/admin/payouts', 'المدفوعات'], ['/admin/business-finance', 'ماليات الأعمال'],
      ['/admin/sponsorships', 'الرعايات'],
    ],
  },
  {
    title: 'المراجعة والجودة', icon: '✅', links: [
      ['/admin/qc-reports', 'تقارير الجودة'], ['/admin/ad-review', 'مراجعة الإعلانات'],
      ['/admin/policy-rules', 'قواعد السياسة'], ['/admin/fraud-alerts', 'تنبيهات الاحتيال'],
    ],
  },
  {
    title: 'الذكاء الاصطناعي · الوكلاء', icon: '🤖', links: [
      ['/admin/ai-os', 'نظام التشغيل AI'], ['/admin/agents', 'الوكلاء'],
      ['/admin/agent-health', 'صحة الوكلاء'], ['/admin/agent-network', 'شبكة الوكلاء'],
      ['/admin/agent-runs', 'تشغيلات الوكلاء'], ['/admin/capabilities', 'القدرات'],
      ['/admin/prompt-versions', 'نسخ البرومبت'], ['/admin/pipelines', 'خطوط المعالجة'],
      ['/admin/workflows', 'سير العمل'], ['/admin/ai-assistant', 'المساعد الذكي'],
      ['/admin/command-center', 'غرفة القيادة'],
    ],
  },
  {
    title: 'التحليلات · القيادة', icon: '📊', links: [
      ['/admin/dashboard', 'الداشبورد'], ['/admin/hq', 'المقر'],
      ['/admin/ceo-briefs', 'ملخصات الإدارة'], ['/admin/strategy', 'الاستراتيجية'],
      ['/admin/insights', 'الرؤى'], ['/admin/performance', 'الأداء'],
      ['/admin/activity', 'النشاط'], ['/admin/alerts', 'التنبيهات'],
      ['/admin/demand-forecast', 'توقّع الطلب'],
    ],
  },
  {
    title: 'التشغيل · الإعدادات', icon: '⚙️', links: [
      ['/admin/runbook', 'دليل التشغيل'], ['/admin/site-settings', 'إعدادات الموقع'],
      ['/admin/refresh-fb-token', 'تحديث توكن فيسبوك'], ['/admin/madmona', 'صفحة مضمونة'],
    ],
  },
]

const QUICK: Array<{ href: string; label: string; external?: boolean }> = [
  { href: 'https://madmonacairo.com', label: '🌐 الموقع', external: true },
  { href: '/add-listing', label: '➕ ضيف ليستنج' },
]

function Kpi({ value, label, tone, hint }: { value: number | string; label: string; tone: 'green' | 'gold' | 'gray'; hint?: string }) {
  const color = tone === 'gold' ? C.gold : tone === 'gray' ? C.gray : C.green
  return (
    <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', flex: '1 1 150px', minWidth: 150 }}>
      <div style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{hint}</div>}
    </div>
  )
}

export default async function CockpitPage() {
  const c = await loadCounts()
  const ownerClear = c.pendingApprovals === 0

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, Tahoma, sans-serif', background: C.cream, minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: `linear-gradient(100deg, ${C.gold} 0%, ${C.greenMid} 45%, ${C.green} 100%)`,
          borderRadius: 20, padding: '22px 26px', color: C.white, marginBottom: 20,
          boxShadow: '0 10px 30px rgba(31,111,95,0.18)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>لوحة التحكم — مضمونة</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.92 }}>كل صفحات الإدارة في مكان واحد. احنا بتوع الإيجار.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUICK.map(q => (
                <a key={q.href} href={q.href} {...(q.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  style={{ background: 'rgba(255,255,255,0.18)', color: C.white, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 800, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.35)' }}>
                  {q.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Automation status */}
        <div style={{
          background: ownerClear ? '#eef7f2' : '#fff8e6',
          border: `1px solid ${ownerClear ? '#cfe8dd' : '#f3e2b3'}`,
          borderRadius: 16, padding: '14px 18px', marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 22 }}>{ownerClear ? '🟢' : '🟡'}</span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 900, color: C.green, fontSize: 15 }}>
              «المُعتمِد» شغّال — انت بره لوب الموافقة
            </div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2 }}>
              النظام بيراجع المحتوى عالي الخطورة، يصلّح السليم وينشره، ويرجّع اللي فيه مشكلة للموظف المختص أوتوماتيك. كل 10 دقايق.
            </div>
          </div>
          <a href="/admin/qc-reports" style={{ color: C.green, fontWeight: 800, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {ownerClear ? 'مفيش حاجة مستنياك ✓' : `${c.pendingApprovals} مستنيك ←`}
          </a>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <Kpi value={c.pendingApprovals} label="مستني موافقتك" tone={c.pendingApprovals ? 'gold' : 'green'} hint={c.pendingApprovals ? 'محتاج قرارك' : 'كله تمام'} />
          <Kpi value={c.waPending} label="واتساب مستني رد" tone={c.waPending ? 'gold' : 'green'} hint="ردود AI للمراجعة" />
          <Kpi value={c.ccPublished} label="بوستات اتنشرت" tone="green" hint={`النهاردة: ${c.ccPubToday}`} />
          <Kpi value={c.ccScheduled + c.ccApproved} label="في الطريق للنشر" tone="gray" hint={`مجدول ${c.ccScheduled} · موافَق ${c.ccApproved}`} />
          <Kpi value={`${c.agentsOn}/${c.agentsTotal}`} label="وكلاء شغّالين" tone="green" />
        </div>

        {/* أهم الصفحات */}
        <h2 style={{ fontSize: 18, fontWeight: 900, color: C.green, margin: '0 0 12px' }}>⭐ أهم الصفحات</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 30 }}>
          {STAR.map(s => {
            const badge = s.badgeKey ? (c[s.badgeKey] as number) : 0
            return (
              <a key={s.href} href={s.href}
                style={{
                  display: 'block', textDecoration: 'none', background: C.white,
                  border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 26 }}>{s.emoji}</span>
                  {badge > 0 && (
                    <span style={{ background: C.gold, color: C.white, fontSize: 12, fontWeight: 900, padding: '2px 9px', borderRadius: 999 }}>{badge}</span>
                  )}
                </div>
                <div style={{ fontWeight: 900, color: C.ink, fontSize: 16, marginTop: 8 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: C.gray, marginTop: 3, lineHeight: 1.5 }}>{s.desc}</div>
              </a>
            )
          })}
        </div>

        {/* الخريطة الكاملة */}
        <h2 style={{ fontSize: 18, fontWeight: 900, color: C.green, margin: '0 0 12px' }}>🗺️ كل الصفحات</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {GROUPS.map(g => (
            <div key={g.title} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>{g.icon}</span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: C.green }}>{g.title}</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {g.links.map(([href, label]) => (
                  <a key={href} href={href}
                    style={{
                      textDecoration: 'none', background: C.cream, color: C.ink,
                      border: `1px solid ${C.line}`, borderRadius: 999, padding: '6px 12px',
                      fontSize: 13, fontWeight: 700,
                    }}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: C.gray, fontSize: 12, marginTop: 28, lineHeight: 1.7 }}>
          أهم ٨ صفحات فوق، وكل الـ٦٧ صفحة متجمّعة تحت حسب الوظيفة. <br />
          عايز تعدّل اللوحة؟ غيّر مصفوفة <code style={{ background: '#eee', padding: '1px 5px', borderRadius: 4 }}>STAR</code> أو <code style={{ background: '#eee', padding: '1px 5px', borderRadius: 4 }}>GROUPS</code> في أول الملف.
        </p>
      </div>
    </div>
  )
}
