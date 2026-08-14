// src/app/admin/capabilities/page.tsx
// Agent Capabilities registry — what each agent can do, who can call them.
// Added May 16 2026 as part of Task 3 (agent reconnection).

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Capability = {
  id: string
  agent_name: string
  capability_name: string
  description: string | null
  input_schema: any
  output_schema: any
  can_be_called_by_agents: boolean
}

export default async function CapabilitiesPage({
  searchParams,
}: {
  searchParams: { agent?: string; team?: string }
}) {
  // Fetch all capabilities
  let q = supabaseAdmin
    .from('agent_capabilities')
    .select('*')
    .order('agent_name', { ascending: true })
    .order('capability_name', { ascending: true })

  if (searchParams.agent) q = q.eq('agent_name', searchParams.agent)
  const { data: capsRaw } = await q
  const caps = (capsRaw ?? []) as Capability[]

  // Fetch all agents + team membership for coverage report
  const { data: agentsRaw } = await supabaseAdmin
    .from('agent_registry')
    .select('agent_name, team, display_name, enabled')
    .order('team').order('agent_name')

  const agents = (agentsRaw ?? []) as { agent_name: string; team: string; display_name: string | null; enabled: boolean }[]
  const filteredAgents = searchParams.team ? agents.filter(a => a.team === searchParams.team) : agents
  const teams = Array.from(new Set(agents.map(a => a.team))).sort()

  // Map agent_name → list of capabilities
  const capsByAgent = new Map<string, Capability[]>()
  for (const c of caps) {
    if (!capsByAgent.has(c.agent_name)) capsByAgent.set(c.agent_name, [])
    capsByAgent.get(c.agent_name)!.push(c)
  }

  const coveredCount = filteredAgents.filter(a => capsByAgent.has(a.agent_name)).length

  return (
    <div dir="rtl" style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ color: '#059669', margin: 0, fontSize: 26 }}>🛠️ Agent Capabilities</h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: 13 }}>
            {caps.length} capability · {coveredCount}/{filteredAgents.length} agent declared
          </p>
        </header>

        {/* Team filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'center' }}>
          <a href="/admin/capabilities" style={!searchParams.team ? chipActiveStyle : chipStyle}>الكل ({agents.length})</a>
          {teams.map(t => (
            <a key={t} href={`/admin/capabilities?team=${t}`} style={searchParams.team === t ? chipActiveStyle : chipStyle}>
              {t} ({agents.filter(a => a.team === t).length})
            </a>
          ))}
        </div>

        {/* Per-agent rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredAgents.map(a => {
            const agentCaps = capsByAgent.get(a.agent_name) ?? []
            const hasCaps = agentCaps.length > 0
            return (
              <article key={a.agent_name} style={{
                ...cardStyle,
                opacity: a.enabled ? 1 : 0.5,
                borderRight: `4px solid ${hasCaps ? '#10B981' : '#DC2626'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#059669', fontSize: 14 }}>
                      {a.agent_name}
                      {a.display_name && <span style={{ color: '#888', fontSize: 12, fontWeight: 'normal' }}> · {a.display_name}</span>}
                    </h3>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                      team: {a.team} · {hasCaps ? `${agentCaps.length} capability` : 'مفيش capabilities معلنة'}
                    </div>
                  </div>
                  {!hasCaps && (
                    <span style={{ ...badge, background: '#DC2626' }}>orphan</span>
                  )}
                </div>

                {hasCaps && (
                  <ul style={{ margin: '8px 0 0', paddingRight: 20, fontSize: 12 }}>
                    {agentCaps.map(c => (
                      <li key={c.id} style={{ marginBottom: 4 }}>
                        <strong>{c.capability_name}</strong>
                        {c.can_be_called_by_agents && <span style={{ color: '#0EA5E9', fontSize: 10 }}> · callable</span>}
                        {c.description && <span style={{ color: '#666' }}> — {c.description}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </div>

        <BackBtn />
      </div>
    </div>
  )
}

function BackBtn() {
  return (
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      <a href="/admin/ai-os" style={{
        color: '#059669', textDecoration: 'none', fontSize: 13,
        padding: '8px 16px', background: '#fff', borderRadius: 8,
        border: '1px solid #059669', display: 'inline-block',
      }}>← رجوع للداشبورد</a>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  fontFamily: 'Tahoma, Arial, sans-serif',
  background: '#FAF7F0', minHeight: '100vh',
  padding: '24px 20px', color: '#1a1a1a',
}
const cardStyle: React.CSSProperties = {
  background: '#fff', padding: 14, borderRadius: 10,
  border: '1px solid #E5E5E0',
}
const chipStyle: React.CSSProperties = {
  fontSize: 12, padding: '6px 12px', background: '#fff',
  borderRadius: 20, border: '1px solid #E5E5E0',
  color: '#059669', textDecoration: 'none',
}
const chipActiveStyle: React.CSSProperties = {
  ...chipStyle, background: '#059669', color: '#fff', borderColor: '#059669',
}
const badge: React.CSSProperties = {
  fontSize: 10, padding: '3px 8px', borderRadius: 12,
  color: '#fff', flexShrink: 0,
}
