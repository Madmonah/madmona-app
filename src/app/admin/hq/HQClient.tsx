'use client'

// src/app/admin/hq/HQClient.tsx
// Master Admin Panel — single page, all data, tabs

import { useState } from 'react'

interface HQData {
  agents: Array<Record<string, unknown>>
  runs24hCount: number
  recentRuns: Array<Record<string, unknown>>
  runs24hList: Array<Record<string, unknown>>
  ads: Array<Record<string, unknown>>
  reels: Array<Record<string, unknown>>
  qc: Array<Record<string, unknown>>
  briefs: Array<Record<string, unknown>>
  plays: Array<Record<string, unknown>>
  insights: Array<Record<string, unknown>>
  fraud: Array<Record<string, unknown>>
  demand: Array<Record<string, unknown>>
  partnerships: Array<Record<string, unknown>>
  pricing: Array<Record<string, unknown>>
  promptVersions: Array<Record<string, unknown>>
  collabs: Array<Record<string, unknown>>
  messages: Array<Record<string, unknown>>
  customerSuccess: Array<Record<string, unknown>>
  emailResponses: Array<Record<string, unknown>>
  photoBriefs: Array<Record<string, unknown>>
  bookings: Array<Record<string, unknown>>
  suppliersCount: number
  listingsCount: number
  leadsCount: number
  content: Array<Record<string, unknown>>
  complaints: Array<Record<string, unknown>>
}

type TabId = 'overview' | 'agents' | 'creative' | 'intelligence' | 'growth' | 'support' | 'self-improve' | 'collaborations' | 'business'

const TABS: Array<{ id: TabId; label: string; icon: string; color: string }> = [
  { id: 'overview', label: 'نظرة عامة', icon: '📊', color: '#1F5F3F' },
  { id: 'agents', label: 'الـ Agents', icon: '🤖', color: '#2c3e50' },
  { id: 'creative', label: 'إبداع', icon: '🎨', color: '#C2410C' },
  { id: 'intelligence', label: 'ذكاء البيانات', icon: '🧠', color: '#0EA5E9' },
  { id: 'growth', label: 'نمو', icon: '🚀', color: '#10B981' },
  { id: 'support', label: 'دعم', icon: '🛠️', color: '#8B5CF6' },
  { id: 'self-improve', label: 'تحسين ذاتي', icon: '🔧', color: '#B8860B' },
  { id: 'collaborations', label: 'تعاون Agents', icon: '🎯', color: '#1F5F3F' },
  { id: 'business', label: 'أعمال', icon: '💼', color: '#666' },
]

