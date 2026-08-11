// src/app/admin/marketing-hq/page.tsx
// 🎯 مركز الماركتنج الموحّد — Madmona Marketing HQ
// Rebuilt May 23 2026: LOCKED 5-color palette + live madmona_marketing_dashboard() RPC.
// This is the ONE PLACE for all marketing: agents, content, ads, brand health, links.

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ── Locked brand palette — 5 colors ONLY (no gold/amber/orange/red/blue) ──
const C = {
  green: '#FA8125',
  cream: '#FAFAF7',
  ink: '#1A2E26',
  gray: '#6B7280',
  white: '#FFFFFF',
}
const BORDER = '1px solid rgba(250, 129, 37,0.12)'

type Agent = {
  agent_name: string; team: string; display_name: string; enabled: boolean
  schedule_cron: string | null; run_count: number; success_count: number
  error_count: number; last_run_at: string | null; error_pct: number
}
type Dash = {
  generated_at: string
  agents: Agent[]
  content_by_status: Record<string, number>
  content_recent: { title: string; status: string; type: string; agent: string; created: string }[]
  ads: { total: number; rejected: number; spend_egp: number; impressions: number; clicks: number }
  runs: { total: number; last_7d: number; last_24h: number; errors: number }
  brand_qc: { content_held: number; ads_held: number }
}

async function getDash(): Promise<Dash | null> {
  // @ts-expect-error rpc typing
  const { data } = await supabaseAdmin.rpc('madmona_marketing_dashboard')
  return (data as Dash) ?? null
}

const card: React.CSSProperties = {
  background: C.white, padding: 18, borderRadius: 14, border: BORDER, marginBottom: 16,
}

