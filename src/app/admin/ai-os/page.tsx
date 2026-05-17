// src/app/admin/ai-os/page.tsx
// AI Operating System Dashboard — Madmona AI OS
// Redesigned May 16 2026: attention hierarchy → categorized cards → teams.
// Adds: failed-runs alarm, admin news banner, 5-domain categorized grid,
// and links to previously-orphaned data (agent_runs, runbook, policy_rules,
// pipelines, workflows, capabilities, messages, alerts).

import { supabase as supabaseAdmin } from '@/lib/supabase'
import AIOSControls from './AIOSControls'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Canonical team list (matches agent_registry.team values; 8 teams as of May 2026)
const TEAMS = {
  sales: { label: '💰 Sales', color: '#1F6F5F' },
  marketing: { label: '📣 Marketing', color: '#2FA084' },
  creative: { label: '🎨 Creative', color: '#6FCF97' },
  intelligence: { label: '📊 Intelligence', color: '#0EA5E9' },
  growth: { label: '🤝 Growth', color: '#10B981' },
  operations: { label: '💼 Operations', color: '#1F6F5F' },
  strategic: { label: '🧠 Strategic', color: '#2c3e50' },
  support: { label: '🛠️ Support', color: '#8B5CF6' },
}

type Agent = {
  agent_name: string
  team: string
  display_name: string | null
  description: string | null
  enabled: boolean
  schedule_cron: string | null
  last_run_at: string | null
  run_count: number
  success_count: number
  error_count: number
}