export default function HQClient({ data }: { data: HQData }) {
  const [tab, setTab] = useState<TabId>('overview')

  const enabledAgents = data.agents.filter(a => a.enabled).length
  const successRate = data.runs24hList.length > 0
    ? Math.round((data.runs24hList.filter(r => r.status === 'success').length / data.runs24hList.length) * 100)
    : 0
  const newInsights = data.insights.filter(i => i.status === 'new').length
  const highPriority = data.insights.filter(i => i.status === 'new' && i.priority === 'high').length
  const pendingPrompts = data.promptVersions.filter(p => !p.is_active).length
  const activeCollabs = data.collabs.filter(c => c.status === 'active').length
  const criticalFraud = data.fraud.filter(f => f.severity === 'critical' || f.severity === 'high').length
  const urgentPartnerships = data.partnerships.filter(p => p.priority === 'urgent' || p.priority === 'high').length

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma, Arial', background: '#FAF7F0', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        background: '#1F5F3F', color: '#FAF7F0',
        padding: '16px 24px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 'bold' }}>
            🤖 مضمونة AI HQ
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.85 }}>
            {enabledAgents}/{data.agents.length} agent · {data.runs24hCount} run/24h · {successRate}% success
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(highPriority > 0 || pendingPrompts > 0 || criticalFraud > 0) && (
            <div style={{
              background: '#C2410C', padding: '6px 12px',
              borderRadius: 6, fontSize: 11, fontWeight: 'bold',
            }}>
              🚨 {highPriority + pendingPrompts + criticalFraud} alerts
            </div>
          )}
          <a href="/admin/marketing-hq" style={{
            color: '#FAF7F0', textDecoration: 'none', fontSize: 12,
            background: 'rgba(255,255,255,0.1)', padding: '6px 12px',
            borderRadius: 6,
          }}>
            ← Marketing HQ
          </a>
        </div>
      </header>

      {/* Tabs bar */}
      <nav style={{
        background: '#fff', padding: '0 24px',
        borderBottom: '1px solid #eee', overflowX: 'auto',
        display: 'flex', whiteSpace: 'nowrap',
      }}>
        {TABS.map(t => {
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '14px 16px', background: 'transparent',
                border: 'none', borderBottom: isActive ? `3px solid ${t.color}` : '3px solid transparent',
                color: isActive ? t.color : '#666',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer', fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              {t.icon} {t.label}
            </button>
          )
        })}
      </nav>

      {/* Content */}
      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {tab === 'overview' && (
          <OverviewTab
            data={data}
            stats={{ enabledAgents, successRate, newInsights, highPriority, pendingPrompts, activeCollabs, criticalFraud, urgentPartnerships }}
          />
        )}
        {tab === 'agents' && <AgentsTab agents={data.agents} recentRuns={data.recentRuns} />}
        {tab === 'creative' && <CreativeTab ads={data.ads} reels={data.reels} content={data.content} />}
        {tab === 'intelligence' && <IntelligenceTab fraud={data.fraud} demand={data.demand} pricing={data.pricing} qc={data.qc} />}
        {tab === 'growth' && <GrowthTab partnerships={data.partnerships} customerSuccess={data.customerSuccess} photoBriefs={data.photoBriefs} />}
        {tab === 'support' && <SupportTab complaints={data.complaints} emails={data.emailResponses} insights={data.insights} />}
        {tab === 'self-improve' && <SelfImproveTab promptVersions={data.promptVersions} recentRuns={data.recentRuns} />}
        {tab === 'collaborations' && <CollaborationsTab collabs={data.collabs} messages={data.messages} />}
        {tab === 'business' && <BusinessTab plays={data.plays} briefs={data.briefs} bookings={data.bookings} suppliersCount={data.suppliersCount} listingsCount={data.listingsCount} leadsCount={data.leadsCount} />}
      </main>
    </div>
  )
}

