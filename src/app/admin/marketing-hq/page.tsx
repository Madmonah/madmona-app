// src/app/admin/marketing-hq/page.tsx
// Marketing HQ — central command center for all AI marketing tools

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOverview() {
  const today = new Date(); today.setHours(0,0,0,0)
  const todayIso = today.toISOString()

  const [agentsRes, leadsRes, kpiRes, eventsRes, insightsRes] = await Promise.all([
    supabaseAdmin.from('agent_registry').select('*'),
    supabaseAdmin.from('sales_leads').select('lead_score, created_at'),
    supabaseAdmin.rpc('compute_daily_kpis'),
    supabaseAdmin.from('site_events').select('event_type, created_at').gte('created_at', todayIso),
    supabaseAdmin.from('agent_insights').select('priority, status').eq('status', 'new'),
  ])

  type A = { enabled: boolean; team: string; success_count: number; run_count: number }
  const agents = (agentsRes.data ?? []) as A[]
  const enabledCount = agents.filter(a => a.enabled).length
  const totalRuns = agents.reduce((s, a) => s + a.run_count, 0)
  const totalSuccess = agents.reduce((s, a) => s + a.success_count, 0)

  type L = { lead_score: number; created_at: string }
  const leads = (leadsRes.data ?? []) as L[]
  const todayLeads = leads.filter(l => l.created_at >= todayIso).length
  const highPriority = leads.filter(l => l.lead_score >= 70).length

  type E = { event_type: string }
  const events = (eventsRes.data ?? []) as E[]
  const pageViewsToday = events.filter(e => e.event_type === 'page_view').length

  type I = { priority: string }
  const insights = (insightsRes.data ?? []) as I[]
  const newInsights = insights.length

  return {
    enabledAgents: enabledCount,
    totalAgents: agents.length,
    totalRuns,
    totalSuccess,
    successRate: totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0,
    totalLeads: leads.length,
    todayLeads,
    highPriority,
    pageViewsToday,
    newInsights,
    kpis: kpiRes.data as Record<string, unknown> | null,
  }
}

export default async function MarketingHQ() {
  const overview = await getOverview()
  const k = overview.kpis ?? {}

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0',
      minHeight: '100vh',
      padding: '24px 20px',
      color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ color: '#1F5F3F', margin: 0, fontSize: 32, fontWeight: 'bold' }}>
            🎯 Madmona Marketing HQ
          </h1>
          <p style={{ color: '#666', marginTop: 8, fontSize: 14 }}>
            مركز قيادة فريق الـ AI · احنا بتوع الإيجار 🤝
          </p>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 32,
        }}>
          {[
            { label: 'AI Agents شغّالين', val: `${overview.enabledAgents}/${overview.totalAgents}`, color: '#1F5F3F' },
            { label: 'نجاح المهام', val: `${overview.successRate}%`, sub: `${overview.totalSuccess}/${overview.totalRuns}`, color: '#1F5F3F' },
            { label: 'Leads النهارده', val: overview.todayLeads, sub: `إجمالي: ${overview.totalLeads}`, color: '#B8860B' },
            { label: '🔥 عالي النية', val: overview.highPriority, color: '#C2410C' },
            { label: 'زوار النهارده', val: overview.pageViewsToday, color: '#666' },
            { label: 'Insights جديدة', val: overview.newInsights, color: '#B8860B' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff',
              padding: 18,
              borderRadius: 12,
              border: '1px solid #eee',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4, fontWeight: 'bold' }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {Object.keys(k).length > 0 && (
          <div style={cardStyle}>
            <h2 style={{ color: '#1F5F3F', margin: '0 0 16px', fontSize: 18 }}>📊 KPIs النهارده</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 8,
            }}>
              {[
                { label: 'تسجيلات', val: k.total_signups },
                { label: 'مؤجرين جداد', val: k.new_suppliers },
                { label: 'إعلانات جديدة', val: k.new_listings },
                { label: 'حجوزات', val: k.new_bookings },
                { label: 'WhatsApp', val: k.whatsapp_messages_sent },
                { label: 'ايميلات', val: k.emails_sent },
              ].map((kpi) => (
                <div key={kpi.label} style={{
                  padding: 12,
                  background: '#FAF7F0',
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1F5F3F' }}>
                    {String(kpi.val ?? 0)}
                  </div>
                  <div style={{ fontSize: 11, color: '#666' }}>{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 style={{ color: '#1F5F3F', margin: '32px 0 16px', fontSize: 20 }}>🔧 Tools</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}>
          {[
            { href: '/admin/agents', icon: '🤖', title: 'Agents Dashboard', desc: 'كل الـ 20 agent وحالة كل واحد' },
            { href: '/admin/leads-feed', icon: '🎯', title: 'Leads Feed', desc: 'كل الـ leads جاية لايف' },
            { href: '/admin/funnel', icon: '📊', title: 'Conversion Funnel', desc: 'من ad → lead → booking' },
            { href: '/admin/ad-builder', icon: '📣', title: 'Ad Builder', desc: 'اعمل لينك جاهز لـ Meta ads' },
            { href: '/admin/activity', icon: '⚡', title: 'Live Activity', desc: 'كل النشاط في آخر 24 ساعة' },
            { href: '/ad-landing', icon: '🌐', title: 'Landing Page', desc: 'الـ ad page العام (preview)' },
          ].map((link) => (
            <a key={link.href} href={link.href} style={{
              background: '#fff',
              padding: 18,
              borderRadius: 12,
              border: '1px solid #eee',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{link.icon}</div>
              <div style={{ fontWeight: 'bold', color: '#1F5F3F', fontSize: 15, marginBottom: 4 }}>
                {link.title}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>{link.desc}</div>
            </a>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, color: '#999', fontSize: 12 }}>
          مضمونة Marketing HQ · مدعوم بـ Claude AI 🤝
        </div>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  padding: 20,
  borderRadius: 12,
  border: '1px solid #eee',
  marginBottom: 16,
}