export default async function AIOSPage() {
  const { data: agentsRaw } = await supabaseAdmin
    .from('agent_registry')
    .select('*')
    .order('team', { ascending: true })
    .order('agent_name', { ascending: true })

  const agents = (agentsRaw ?? []) as Agent[]

  // One hour ago for "failed in last hour" alarm
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const [
    // Existing
    adsCount, reelsCount, qcCount, briefsCount, playsCount,
    pendingCount, insightsCount,
    fraudCount, demandCount, partnershipsCount,
    promptVersionsCount, collabsCount,
    // New — operations
    agentRunsCount, pipelineRunsCount, adminAlertsCount, policyRulesCount,
    // New — strategy
    runbookCount,
    // New — AI meta
    workflowsCount, pipelinesCount, capabilitiesCount, messagesCount, improvementsCount,
    // New — intelligence
    performanceCount, revenueCount,
    // New — creative
    photoBriefsCount,
    // New — banners
    newsCount, failedRunsRecent,
  ] = await Promise.all([
    supabaseAdmin.from('ad_creatives').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('reel_scripts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('qc_reports').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('ceo_briefs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('strategy_plays').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('agent_insights').select('*', { count: 'exact', head: true }).eq('status', 'new').eq('priority', 'high'),
    supabaseAdmin.from('fraud_alerts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('demand_forecasts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('partnership_opportunities').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('prompt_versions').select('*', { count: 'exact', head: true }).eq('is_active', false),
    supabaseAdmin.from('agent_collaborations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    // New
    supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('pipeline_runs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('admin_alerts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('policy_rules').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('system_runbook').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('agent_workflows').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('agent_pipelines').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('agent_capabilities').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('agent_messages').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('agent_improvements').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('agent_performance_metrics').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('revenue_attribution_reports').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('photoshoot_briefs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('admin_news').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true })
      .eq('status', 'error').gte('started_at', oneHourAgo),
  ])

  const byTeam = new Map<string, Agent[]>()
  for (const a of agents) {
    if (!byTeam.has(a.team)) byTeam.set(a.team, [])
    byTeam.get(a.team)!.push(a)
  }
  const teamCount = byTeam.size
  const activeAgents = agents.filter(a => a.enabled).length

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0', minHeight: '100vh',
      padding: '24px 20px', color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* HEADER */}
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ color: '#1F6F5F', margin: 0, fontSize: 30, fontWeight: 'bold', textAlign: 'center' }}>
            🤖 Madmona AI Operating System
          </h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: 13, textAlign: 'center' }}>
            {agents.length} agent عبر {teamCount} فرق · {activeAgents} نشط · 24/7
          </p>

          {/* Quick actions */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
            justifyContent: 'center', marginTop: 16,
          }}>
            <a href="/admin/runbook" style={navLinkStyle}>📓 Runbook</a>
            <a href="/admin/agent-network" style={navLinkStyle}>🕸️ Agent Network</a>
            <a href="/admin/wa-review" style={navLinkStyle}>💬 WhatsApp Review</a>
            <a href="/admin/marketing-hq" style={navLinkStyle}>📣 Marketing HQ</a>
            <a href="/admin/leads-feed" style={navLinkStyle}>🎣 Leads Feed</a>
            <a href="/admin/agent-runs" style={navLinkStyle}>🔁 Agent Runs</a>
          </div>
        </header>

        {/* ATTENTION ZONE — only renders banners that have count > 0 */}
        <section style={{ marginBottom: 24 }}>
          {(failedRunsRecent.count ?? 0) > 0 && (
            <a href="/admin/agent-runs?status=error" style={bannerStyle('#DC2626')}>
              ⚠️ {failedRunsRecent.count} agent run فشل في آخر ساعة — راجع فوراً
            </a>
          )}

          {(insightsCount.count ?? 0) > 0 && (
            <a href="/admin/insights" style={bannerStyle('#6FCF97')}>
              🚨 {insightsCount.count} insight عالي الأولوية محتاج إجراء
            </a>
          )}

          {(promptVersionsCount.count ?? 0) > 0 && (
            <a href="/admin/prompt-versions" style={bannerStyle('#0EA5E9')}>
              🧠 {promptVersionsCount.count} prompt جديد محسّن من Prompt Optimizer — راجعهم
            </a>
          )}

          {(collabsCount.count ?? 0) > 0 && (
            <a href="/admin/collaborations" style={bannerStyle('linear-gradient(135deg, #1F6F5F 0%, #10B981 100%)')}>
              🎯 {collabsCount.count} Agent Collaborations نشطة — Orchestrator بيخطط ويوزّع التاسكات
            </a>
          )}

          {(newsCount.count ?? 0) > 0 && (
            <a href="/admin/news" style={bannerStyle('#8B5CF6')}>
              📰 {newsCount.count} admin news — اطلع على آخر التحديثات
            </a>
          )}
        </section>

        {/* CATEGORIZED CARD GRID — 5 domains */}
        <CategorySection title="🏗️ العمليات" cards={[
          { label: '🔁 Agent Runs', val: agentRunsCount.count ?? 0, href: '/admin/agent-runs' },
          { label: '⚙️ Pipeline Runs', val: pipelineRunsCount.count ?? 0, href: '/admin/pipeline-runs' },
          { label: '🔔 Admin Alerts', val: adminAlertsCount.count ?? 0, href: '/admin/alerts' },
          { label: '📋 Policy Rules', val: policyRulesCount.count ?? 0, href: '/admin/policy-rules' },
          { label: '⏳ Pending Runs', val: pendingCount.count ?? 0, href: '/admin/agent-runs?status=pending' },
        ]} />

        <CategorySection title="🧠 الذكاء" cards={[
          { label: '💡 Insights', val: insightsCount.count ?? 0, href: '/admin/insights' },
          { label: '📈 Demand Forecasts', val: demandCount.count ?? 0, href: '/admin/demand-forecast' },
          { label: '🚨 Fraud Alerts', val: fraudCount.count ?? 0, href: '/admin/fraud-alerts' },
          { label: '📊 Performance Metrics', val: performanceCount.count ?? 0, href: '/admin/performance' },
          { label: '💰 Revenue Attribution', val: revenueCount.count ?? 0, href: '/admin/revenue' },
        ]} />

        <CategorySection title="📈 الاستراتيجية" cards={[
          { label: '🌅 CEO Briefs', val: briefsCount.count ?? 0, href: '/admin/ceo-briefs' },
          { label: '🎯 Strategy Plays', val: playsCount.count ?? 0, href: '/admin/strategy' },
          { label: '🤝 Partnerships', val: partnershipsCount.count ?? 0, href: '/admin/partnerships' },
          { label: '📓 System Runbook', val: runbookCount.count ?? 0, href: '/admin/runbook' },
        ]} />

        <CategorySection title="🎨 الإبداع" cards={[
          { label: '✅ QC Reports', val: qcCount.count ?? 0, href: '/admin/qc-reports' },
          { label: '🎬 Reel Scripts', val: reelsCount.count ?? 0, href: '/admin/reels' },
          { label: '🎨 Ad Creatives', val: adsCount.count ?? 0, href: '/admin/ad-creatives' },
          { label: '📸 Photo Briefs', val: photoBriefsCount.count ?? 0, href: '/admin/photo-briefs' },
        ]} />

        <CategorySection title="🤖 الـ AI Meta" cards={[
          { label: '🧠 Prompt Versions', val: promptVersionsCount.count ?? 0, href: '/admin/prompt-versions' },
          { label: '🎯 Collaborations', val: collabsCount.count ?? 0, href: '/admin/collaborations' },
          { label: '🌊 Workflows', val: workflowsCount.count ?? 0, href: '/admin/workflows' },
          { label: '🔗 Pipelines', val: pipelinesCount.count ?? 0, href: '/admin/pipelines' },
          { label: '🛠️ Capabilities', val: capabilitiesCount.count ?? 0, href: '/admin/capabilities' },
          { label: '💬 Messages', val: messagesCount.count ?? 0, href: '/admin/messages' },
          { label: '🌱 Improvements', val: improvementsCount.count ?? 0, href: '/admin/improvements' },
        ]} />

        {/* TEAMS & AGENTS (existing component, unchanged) */}
        <h2 style={{ color: '#1F6F5F', marginTop: 32, marginBottom: 12, fontSize: 18 }}>
          الفرق والأجينتس
        </h2>
        <AIOSControls
          agentsByTeam={Object.fromEntries(byTeam)}
          teams={TEAMS}
        />

        {/* FOOTER STATUS */}
        <div style={{
          background: '#1F6F5F', color: '#FAF7F0',
          padding: 24, borderRadius: 16, marginTop: 32, textAlign: 'center',
        }}>
          <h3 style={{ margin: '0 0 8px' }}>🚀 الـ AI OS بيشتغل دلوقتي</h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
            {activeAgents}/{agents.length} agents نشطة · {teamCount} فرق · بدون تدخل
          </p>
        </div>

      </div>
    </div>
  )
}

// =================================================
// HELPERS
// =================================================

function CategorySection({
  title,
  cards,
}: {
  title: string
  cards: Array<{ label: string; val: number | string; href: string }>
}) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h3 style={{
        color: '#1F6F5F', fontSize: 13, fontWeight: 600,
        marginBottom: 8, paddingRight: 4,
      }}>
        {title}
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10,
      }}>
        {cards.map((c, i) => (
          <a
            key={i}
            href={c.href}
            style={{
              background: '#fff', padding: 14, borderRadius: 10,
              border: '1px solid #E5E5E0', textAlign: 'center',
              textDecoration: 'none', color: 'inherit', display: 'block',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1F6F5F' }}>
              {c.val}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
              {c.label}
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

function bannerStyle(bg: string): React.CSSProperties {
  return {
    display: 'block',
    background: bg,
    color: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    textDecoration: 'none',
    fontWeight: 'bold',
    textAlign: 'center',
  }
}

const navLinkStyle: React.CSSProperties = {
  color: '#1F6F5F', textDecoration: 'none', fontSize: 12,
  padding: '6px 14px', background: '#fff',
  borderRadius: 8, border: '1px solid #E5E5E0',
}