// ============================================================
// OVERVIEW TAB
// ============================================================
function OverviewTab({ data, stats }: { data: HQData; stats: Record<string, number> }) {
  const tiles = [
    { label: '🎨 Ad Creatives', val: data.ads.length, sub: 'إعلانات Meta جاهزة' },
    { label: '🎬 Reels', val: data.reels.length, sub: 'scripts للتصوير' },
    { label: '✅ QC Reports', val: data.qc.length, sub: 'مراجعة جودة' },
    { label: '🚨 Fraud Alerts', val: data.fraud.length, sub: `${stats.criticalFraud} عالي الخطورة` },
    { label: '📈 Demand Forecasts', val: data.demand.length, sub: 'توقعات السوق' },
    { label: '🤝 Partnerships', val: data.partnerships.length, sub: `${stats.urgentPartnerships} عاجل` },
    { label: '💰 Pricing Suggs', val: data.pricing.length, sub: 'اقتراحات تسعير' },
    { label: '🧠 Strategy Plays', val: data.plays.length, sub: 'خطط استراتيجية' },
    { label: '🌅 CEO Briefs', val: data.briefs.length, sub: 'تقارير صباحية' },
    { label: '💡 Insights', val: stats.newInsights, sub: `${stats.highPriority} عالي` },
    { label: '🔧 Prompt Versions', val: stats.pendingPrompts, sub: 'في انتظار المراجعة' },
    { label: '🎯 Collaborations', val: stats.activeCollabs, sub: 'نشطة' },
  ]

  return (
    <div>
      {/* Alert banners */}
      {stats.highPriority > 0 && (
        <div style={alertBox('#C2410C')}>
          🚨 <strong>{stats.highPriority} insight عالي الأولوية</strong> محتاج إجراء — في تاب "دعم"
        </div>
      )}
      {stats.pendingPrompts > 0 && (
        <div style={alertBox('#0EA5E9')}>
          🔧 <strong>{stats.pendingPrompts} prompt محسّن</strong> في انتظار المراجعة — في تاب "تحسين ذاتي"
        </div>
      )}
      {stats.criticalFraud > 0 && (
        <div style={alertBox('#7c1d1d')}>
          ⚠️ <strong>{stats.criticalFraud} fraud alert</strong> عالي الخطورة — في تاب "ذكاء البيانات"
        </div>
      )}

      {/* Big metric tiles */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {tiles.map((t, i) => (
          <div key={i} style={{
            background: '#fff', padding: 16, borderRadius: 12,
            border: '1px solid #eee',
          }}>
            <div style={{ fontSize: 11, color: '#666' }}>{t.label}</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1F5F3F', margin: '4px 0' }}>{t.val}</div>
            <div style={{ fontSize: 10, color: '#999' }}>{t.sub}</div>
          </div>
        ))}
      </div>

      <h3 style={sectionHeader}>🎯 Top Insights</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {data.insights.filter(i => i.status === 'new').slice(0, 5).map((i, idx) => (
          <div key={idx} style={card('#0EA5E9')}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 14 }}>{String(i.title)}</strong>
              <span style={priorityBadge(String(i.priority))}>{String(i.priority)}</span>
            </div>
            <p style={{ fontSize: 12, color: '#666', margin: '6px 0' }}>{String(i.description ?? '').slice(0, 200)}</p>
            {Boolean(i.recommended_action) && (
              <p style={{ fontSize: 12, color: '#1F5F3F', margin: 0 }}>👉 {String(i.recommended_action)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// AGENTS TAB
// ============================================================
function AgentsTab({ agents, recentRuns }: { agents: Array<Record<string, unknown>>; recentRuns: Array<Record<string, unknown>> }) {
  const [filter, setFilter] = useState<string>('all')
  const teams = Array.from(new Set(agents.map(a => String(a.team)))).sort()
  const filtered = filter === 'all' ? agents : agents.filter(a => a.team === filter)

  // Group recent runs by agent
  const runsByAgent = new Map<string, number>()
  recentRuns.forEach(r => {
    const n = String(r.agent_name)
    runsByAgent.set(n, (runsByAgent.get(n) ?? 0) + 1)
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <FilterBtn label={`All (${agents.length})`} active={filter === 'all'} onClick={() => setFilter('all')} />
        {teams.map(t => (
          <FilterBtn key={t} label={`${t} (${agents.filter(a => a.team === t).length})`} active={filter === t} onClick={() => setFilter(t)} />
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
              <th style={th}>Agent</th>
              <th style={th}>Team</th>
              <th style={th}>Status</th>
              <th style={th}>Runs (24h)</th>
              <th style={th}>Success</th>
              <th style={th}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => {
              const runsRecent = runsByAgent.get(String(a.agent_name)) ?? 0
              const successRate = Number(a.run_count) > 0
                ? Math.round((Number(a.success_count) / Number(a.run_count)) * 100)
                : 0
              return (
                <tr key={String(a.agent_name)} style={{
                  borderBottom: '1px solid #eee',
                  background: i % 2 === 0 ? '#fff' : '#FAF7F0',
                }}>
                  <td style={td}><strong>{String(a.display_name ?? a.agent_name)}</strong><br/><span style={{ fontSize: 10, color: '#999' }}>{String(a.agent_name)}</span></td>
                  <td style={td}>{String(a.team)}</td>
                  <td style={td}>
                    <span style={{
                      background: a.enabled ? '#d4edda' : '#f8d7da',
                      color: a.enabled ? '#155724' : '#721c24',
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                    }}>
                      {a.enabled ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td style={td}>{runsRecent}</td>
                  <td style={td}>
                    <span style={{
                      background: successRate >= 90 ? '#d4edda' : successRate >= 70 ? '#fff3cd' : '#f8d7da',
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                    }}>
                      {successRate}%
                    </span>
                  </td>
                  <td style={td}>
                    <RunAgentButton agentName={String(a.agent_name)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RunAgentButton({ agentName }: { agentName: string }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/agents/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7',
        },
        body: JSON.stringify({ agent: agentName }),
      })
      const data = await res.json()
      setResult(data.result?.success ? '✅' : '❌')
      setTimeout(() => setResult(null), 3000)
    } catch {
      setResult('❌')
    } finally {
      setRunning(false)
    }
  }

  return (
    <button
      onClick={run}
      disabled={running}
      style={{
        padding: '4px 10px', background: '#1F5F3F', color: '#fff',
        border: 'none', borderRadius: 4, cursor: running ? 'wait' : 'pointer',
        fontSize: 11, fontFamily: 'inherit',
      }}
    >
      {running ? '⏳' : result ?? '▶ شغّل'}
    </button>
  )
}

// ============================================================
// CREATIVE TAB
// ============================================================
function CreativeTab({ ads, reels, content }: { ads: Array<Record<string, unknown>>; reels: Array<Record<string, unknown>>; content: Array<Record<string, unknown>> }) {
  const [sub, setSub] = useState<'ads' | 'reels' | 'posts'>('ads')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <FilterBtn label={`🎨 Ads (${ads.length})`} active={sub === 'ads'} onClick={() => setSub('ads')} />
        <FilterBtn label={`🎬 Reels (${reels.length})`} active={sub === 'reels'} onClick={() => setSub('reels')} />
        <FilterBtn label={`📝 Posts (${content.length})`} active={sub === 'posts'} onClick={() => setSub('posts')} />
      </div>

      {sub === 'ads' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {ads.length === 0 ? <Empty msg="مفيش إعلانات لسه" /> :
            ads.map((a, i) => (
              <div key={i} style={card('#C2410C')}>
                <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 16 }}>{String(a.headline)}</h3>
                <p style={{ fontSize: 13, color: '#444', margin: '8px 0', lineHeight: 1.6 }}>{String(a.primary_text ?? '').slice(0, 250)}</p>
                <div style={{ fontSize: 11, color: '#666' }}>
                  📂 {String(a.category)} · CTA: {String(a.cta_text ?? '')}
                </div>
              </div>
            ))}
        </div>
      )}

      {sub === 'reels' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {reels.length === 0 ? <Empty msg="مفيش reels لسه" /> :
            reels.map((r, i) => (
              <div key={i} style={card('#C2410C')}>
                <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 16 }}>{String(r.title)}</h3>
                <div style={{ background: '#1F5F3F', color: '#FAF7F0', padding: 10, borderRadius: 6, margin: '8px 0', fontSize: 13, fontWeight: 'bold' }}>
                  💥 {String(r.hook)}
                </div>
              </div>
            ))}
        </div>
      )}

      {sub === 'posts' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {content.length === 0 ? <Empty msg="مفيش posts" /> :
            content.map((c, i) => (
              <div key={i} style={card('#C2410C')}>
                <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 14 }}>{String(c.title)}</h3>
                <p style={{ fontSize: 12, color: '#666', margin: '6px 0', whiteSpace: 'pre-wrap' }}>{String(c.body ?? '').slice(0, 200)}...</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// INTELLIGENCE TAB
// ============================================================
function IntelligenceTab({ fraud, demand, pricing, qc }: { fraud: Array<Record<string, unknown>>; demand: Array<Record<string, unknown>>; pricing: Array<Record<string, unknown>>; qc: Array<Record<string, unknown>> }) {
  const [sub, setSub] = useState<'demand' | 'fraud' | 'pricing' | 'qc'>('demand')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterBtn label={`📈 Demand (${demand.length})`} active={sub === 'demand'} onClick={() => setSub('demand')} />
        <FilterBtn label={`🚨 Fraud (${fraud.length})`} active={sub === 'fraud'} onClick={() => setSub('fraud')} />
        <FilterBtn label={`💰 Pricing (${pricing.length})`} active={sub === 'pricing'} onClick={() => setSub('pricing')} />
        <FilterBtn label={`✅ QC (${qc.length})`} active={sub === 'qc'} onClick={() => setSub('qc')} />
      </div>

      {sub === 'demand' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {demand.length === 0 ? <Empty msg="مفيش توقعات" /> :
            demand.map((f, i) => {
              const gap = Number(f.supply_gap ?? 0)
              return (
                <div key={i} style={card(gap < -5 ? '#C2410C' : '#1F5F3F')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 15 }}>{gap < -5 ? '🔥' : '📊'} {String(f.category)}</h3>
                    <span style={{
                      background: gap < 0 ? '#fee' : '#d4edda',
                      color: gap < 0 ? '#C2410C' : '#155724',
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 'bold',
                    }}>
                      Gap: {gap > 0 ? '+' : ''}{gap}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '10px 0' }}>
                    <Stat label="Predicted" val={String(f.predicted_bookings ?? 0)} />
                    <Stat label="Current Supply" val={String(f.current_supply ?? 0)} />
                    <Stat label="Confidence" val={String(f.confidence ?? '—')} />
                  </div>
                  {Boolean(f.recommended_action) && (
                    <div style={{ background: '#1F5F3F', color: '#FAF7F0', padding: 10, borderRadius: 6, fontSize: 12 }}>
                      👉 {String(f.recommended_action)}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {sub === 'fraud' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {fraud.length === 0 ? <Empty msg="✅ المنصة آمنة" /> :
            fraud.map((a, i) => (
              <div key={i} style={card(a.severity === 'critical' || a.severity === 'high' ? '#C2410C' : '#B8860B')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{String(a.alert_type)}</strong>
                  <span style={{
                    background: a.severity === 'critical' ? '#7c1d1d' : a.severity === 'high' ? '#C2410C' : '#B8860B',
                    color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                  }}>
                    {String(a.severity).toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#444', margin: '6px 0' }}>{String(a.description)}</p>
                <p style={{ fontSize: 11, color: '#1F5F3F', margin: 0 }}>👉 {String(a.recommended_action)}</p>
              </div>
            ))}
        </div>
      )}

      {sub === 'pricing' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {pricing.length === 0 ? <Empty msg="مفيش اقتراحات تسعير" /> :
            pricing.map((p, i) => (
              <div key={i} style={card('#B8860B')}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 20, color: '#666' }}>{String(p.current_price)}ج</span>
                  <span style={{ fontSize: 18 }}>→</span>
                  <span style={{ fontSize: 22, color: '#1F5F3F', fontWeight: 'bold' }}>{String(p.suggested_price)}ج</span>
                  <span style={{ fontSize: 12, color: Number(p.price_change_pct) > 0 ? '#28a745' : '#C2410C', fontWeight: 'bold' }}>
                    ({Number(p.price_change_pct) > 0 ? '+' : ''}{String(p.price_change_pct)}%)
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#444' }}>{String(p.reasoning ?? '').slice(0, 200)}</p>
              </div>
            ))}
        </div>
      )}

      {sub === 'qc' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {qc.length === 0 ? <Empty msg="مفيش QC reports" /> :
            qc.map((r, i) => (
              <div key={i} style={card(r.pass_status === 'pass' ? '#28a745' : '#C2410C')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Listing: {String(r.listing_id).slice(0, 8)}</strong>
                  <span style={{
                    background: Number(r.overall_score) >= 80 ? '#28a745' : Number(r.overall_score) >= 60 ? '#B8860B' : '#C2410C',
                    color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 'bold',
                  }}>
                    {String(r.overall_score)}/100
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// GROWTH TAB
// ============================================================
function GrowthTab({ partnerships, customerSuccess, photoBriefs }: { partnerships: Array<Record<string, unknown>>; customerSuccess: Array<Record<string, unknown>>; photoBriefs: Array<Record<string, unknown>> }) {
  const [sub, setSub] = useState<'partnerships' | 'customers' | 'photos'>('partnerships')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <FilterBtn label={`🤝 Partnerships (${partnerships.length})`} active={sub === 'partnerships'} onClick={() => setSub('partnerships')} />
        <FilterBtn label={`👥 Customers (${customerSuccess.length})`} active={sub === 'customers'} onClick={() => setSub('customers')} />
        <FilterBtn label={`📸 Photo Briefs (${photoBriefs.length})`} active={sub === 'photos'} onClick={() => setSub('photos')} />
      </div>

      {sub === 'partnerships' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {partnerships.length === 0 ? <Empty msg="مفيش فرص شراكة" /> :
            partnerships.map((o, i) => (
              <div key={i} style={card(o.priority === 'urgent' ? '#C2410C' : o.priority === 'high' ? '#B8860B' : '#1F5F3F')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 14 }}>{String(o.partner_name)}</strong>
                  <span style={priorityBadge(String(o.priority))}>{String(o.priority)}</span>
                </div>
                <p style={{ fontSize: 11, color: '#666', margin: '4px 0' }}>{String(o.partner_handle ?? '')} · {String(o.partner_type)}</p>
                <p style={{ fontSize: 12, color: '#444' }}>{String(o.opportunity_summary ?? '').slice(0, 200)}</p>
                <div style={{ background: '#FAF7F0', padding: 6, borderRadius: 4, fontSize: 11, color: '#1F5F3F' }}>
                  💎 {String(o.potential_value)}
                </div>
              </div>
            ))}
        </div>
      )}

      {sub === 'customers' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {customerSuccess.length === 0 ? <Empty msg="مفيش customer actions" /> :
            customerSuccess.map((a, i) => (
              <div key={i} style={card('#10B981')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{String(a.customer_segment ?? '—')}</strong>
                  <span style={{ background: '#10B981', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10 }}>
                    Health: {String(a.health_score ?? '—')}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#444', margin: '4px 0' }}>{String(a.recommended_action ?? '').slice(0, 200)}</p>
              </div>
            ))}
        </div>
      )}

      {sub === 'photos' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {photoBriefs.length === 0 ? <Empty msg="مفيش photo briefs" /> :
            photoBriefs.map((p, i) => (
              <div key={i} style={card('#10B981')}>
                <strong>Listing: {String(p.listing_id).slice(0, 8)}</strong>
                <p style={{ fontSize: 11, color: '#666', margin: '4px 0' }}>Quality: {String(p.current_photo_quality_score ?? '?')}/100 · Uplift: {String(p.estimated_uplift ?? '?')}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUPPORT TAB
// ============================================================
function SupportTab({ complaints, emails, insights }: { complaints: Array<Record<string, unknown>>; emails: Array<Record<string, unknown>>; insights: Array<Record<string, unknown>> }) {
  const [sub, setSub] = useState<'insights' | 'complaints' | 'emails'>('insights')
  const newInsights = insights.filter(i => i.status === 'new')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <FilterBtn label={`💡 Insights (${newInsights.length})`} active={sub === 'insights'} onClick={() => setSub('insights')} />
        <FilterBtn label={`📞 Complaints (${complaints.length})`} active={sub === 'complaints'} onClick={() => setSub('complaints')} />
        <FilterBtn label={`📧 Emails (${emails.length})`} active={sub === 'emails'} onClick={() => setSub('emails')} />
      </div>

      {sub === 'insights' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {newInsights.length === 0 ? <Empty msg="مفيش insights جديدة" /> :
            newInsights.map((ins, i) => (
              <div key={i} style={card(ins.priority === 'high' ? '#C2410C' : '#0EA5E9')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 14 }}>{String(ins.title)}</strong>
                  <span style={priorityBadge(String(ins.priority))}>{String(ins.priority)}</span>
                </div>
                <p style={{ fontSize: 12, color: '#666', margin: '6px 0' }}>{String(ins.description ?? '').slice(0, 300)}</p>
                {Boolean(ins.recommended_action) && (
                  <div style={{ background: '#FAF7F0', padding: 8, borderRadius: 4, fontSize: 11, color: '#1F5F3F' }}>
                    👉 {String(ins.recommended_action)}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#999', marginTop: 6 }}>
                  من: {String(ins.agent_name)}
                </div>
              </div>
            ))}
        </div>
      )}

      {sub === 'complaints' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {complaints.length === 0 ? <Empty msg="✅ مفيش شكاوى" /> :
            complaints.map((c, i) => (
              <div key={i} style={card(c.severity === 'critical' || c.severity === 'high' ? '#C2410C' : '#B8860B')}>
                <p style={{ fontSize: 13, color: '#444', margin: '4px 0' }}>{String(c.complaint_text ?? '').slice(0, 200)}</p>
                <div style={{ fontSize: 11, color: '#666' }}>
                  Severity: {String(c.severity)} · {String(c.complaint_category)}
                </div>
              </div>
            ))}
        </div>
      )}

      {sub === 'emails' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {emails.length === 0 ? <Empty msg="مفيش إيميلات" /> :
            emails.map((e, i) => (
              <div key={i} style={card('#8B5CF6')}>
                <strong>{String(e.subject)}</strong>
                <div style={{ fontSize: 11, color: '#666' }}>{String(e.from_email)} · {String(e.urgency)}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// SELF-IMPROVE TAB
// ============================================================
function SelfImproveTab({ promptVersions, recentRuns }: { promptVersions: Array<Record<string, unknown>>; recentRuns: Array<Record<string, unknown>> }) {
  return (
    <div>
      <h3 style={sectionHeader}>🧠 Prompt Versions</h3>

      {promptVersions.length === 0 ? <Empty msg="لسه مفيش تحسينات مقترحة" /> : (
        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {promptVersions.map((v, i) => (
            <div key={i} style={card(v.is_active ? '#28a745' : '#0EA5E9')}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>🎯 {String(v.agent_name)} v{String(v.version)}</strong>
                <span style={{
                  background: v.is_active ? '#28a745' : '#fff3cd',
                  color: v.is_active ? '#fff' : '#856404',
                  padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                }}>
                  {v.is_active ? '✅ Active' : '⏳ Pending'}
                </span>
              </div>
              {Boolean(v.hypothesis) && (
                <p style={{ fontSize: 12, color: '#444', margin: '8px 0' }}>
                  <strong>💡 الفرضية:</strong> {String(v.hypothesis).slice(0, 250)}
                </p>
              )}
              <div style={{ marginTop: 8 }}>
                <a href="/admin/prompt-versions" style={linkBtn}>عرض الـ prompt الكامل ↗</a>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={sectionHeader}>📊 آخر Runs</h3>
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', maxHeight: 500, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead style={{ position: 'sticky', top: 0 }}>
            <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
              <th style={th}>Agent</th><th style={th}>Status</th><th style={th}>Time</th><th style={th}>Error</th>
            </tr>
          </thead>
          <tbody>
            {recentRuns.slice(0, 20).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAF7F0' }}>
                <td style={td}><strong>{String(r.agent_name)}</strong></td>
                <td style={td}>
                  <span style={{
                    background: r.status === 'success' ? '#d4edda' : '#f8d7da',
                    color: r.status === 'success' ? '#155724' : '#721c24',
                    padding: '2px 6px', borderRadius: 4, fontSize: 10,
                  }}>
                    {String(r.status)}
                  </span>
                </td>
                <td style={td}>{Math.round(Number(r.duration_ms ?? 0) / 1000)}s</td>
                <td style={{ ...td, color: '#C2410C', fontSize: 10 }}>
                  {r.error_message ? String(r.error_message).slice(0, 60) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// COLLABORATIONS TAB
// ============================================================
function CollaborationsTab({ collabs, messages }: { collabs: Array<Record<string, unknown>>; messages: Array<Record<string, unknown>> }) {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const launch = async () => {
    if (!goal.trim()) return
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/agents/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7',
        },
        body: JSON.stringify({ agent: 'orchestrator', args: { goal } }),
      })
      const data = await res.json()
      const r = data.result?.output_summary
      if (r) {
        setFeedback(`✅ تم إطلاق Collaboration!\nAgents: ${(r.participating_agents ?? []).join(' · ')}\nTasks: ${r.tasks_dispatched}\nالمدة: ${r.estimated_duration_min} دقيقة`)
        setTimeout(() => location.reload(), 4000)
      } else {
        setFeedback('❌ فشل')
      }
    } catch {
      setFeedback('❌ خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #1F5F3F 0%, #10B981 100%)',
        color: '#fff', padding: 20, borderRadius: 12, marginBottom: 20,
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>🚀 اطلق Collaboration جديدة</h3>
        <p style={{ fontSize: 12, opacity: 0.9, marginBottom: 12 }}>
          Orchestrator AI هياخد الـ goal بتاعك ويوزّع التاسكات على الـ agents المناسبين
        </p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="اكتب الـ goal... مثال: اطلق حملة تسويقية للكاميرات لما الصيف"
          style={{
            width: '100%', padding: 10, borderRadius: 8, border: 'none',
            fontSize: 13, fontFamily: 'Tahoma', minHeight: 60, marginBottom: 10, resize: 'vertical',
          }}
          dir="rtl"
        />
        <button
          onClick={launch}
          disabled={loading || !goal.trim()}
          style={{
            background: loading ? '#666' : '#B8860B', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 'bold',
            cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {loading ? '⏳ Orchestrator بيخطط...' : '🚀 اطلق'}
        </button>
        {feedback && (
          <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {feedback}
          </div>
        )}
      </div>

      <h3 style={sectionHeader}>🤝 Collaborations</h3>
      <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        {collabs.length === 0 ? <Empty msg="مفيش collaborations" /> :
          collabs.map((c, i) => (
            <div key={i} style={card(c.status === 'active' ? '#0EA5E9' : '#28a745')}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 13 }}>🎯 {String(c.collaboration_name).slice(0, 80)}</strong>
                <span style={{
                  background: c.status === 'active' ? '#0EA5E9' : '#28a745',
                  color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10,
                }}>
                  {String(c.status)}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#666', margin: '6px 0' }}>{String(c.goal).slice(0, 200)}</p>
              <div style={{ fontSize: 10, color: '#1F5F3F' }}>
                Agents: {(c.participating_agents as string[] ?? []).join(' · ')}
              </div>
            </div>
          ))}
      </div>

      <h3 style={sectionHeader}>📬 Messages</h3>
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead style={{ position: 'sticky', top: 0 }}>
            <tr style={{ background: '#1F5F3F', color: '#FAF7F0' }}>
              <th style={th}>From → To</th><th style={th}>Subject</th><th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#FAF7F0' }}>
                <td style={td}><strong>{String(m.from_agent)}</strong> → {String(m.to_agent)}</td>
                <td style={td}>{String(m.subject).slice(0, 50)}</td>
                <td style={td}>{String(m.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// BUSINESS TAB
// ============================================================
function BusinessTab({ plays, briefs, bookings, suppliersCount, listingsCount, leadsCount }: { plays: Array<Record<string, unknown>>; briefs: Array<Record<string, unknown>>; bookings: Array<Record<string, unknown>>; suppliersCount: number; listingsCount: number; leadsCount: number }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <Stat label="🏠 إعلانات" val={String(listingsCount)} big />
        <Stat label="👨‍💼 مؤجرين" val={String(suppliersCount)} big />
        <Stat label="📅 حجوزات" val={String(bookings.length)} big />
        <Stat label="🎯 Leads" val={String(leadsCount)} big />
      </div>

      <h3 style={sectionHeader}>🌅 Latest CEO Brief</h3>
      {briefs.length === 0 ? <Empty msg="مفيش briefs" /> : (
        <div style={card('#1F5F3F')}>
          <h4 style={{ margin: 0 }}>{String(briefs[0].brief_date ?? 'Brief')}</h4>
          <p style={{ fontSize: 12, color: '#666', margin: '8px 0' }}>{String(briefs[0].executive_summary ?? '').slice(0, 400)}</p>
        </div>
      )}

      <h3 style={sectionHeader}>🧠 Strategy Plays</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        {plays.slice(0, 8).map((p, i) => (
          <div key={i} style={card(p.priority === 'urgent' ? '#C2410C' : p.priority === 'high' ? '#B8860B' : '#1F5F3F')}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{String(p.title ?? 'Strategy')}</strong>
              <span style={priorityBadge(String(p.priority ?? 'medium'))}>{String(p.priority ?? 'medium')}</span>
            </div>
            <p style={{ fontSize: 12, color: '#444', margin: '6px 0' }}>{String(p.description ?? '').slice(0, 250)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// SHARED COMPONENTS & STYLES
// ============================================================
function FilterBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', background: active ? '#1F5F3F' : '#fff',
      color: active ? '#FAF7F0' : '#1F5F3F',
      border: '1px solid #1F5F3F', borderRadius: 6,
      cursor: 'pointer', fontSize: 11, fontWeight: 'bold',
      fontFamily: 'inherit',
    }}>
      {label}
    </button>
  )
}

function Empty({ msg }: { msg: string }) {
  return (
    <div style={{ background: '#fff', padding: 40, borderRadius: 12, textAlign: 'center', color: '#999' }}>
      <p style={{ fontSize: 13 }}>{msg}</p>
    </div>
  )
}

function Stat({ label, val, big }: { label: string; val: string; big?: boolean }) {
  return (
    <div style={{ background: '#FAF7F0', padding: 10, borderRadius: 6, textAlign: 'center' }}>
      <div style={{ fontSize: big ? 24 : 16, fontWeight: 'bold', color: '#1F5F3F' }}>{val}</div>
      <div style={{ fontSize: 10, color: '#666' }}>{label}</div>
    </div>
  )
}

const sectionHeader: React.CSSProperties = {
  color: '#1F5F3F', fontSize: 16, marginTop: 24, marginBottom: 12,
}

const th: React.CSSProperties = { padding: 10, textAlign: 'right', fontSize: 11 }
const td: React.CSSProperties = { padding: 8, fontSize: 11 }

const linkBtn: React.CSSProperties = {
  color: '#0EA5E9', textDecoration: 'none', fontSize: 11,
}

function alertBox(color: string): React.CSSProperties {
  return {
    background: color, color: '#fff',
    padding: 12, borderRadius: 8, marginBottom: 10, fontSize: 13,
  }
}

function card(borderColor: string): React.CSSProperties {
  return {
    background: '#fff', padding: 14, borderRadius: 10,
    border: '1px solid #eee', borderRight: `4px solid ${borderColor}`,
  }
}

function priorityBadge(priority: string): React.CSSProperties {
  const colors: Record<string, string> = {
    urgent: '#C2410C', high: '#B8860B', medium: '#1F5F3F', low: '#666',
  }
  return {
    background: colors[priority] ?? '#666', color: '#fff',
    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
  }
}