export default async function MarketingHQ() {
  const d = await getDash()
  const agents = d?.agents ?? []
  const enabled = agents.filter(a => a.enabled).length
  const totalRuns = agents.reduce((s, a) => s + (a.run_count || 0), 0)
  const totalSuccess = agents.reduce((s, a) => s + (a.success_count || 0), 0)
  const successRate = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0
  const cbs = d?.content_by_status ?? {}
  const published = cbs['published'] ?? 0
  const held = d?.brand_qc?.content_held ?? 0
  const adsHeld = d?.brand_qc?.ads_held ?? 0

  const stat = (label: string, val: React.ReactNode, sub?: string, alert?: boolean) => (
    <div style={{ background: alert ? C.green : C.white, color: alert ? C.cream : C.ink,
      padding: 16, borderRadius: 12, border: BORDER, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 'bold', color: alert ? C.cream : C.green }}>{val}</div>
      <div style={{ fontSize: 11, marginTop: 4, fontWeight: 'bold', color: alert ? C.cream : C.gray }}>{label}</div>
      {sub && <div style={{ fontSize: 10, marginTop: 2, color: alert ? C.cream : C.gray }}>{sub}</div>}
    </div>
  )

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma, Arial, sans-serif', background: C.cream, minHeight: '100vh', padding: '24px 20px', color: C.ink }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ color: C.green, margin: 0, fontSize: 30, fontWeight: 'bold' }}>🎯 مركز الماركتنج — مضمونة</h1>
          <p style={{ color: C.gray, marginTop: 8, fontSize: 14 }}>
            {enabled}/{agents.length} وكيل ماركتنج بيشتغلوا · احنا بتوع الإيجار · منصّة تأجير عامة
          </p>
        </header>

        {/* Brand health banner */}
        {(held > 0 || adsHeld > 0) && (
          <div style={{ ...card, background: C.green, color: C.cream, border: 'none' }}>
            <div style={{ fontSize: 15, fontWeight: 'bold' }}>🛡️ حارس الهوية شغّال</div>
            <div style={{ fontSize: 13, marginTop: 6, opacity: 0.95 }}>
              متحجوز <b>{held}</b> محتوى + <b>{adsHeld}</b> إعلان بألوان برّه الـ5 المقفولة (status: rejected) — محتاجين إعادة توليد on-brand قبل النشر.
            </div>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {stat('وكلاء شغّالين', `${enabled}/${agents.length}`)}
          {stat('نجاح المهام', `${successRate}%`, `${totalSuccess}/${totalRuns}`)}
          {stat('محتوى منشور', published)}
          {stat('🛡️ محتوى محجوز', held, 'off-brand', held > 0)}
          {stat('🎨 إعلانات', d?.ads?.total ?? 0, `صرف: ${d?.ads?.spend_egp ?? 0} ج`)}
          {stat('تشغيل (7 أيام)', d?.runs?.last_7d ?? 0, `أخطاء: ${d?.runs?.errors ?? 0}`)}
        </div>

        {/* Ads not running warning */}
        {(d?.ads?.total ?? 0) > 0 && (d?.ads?.spend_egp ?? 0) === 0 && (
          <div style={{ ...card, borderRight: `4px solid ${C.green}` }}>
            <b style={{ color: C.green }}>⚠️ الإعلانات بتتصمّم بس مش بتشتغل:</b>
            <span style={{ color: C.gray, fontSize: 13 }}> {d?.ads?.total} إعلان متصمّم · 0 صرف · 0 ظهور · 0 كليك. محتاج ربط حملة Meta حقيقية بميزانية.</span>
          </div>
        )}

        {/* Agents roster */}
        <h2 style={{ color: C.green, margin: '24px 0 12px', fontSize: 18 }}>🤖 وكلاء الماركتنج ({agents.length})</h2>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.cream, color: C.gray, textAlign: 'right' }}>
                <th style={{ padding: '10px 14px' }}>الوكيل</th>
                <th style={{ padding: '10px 14px' }}>الفريق</th>
                <th style={{ padding: '10px 14px' }}>الحالة</th>
                <th style={{ padding: '10px 14px' }}>تشغيل</th>
                <th style={{ padding: '10px 14px' }}>أخطاء</th>
                <th style={{ padding: '10px 14px' }}>آخر تشغيل</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agent_name} style={{ borderTop: BORDER }}>
                  <td style={{ padding: '10px 14px', fontWeight: 'bold', color: C.ink }}>{a.display_name || a.agent_name}</td>
                  <td style={{ padding: '10px 14px', color: C.gray }}>{a.team}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: a.enabled ? C.green : C.gray, fontWeight: 'bold' }}>
                      {a.enabled ? '🟢 شغّال' : '⚫ متوقف'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: C.gray }}>{a.run_count ?? 0}</td>
                  <td style={{ padding: '10px 14px', color: a.error_pct >= 25 ? C.green : C.gray, fontWeight: a.error_pct >= 25 ? 'bold' : 'normal' }}>
                    {a.error_pct}%{a.error_pct >= 25 ? ' ⚠️' : ''}
                  </td>
                  <td style={{ padding: '10px 14px', color: C.gray }}>{a.last_run_at ? new Date(a.last_run_at).toLocaleDateString('ar-EG') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Content by status */}
        <h2 style={{ color: C.green, margin: '24px 0 12px', fontSize: 18 }}>📅 المحتوى حسب الحالة</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
          {Object.entries(cbs).map(([k, v]) => (
            <div key={k} style={{ background: C.white, padding: 12, borderRadius: 10, border: BORDER, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: C.green }}>{v}</div>
              <div style={{ fontSize: 11, color: C.gray }}>{k}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <h2 style={{ color: C.green, margin: '24px 0 12px', fontSize: 18 }}>🔗 روابط سريعة</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { href: '/admin/ai-os', icon: '🤖', title: 'AI OS — كل الوكلاء' },
            { href: '/admin/ad-creatives', icon: '🎨', title: 'Ad Creatives' },
            { href: '/admin/agents', icon: '⚡', title: 'نشاط الوكلاء' },
            { href: '/admin/social-packs', icon: '📦', title: 'Social Packs' },
            { href: '/admin/qc-reports', icon: '🛡️', title: 'تقارير QC' },
            { href: '/admin/insights', icon: '💡', title: 'AI Insights' },
            { href: '/admin/leads-feed', icon: '🎯', title: 'Leads Feed' },
            { href: '/admin/reels', icon: '🎬', title: 'Reels' },
          ].map((l) => (
            <a key={l.href} href={l.href} style={{ background: C.white, padding: 16, borderRadius: 12, border: BORDER, textDecoration: 'none', color: C.ink, display: 'block' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{l.icon}</div>
              <div style={{ fontWeight: 'bold', color: C.green, fontSize: 14 }}>{l.title}</div>
            </a>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 36, color: C.gray, fontSize: 12 }}>
          مضمونة · مركز الماركتنج · باليت مقفول (5 ألوان) · {d ? new Date(d.generated_at).toLocaleString('ar-EG') : ''}
        </div>
      </div>
    </div>
  )
}
