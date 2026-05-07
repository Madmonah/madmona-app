// src/app/admin/ai-os/page.tsx
// AI Operating System Dashboard — full team overview

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TEAMS = {
  sales: { label: '💰 Sales', color: '#1F5F3F' },
  marketing: { label: '📣 Marketing', color: '#B8860B' },
  ops: { label: '⚙️ Ops', color: '#666' },
  creative: { label: '🎨 Creative', color: '#C2410C' },
  operations: { label: '💼 Operations', color: '#1F5F3F' },
  strategic: { label: '🧠 Strategic', color: '#2c3e50' },
}

export default async function AIOSPage() {
  const { data: agentsRaw } = await supabaseAdmin
    .from('agent_registry')
    .select('*')
    .order('team', { ascending: true })
    .order('agent_name', { ascending: true })

  type Agent = {
    agent_name: string; team: string; display_name: string | null;
    description: string | null; enabled: boolean; schedule_cron: string | null;
    last_run_at: string | null; run_count: number; success_count: number; error_count: number;
  }
  const agents = (agentsRaw ?? []) as Agent[]

  // Get latest counts from new tables
  const [adsCount, reelsCount, qcCount, bookingDecisionsCount, briefsCount, playsCount] = await Promise.all([
    supabaseAdmin.from('ad_creatives').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('reel_scripts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('qc_reports').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('booking_decisions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('ceo_briefs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('strategy_plays').select('*', { count: 'exact', head: true }),
  ])

  // Group agents by team
  const byTeam = new Map<string, Agent[]>()
  for (const a of agents) {
    if (!byTeam.has(a.team)) byTeam.set(a.team, [])
    byTeam.get(a.team)!.push(a)
  }

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
            🤖 Madmona AI Operating System
          </h1>
          <p style={{ color: '#666', marginTop: 8, fontSize: 14 }}>
            {agents.length} agent بيشتغلوا 24/7 · مدير شركة بالكامل
          </p>
        </header>

        {/* Output stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 32,
        }}>
          {[
            { label: '🎨 Ad Creatives', val: adsCount.count ?? 0, href: '/admin/ad-creatives' },
            { label: '🎬 Reel Scripts', val: reelsCount.count ?? 0, href: '/admin/reels' },
            { label: '✅ QC Reports', val: qcCount.count ?? 0, href: '/admin/qc-reports' },
            { label: '📅 Booking Decisions', val: bookingDecisionsCount.count ?? 0 },
            { label: '🌅 CEO Briefs', val: briefsCount.count ?? 0, href: '/admin/ceo-briefs' },
            { label: '🧠 Strategy Plays', val: playsCount.count ?? 0, href: '/admin/strategy' },
          ].map((s, i) => (
            <a key={i} href={s.href ?? '#'} style={{
              background: '#fff', padding: 16, borderRadius: 12,
              border: '1px solid #eee', textAlign: 'center',
              textDecoration: 'none', color: 'inherit',
              display: 'block',
            }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1F5F3F' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{s.label}</div>
            </a>
          ))}
        </div>

        {/* Teams */}
        {Array.from(byTeam.entries()).map(([team, members]) => {
          const teamMeta = TEAMS[team as keyof typeof TEAMS] ?? { label: team, color: '#666' }
          return (
            <div key={team} style={{ marginBottom: 32 }}>
              <h2 style={{ color: teamMeta.color, fontSize: 20, marginBottom: 12 }}>
                {teamMeta.label} ({members.length})
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 12,
              }}>
                {members.map(agent => {
                  const successRate = agent.run_count > 0
                    ? Math.round((agent.success_count / agent.run_count) * 100) : 0
                  return (
                    <div key={agent.agent_name} style={{
                      background: '#fff', padding: 16, borderRadius: 12,
                      border: '1px solid #eee',
                      borderRight: `4px solid ${agent.enabled ? teamMeta.color : '#ccc'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 14 }}>
                            {agent.display_name ?? agent.agent_name}
                          </h3>
                          <div style={{ fontSize: 10, color: '#999', fontFamily: 'monospace' }}>
                            {agent.agent_name}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 'bold',
                          padding: '2px 6px', borderRadius: 4,
                          background: agent.enabled ? '#d4edda' : '#f0f0f0',
                          color: agent.enabled ? '#155724' : '#666',
                        }}>
                          {agent.enabled ? 'نشط' : 'موقوف'}
                        </span>
                      </div>
                      {agent.description && (
                        <p style={{ fontSize: 12, color: '#666', margin: '4px 0', lineHeight: 1.5 }}>
                          {agent.description}
                        </p>
                      )}
                      <div style={{
                        display: 'flex', gap: 12, marginTop: 8,
                        fontSize: 11, color: '#999',
                      }}>
                        <span>📊 {agent.run_count} runs</span>
                        <span style={{ color: successRate >= 80 ? '#28a745' : successRate >= 50 ? '#B8860B' : '#C2410C' }}>
                          ✓ {successRate}%
                        </span>
                        {agent.last_run_at && (
                          <span>{new Date(agent.last_run_at).toLocaleDateString('ar-EG')}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div style={{
          background: '#1F5F3F', color: '#FAF7F0',
          padding: 24, borderRadius: 16, marginTop: 32, textAlign: 'center',
        }}>
          <h3 style={{ margin: '0 0 8px' }}>🚀 الـ AI OS بيشتغل دلوقتي</h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
            {agents.filter(a => a.enabled).length} agent نشط · بيدير كل أقسام مضمونة بدون تدخل
          </p>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/admin/marketing-hq" style={navLinkStyle}>← Marketing HQ</a>
          <a href="/admin/leads-feed" style={navLinkStyle}>Leads Feed</a>
          <a href="/admin/ad-builder" style={navLinkStyle}>Ad Builder</a>
        </div>
      </div>
    </div>
  )
}

const navLinkStyle: React.CSSProperties = {
  color: '#1F5F3F', textDecoration: 'none', fontSize: 13,
  padding: '8px 16px', background: '#fff',
  borderRadius: 8, border: '1px solid #1F5F3F',
}
