// src/app/admin/marketing-hq/page.tsx
// Marketing HQ — central command center

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOverview() {
  const today = new Date(); today.setHours(0,0,0,0)
  const todayIso = today.toISOString()

  const [agentsRes, leadsRes, kpiRes, eventsRes, insightsRes, adsRes, briefsRes, playsRes] = await Promise.all([
    supabaseAdmin.from('agent_registry').select('*'),
    supabaseAdmin.from('sales_leads').select('lead_score, created_at'),
    supabaseAdmin.rpc('compute_daily_kpis'),
    supabaseAdmin.from('site_events').select('event_type, created_at').gte('created_at', todayIso),
    supabaseAdmin.from('agent_insights').select('priority, status').eq('status', 'new'),
    supabaseAdmin.from('ad_creatives').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('ceo_briefs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('strategy_plays').select('*', { count: 'exact', head: true }).eq('status', 'proposed'),
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
  const highInsights = insights.filter(i => i.priority === 'high').length

  return {
    enabledAgents: enabledCount,
    totalAgents: agents.length,
    successRate: totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0,
    totalRuns, totalSuccess,
    totalLeads: leads.length, todayLeads, highPriority,
    pageViewsToday,
    newInsights, highInsights,
    adsCount: adsRes.count ?? 0,
    briefsCount: briefsRes.count ?? 0,
    playsCount: playsRes.count ?? 0,
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
          <h1 style={{ color: '#1F6F5F', margin: 0, fontSize: 32, fontWeight: 'bold' }}>
            🎯 Madmona Command Center
          </h1>
          <p style={{ color: '#666', marginTop: 8, fontSize: 14 }}>
            {overview.enabledAgents}/{overview.totalAgents} AI agent بيشتغلوا 24/7 · احنا بتوع الإيجار 🤝
          </p>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 32,
        }}>
          {[
            { label: 'AI Agents', val: `${overview.enabledAgents}/${overview.totalAgents}`, color: '#1F6F5F' },
            { label: 'نجاح المهام', val: `${overview.successRate}%`, sub: `${overview.totalSuccess}/${overview.totalRuns}`, color: '#1F6F5F' },
            { label: 'Leads النهارده', val: overview.todayLeads, sub: `إجمالي: ${overview.totalLeads}`, color: '#2FA084' },
            { label: '🔥 عالي النية', val: overview.highPriority, color: '#6FCF97' },
            { label: '🎨 Ad Creatives', val: overview.adsCount, color: '#1F6F5F' },
            { label: '🌅 CEO Briefs', val: overview.briefsCount, color: '#2FA084' },
            { label: '🧠 Strategy Plays', val: overview.playsCount, color: '#2c3e50' },
            { label: '💡 Insights', val: overview.newInsights, sub: overview.highInsights > 0 ? `🔥 ${overview.highInsights}` : undefined, color: '#2FA084' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff', padding: 16, borderRadius: 12,
              border: '1px solid #eee', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4, fontWeight: 'bold' }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {Object.keys(k).length > 0 && (
          <div style={cardStyle}>
            <h2 style={{ color: '#1F6F5F', margin: '0 0 16px', fontSize: 18 }}>📊 KPIs النهارده</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
              {[
                { label: 'تسجيلات', val: k.total_signups },
                { label: 'مؤجرين جداد', val: k.new_suppliers },
                { label: 'إعلانات جديدة', val: k.new_listings },
                { label: 'حجوزات', val: k.new_bookings },
                { label: 'WhatsApp', val: k.whatsapp_messages_sent },
                { label: 'ايميلات', val: k.emails_sent },
              ].map((kpi) => (
                <div key={kpi.label} style={{ padding: 12, background: '#FAF7F0', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1F6F5F' }}>{String(kpi.val ?? 0)}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 style={{ color: '#1F6F5F', margin: '32px 0 16px', fontSize: 20 }}>🤖 AI Operating System</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
        }}>
          {[
            { href: '/admin/ai-os', icon: '🤖', title: 'AI OS Dashboard', desc: 'كل الـ 27 agent منظمين بفرق', highlight: true },
            { href: '/admin/ad-creatives', icon: '🎨', title: 'Ad Creatives', desc: 'إعلانات Meta جاهزة', badge: overview.adsCount },
            { href: '/admin/ceo-briefs', icon: '🌅', title: 'CEO Briefs', desc: 'تقارير صباحية يومية', badge: overview.briefsCount },
            { href: '/admin/strategy', icon: '🧠', title: 'Strategy Plays', desc: 'خطط نمو استراتيجية', badge: overview.playsCount },
          ].map((link) => (
            <a key={link.href} href={link.href} style={{
              background: link.highlight ? '#1F6F5F' : '#fff',
              color: link.highlight ? '#FAF7F0' : 'inherit',
              padding: 18, borderRadius: 12,
              border: link.highlight ? 'none' : '1px solid #eee',
              textDecoration: 'none', display: 'block', position: 'relative',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{link.icon}</div>
              <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4, color: link.highlight ? '#FAF7F0' : '#1F6F5F' }}>
                {link.title}
              </div>
              <div style={{ fontSize: 12, opacity: link.highlight ? 0.9 : 1, color: link.highlight ? '#FAF7F0' : '#666' }}>{link.desc}</div>
              {link.badge !== undefined && link.badge > 0 && (
                <span style={{
                  position: 'absolute', top: 12, left: 12,
                  background: '#2FA084', color: '#fff',
                  fontSize: 11, fontWeight: 'bold',
                  padding: '2px 8px', borderRadius: 12,
                }}>{link.badge}</span>
              )}
            </a>
          ))}
        </div>

        <h2 style={{ color: '#1F6F5F', margin: '32px 0 16px', fontSize: 20 }}>📊 Operations</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
        }}>
          {[
            { href: '/admin/agents', icon: '🤖', title: 'Agents Activity', desc: 'حالة كل agent ونتايجه' },
            { href: '/admin/leads-feed', icon: '🎯', title: 'Leads Feed', desc: 'كل الـ leads جاية لايف' },
            { href: '/admin/funnel', icon: '📊', title: 'Conversion Funnel', desc: 'من ad → lead → booking' },
            { href: '/admin/insights', icon: '💡', title: 'AI Insights', desc: 'كل الـ insights والفرص', badge: overview.newInsights },
            { href: '/admin/listing-performance', icon: '📈', title: 'Listing Performance', desc: 'مين بيجيب فلوس' },
            { href: '/admin/ad-builder', icon: '📣', title: 'Ad Builder', desc: 'لينكات Meta ads جاهزة' },
            { href: '/admin/activity', icon: '⚡', title: 'Live Activity', desc: 'كل النشاط 24h' },
            { href: '/ad-landing', icon: '🌐', title: 'Landing Page', desc: 'الـ ad page (preview)' },
          ].map((link) => (
            <a key={link.href} href={link.href} style={{
              background: '#fff', padding: 18, borderRadius: 12,
              border: '1px solid #eee', textDecoration: 'none',
              color: 'inherit', display: 'block', position: 'relative',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{link.icon}</div>
              <div style={{ fontWeight: 'bold', color: '#1F6F5F', fontSize: 15, marginBottom: 4 }}>{link.title}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{link.desc}</div>
              {link.badge !== undefined && link.badge > 0 && (
                <span style={{
                  position: 'absolute', top: 12, left: 12,
                  background: '#6FCF97', color: '#fff',
                  fontSize: 11, fontWeight: 'bold',
                  padding: '2px 8px', borderRadius: 12,
                }}>{link.badge}</span>
              )}
            </a>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, color: '#999', fontSize: 12 }}>
          مضمونة AI OS · مدعوم بـ Claude AI 🤖🤝
        </div>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff', padding: 20, borderRadius: 12,
  border: '1px solid #eee', marginBottom: 16,
}
