// src/app/admin/cockpit/page.tsx
// =====================================================================
// مضمونة — كوكبيت المالك (Owner Cockpit)
// لوحة واحدة منظّمة: أرقام حيّة + روابط مجمّعة حسب الوظيفة.
// الهدف: المالك ميتوهش وسط عشرات صفحات الأدمن — كل اللي بيستخدمه في مكان واحد.
// Server component — يقرأ مباشرة من Supabase (service role) زي qc-reports.
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
  ccPending: number
  ccApproved: number
  ccScheduled: number
  ccPublished: number
  ccNoPublisher: number
  ccPubToday: number
  waPending: number
  agentsOn: number
  agentsTotal: number
}

async function loadCounts(): Promise<Counts> {
  const c: Counts = {
    pendingApprovals: 0, ccPending: 0, ccApproved: 0, ccScheduled: 0,
    ccPublished: 0, ccNoPublisher: 0, ccPubToday: 0, waPending: 0,
    agentsOn: 0, agentsTotal: 0,
  }

  try {
    const { count } = await supabaseAdmin
      .from('v_pending_approvals' as never)
      .select('*', { count: 'exact', head: true })
    c.pendingApprovals = count ?? 0
  } catch { /* view may be empty */ }

  try {
    const { data } = await supabaseAdmin.from('content_calendar').select('status, published_at')
    const rows = (data ?? []) as Array<{ status: string | null; published_at: string | null }>
    const today = new Date().toISOString().slice(0, 10)
    for (const r of rows) {
      if (r.status === 'pending_review') c.ccPending++
      else if (r.status === 'approved') c.ccApproved++
      else if (r.status === 'scheduled') c.ccScheduled++
      else if (r.status === 'published') {
        c.ccPublished++
        if ((r.published_at ?? '').slice(0, 10) === today) c.ccPubToday++
      } else if (r.status === 'no_publisher') c.ccNoPublisher++
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

// ---- link groups (edit this array to add/remove routes) ----
const GROUPS: Array<{
  title: string
  icon: string
  links: Array<{ href: string; label: string; desc: string; badgeKey?: keyof Counts; badgeTone?: 'gold' | 'green' | 'gray' }>
}> = [
  {
    title: 'المراجعة والجودة',
    icon: '✅',
    links: [
      { href: '/admin/approvals', label: 'موافقات المالك', desc: 'المحتوى عالي الخطورة (أوتوماتيك دلوقتي عبر المُعتمِد)', badgeKey: 'pendingApprovals', badgeTone: 'gold' },
      { href: '/admin/qc-reports', label: 'تقارير الجودة', desc: 'فحص الـ QC للإعلانات الجديدة' },
    ],
  },
  {
    title: 'التسويق والمحتوى',
    icon: '📣',
    links: [
      { href: '/admin/marketing-hq', label: 'مركز التسويق', desc: 'الحملات والمحتوى والجدولة' },
    ],
  },
  {
    title: 'واتساب والعملاء',
    icon: '💬',
    links: [
      { href: '/admin/wa-review', label: 'مراجعة ردود الواتساب', desc: 'ردود AI لـ leads بتستنى مراجعتك قبل الإرسال', badgeKey: 'waPending', badgeTone: 'gold' },
    ],
  },
  {
    title: 'الذكاء الاصطناعي والوكلاء',
    icon: '🤖',
    links: [
      { href: '/admin/ai-os', label: 'نظام التشغيل (AI OS)', desc: 'الوكلاء، الصحة، التنبيهات' },
      { href: '/admin/insights', label: 'الرؤى', desc: 'تحليلات وتوصيات النظام' },
    ],
  },
]

const QUICK: Array<{ href: string; label: string; external?: boolean }> = [
  { href: 'https://madmonacairo.com', label: '🌐 الموقع', external: true },
  { href: '/add-listing', label: '➕ ضيف منتج' },
]

function Kpi({ value, label, tone, hint }: { value: number | string; label: string; tone: 'green' | 'gold' | 'gray' | 'ok'; hint?: string }) {
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
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: `linear-gradient(100deg, ${C.gold} 0%, ${C.greenMid} 45%, ${C.green} 100%)`,
          borderRadius: 20, padding: '22px 26px', color: C.white, marginBottom: 20,
          boxShadow: '0 10px 30px rgba(31,111,95,0.18)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>لوحة التحكم — مضمونة</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.92 }}>كل اللي بتحتاجه في مكان واحد. احنا بتوع الإيجار.</p>
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
          <a href="/admin/approvals" style={{ color: C.green, fontWeight: 800, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {ownerClear ? 'مفيش حاجة مستنياك ✓' : `${c.pendingApprovals} مستنيك ←`}
          </a>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
          <Kpi value={c.pendingApprovals} label="مستني موافقتك" tone={c.pendingApprovals ? 'gold' : 'green'} hint={c.pendingApprovals ? 'محتاج قرارك' : 'كله تمام'} />
          <Kpi value={c.waPending} label="واتساب مستني رد" tone={c.waPending ? 'gold' : 'green'} hint="ردود AI للمراجعة" />
          <Kpi value={c.ccPublished} label="بوستات اتنشرت" tone="green" hint={`النهاردة: ${c.ccPubToday}`} />
          <Kpi value={c.ccScheduled + c.ccApproved} label="في الطريق للنشر" tone="gray" hint={`مجدول ${c.ccScheduled} · موافَق ${c.ccApproved}`} />
          <Kpi value={`${c.agentsOn}/${c.agentsTotal}`} label="وكلاء شغّالين" tone="green" />
        </div>

        {/* Groups */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {GROUPS.map(g => (
            <div key={g.title} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{g.icon}</span>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: C.green }}>{g.title}</h2>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {g.links.map(l => {
                  const badge = l.badgeKey ? (c[l.badgeKey] as number) : null
                  const showBadge = badge !== null && badge > 0
                  return (
                    <a key={l.href} href={l.href}
                      style={{
                        display: 'block', textDecoration: 'none', background: C.cream,
                        border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px',
                        transition: 'all .15s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: C.ink, fontSize: 14.5 }}>{l.label}</span>
                        {showBadge && (
                          <span style={{ background: l.badgeTone === 'gold' ? C.gold : C.green, color: C.white, fontSize: 12, fontWeight: 900, padding: '2px 9px', borderRadius: 999 }}>
                            {badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.gray, marginTop: 3, lineHeight: 1.5 }}>{l.desc}</div>
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: C.gray, fontSize: 12, marginTop: 24, lineHeight: 1.7 }}>
          دي أهم الصفحات اللي بتستخدمها يوميًا، مجمّعة حسب الوظيفة. <br />
          عايز تضيف صفحة تانية للوحة؟ عدّل مصفوفة <code style={{ background: '#eee', padding: '1px 5px', borderRadius: 4 }}>GROUPS</code> في أول الملف.
        </p>
      </div>
    </div>
  )
}
