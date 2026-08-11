// src/app/admin/agent-network/page.tsx
// Agent Network — visual map of who's connected to whom across pipelines,
// capabilities, and recent messages. Heart of Task 3.

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Agent = { agent_name: string; team: string; display_name: string | null; enabled: boolean }
type Pipeline = { name: string; steps: any[]; enabled: boolean }
type Message = { from_agent: string; to_agent: string }
type Capability = { agent_name: string; can_be_called_by_agents: boolean }

const TEAM_COLORS: Record<string, string> = {
  sales: '#2B4521',
  marketing: '#2FA084',
  creative: '#6FCF97',
  intelligence: '#0EA5E9',
  growth: '#10B981',
  operations: '#666',
  strategic: '#2c3e50',
  support: '#8B5CF6',
}

export default async function AgentNetworkPage() {
  const [agentsR, pipelinesR, messagesR, capsR] = await Promise.all([
    supabaseAdmin.from('agent_registry').select('agent_name, team, display_name, enabled').order('team').order('agent_name'),
    supabaseAdmin.from('agent_pipelines').select('name, steps, enabled').eq('enabled', true),
    supabaseAdmin.from('agent_messages').select('from_agent, to_agent').limit(200),
    supabaseAdmin.from('agent_capabilities').select('agent_name, can_be_called_by_agents'),
  ])

  const agents = (agentsR.data ?? []) as Agent[]
  const pipelines = (pipelinesR.data ?? []) as Pipeline[]
  const messages = (messagesR.data ?? []) as Message[]
  const caps = (capsR.data ?? []) as Capability[]

  // Build connection map: agent_name → { incoming, outgoing }
  const connections = new Map<string, { incoming: Set<string>; outgoing: Set<string>; pipelines: Set<string> }>()
  for (const a of agents) {
    connections.set(a.agent_name, { incoming: new Set(), outgoing: new Set(), pipelines: new Set() })
  }

  // Pipeline-based edges: step N → step N+1
  for (const p of pipelines) {
    const steps = Array.isArray(p.steps) ? p.steps : []
    for (let i = 0; i < steps.length; i++) {
      const agent = steps[i]?.agent
      if (!agent || !connections.has(agent)) continue
      connections.get(agent)!.pipelines.add(p.name)
      if (i > 0) {
        const prev = steps[i - 1]?.agent
        if (prev && connections.has(prev)) {
          connections.get(agent)!.incoming.add(prev)
          connections.get(prev)!.outgoing.add(agent)
        }
      }
    }
  }

  // Message-based edges
  for (const m of messages) {
    if (m.from_agent && m.to_agent && connections.has(m.from_agent) && connections.has(m.to_agent)) {
      connections.get(m.from_agent)!.outgoing.add(m.to_agent)
      connections.get(m.to_agent)!.incoming.add(m.from_agent)
    }
  }

  const callable = new Set(caps.filter(c => c.can_be_called_by_agents).map(c => c.agent_name))

  // Group by team
  const byTeam = new Map<string, Agent[]>()
  for (const a of agents) {
    if (!byTeam.has(a.team)) byTeam.set(a.team, [])
    byTeam.get(a.team)!.push(a)
  }
  const teams = Array.from(byTeam.keys()).sort()

  // Stats
  const orphanCount = agents.filter(a => {
    const c = connections.get(a.agent_name)!
    return c.incoming.size === 0 && c.outgoing.size === 0
  }).length
  const connectedCount = agents.length - orphanCount

  return (
    <div dir="rtl" style={pageStyle}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ color: '#2B4521', margin: 0, fontSize: 26 }}>🕸️ Agent Network</h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: 13 }}>
            {connectedCount} متربط · <span style={{ color: '#DC2626' }}>{orphanCount} orphan</span> · {pipelines.length} pipeline · {messages.length} message
          </p>
        </header>

        {/* Legend */}
        <div style={{
          background: '#fff', borderRadius: 10, border: '1px solid #E5E5E0',
          padding: 12, marginBottom: 16, fontSize: 11,
          display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <span><strong style={{ color: '#10B981' }}>●</strong> متربط (في pipeline أو يبعت/يستلم رسائل)</span>
          <span><strong style={{ color: '#DC2626' }}>●</strong> orphan</span>
          <span><strong style={{ color: '#0EA5E9' }}>→</strong> اتجاه التدفق</span>
          <span><strong>📞</strong> callable من أجينتس تانية</span>
        </div>

        {/* Per-team agent cards */}
        {teams.map(team => {
          const teamAgents = byTeam.get(team)!
          const color = TEAM_COLORS[team] ?? '#666'
          return (
            <section key={team} style={{ marginBottom: 24 }}>
              <h2 style={{
                color: color, fontSize: 16, margin: '0 0 10px',
                padding: '6px 12px', background: '#fff',
                borderRadius: 8, border: `1px solid ${color}`,
                display: 'inline-block',
              }}>
                {team} ({teamAgents.length})
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 10,
              }}>
                {teamAgents.map(a => {
                  const c = connections.get(a.agent_name)!
                  const isOrphan = c.incoming.size === 0 && c.outgoing.size === 0
                  return (
                    <div key={a.agent_name} style={{
                      ...cardStyle,
                      borderRight: `4px solid ${isOrphan ? '#DC2626' : '#10B981'}`,
                      opacity: a.enabled ? 1 : 0.5,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <strong style={{ color, fontSize: 13 }}>{a.agent_name}</strong>
                        {callable.has(a.agent_name) && <span style={{ fontSize: 10, color: '#0EA5E9' }}>📞 callable</span>}
                      </div>
                      {c.pipelines.size > 0 && (
                        <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                          📋 {Array.from(c.pipelines).join(', ')}
                        </div>
                      )}
                      {c.incoming.size > 0 && (
                        <div style={{ fontSize: 11, marginTop: 4 }}>
                          <span style={{ color: '#0EA5E9' }}>← يستلم من:</span>{' '}
                          <span style={{ color: '#666' }}>{Array.from(c.incoming).slice(0, 4).join(', ')}{c.incoming.size > 4 ? ` +${c.incoming.size - 4}` : ''}</span>
                        </div>
                      )}
                      {c.outgoing.size > 0 && (
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          <span style={{ color: '#10B981' }}>→ يبعت لـ:</span>{' '}
                          <span style={{ color: '#666' }}>{Array.from(c.outgoing).slice(0, 4).join(', ')}{c.outgoing.size > 4 ? ` +${c.outgoing.size - 4}` : ''}</span>
                        </div>
                      )}
                      {isOrphan && (
                        <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4, fontStyle: 'italic' }}>
                          مفيش ربط بأي agent تاني
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a href="/admin/ai-os" style={{
            color: '#2B4521', textDecoration: 'none', fontSize: 13,
            padding: '8px 16px', background: '#fff', borderRadius: 8,
            border: '1px solid #2B4521', display: 'inline-block',
          }}>← رجوع للداشبورد</a>
        </div>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  fontFamily: 'Tahoma, Arial, sans-serif',
  background: '#FAF7F0', minHeight: '100vh',
  padding: '24px 20px', color: '#1a1a1a',
}
const cardStyle: React.CSSProperties = {
  background: '#fff', padding: 12, borderRadius: 10,
  border: '1px solid #E5E5E0',
}
