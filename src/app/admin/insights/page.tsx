// src/app/admin/insights/page.tsx
// AI Insights Dashboard — all insights gathered by AI agents
// Sortable by priority, agent, status; actionable items to act on

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Insight {
  id: string
  agent_name: string
  insight_type: string
  title: string
  description: string
  priority: string
  status: string
  recommended_action: string | null
  data_points: Record<string, unknown> | null
  created_at: string
}

const PRIORITY_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  high: { bg: '#fee', fg: '#C2410C', label: '🔥 عالي' },
  medium: { bg: '#fff3cd', fg: '#B8860B', label: '⚡ متوسط' },
  low: { bg: '#f0f0f0', fg: '#666', label: '🌱 منخفض' },
}

const TYPE_ICONS: Record<string, string> = {
  trend: '📈',
  opportunity: '🎯',
  warning: '⚠️',
  recommendation: '💡',
  competitor: '🔍',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `${m}د`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}س`
  return `${Math.floor(h / 24)}ي`
}

export default async function InsightsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; agent?: string }>
}) {
  const params = await searchParams
  const filter = params.filter ?? 'new'
  const agentFilter = params.agent ?? 'all'

  let query = supabaseAdmin
    .from('agent_insights')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (filter !== 'all') query = query.eq('status', filter)
  if (agentFilter !== 'all') query = query.eq('agent_name', agentFilter)

  const { data: insightsRaw } = await query
  const insights = (insightsRaw ?? []) as Insight[]

  // Get stats
  const { data: statsRaw } = await supabaseAdmin
    .from('agent_insights')
    .select('priority, status, agent_name')

  type S = { priority: string; status: string; agent_name: string }
  const stats = (statsRaw ?? []) as S[]
  const newCount = stats.filter(s => s.status === 'new').length
  const highCount = stats.filter(s => s.priority === 'high' && s.status === 'new').length
  const agentCounts = new Map<string, number>()
  stats.forEach(s => agentCounts.set(s.agent_name, (agentCounts.get(s.agent_name) ?? 0) + 1))

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0',
      minHeight: '100vh',
      padding: '24px 20px',
      color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: '#1F5F3F', margin: 0, fontSize: 26 }}>💡 AI Insights</h1>
            <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>
              كل الـ insights والفرص اللي اكتشفها الـ AI
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <a href="/admin/marketing-hq" style={{ color: '#1F5F3F' }}>← HQ</a>
            <a href="/admin/agents" style={{ color: '#1F5F3F' }}>← Agents</a>
            <a href="/admin/leads-feed" style={{ color: '#1F5F3F' }}>← Leads</a>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}>
          {[
            { label: '🔥 عالي الأولوية', val: highCount, color: '#C2410C' },
            { label: '🆕 جديدة', val: newCount, color: '#B8860B' },
            { label: '📊 إجمالي', val: stats.length, color: '#1F5F3F' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff',
              padding: 18,
              borderRadius: 12,
              border: '1px solid #eee',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { value: 'new', label: '🆕 جديدة' },
            { value: 'all', label: '🔍 الكل' },
            { value: 'reviewed', label: '✅ تمت المراجعة' },
            { value: 'acted_on', label: '✨ تم التنفيذ' },
          ].map(f => (
            <a
              key={f.value}
              href={`?filter=${f.value}${agentFilter !== 'all' ? `&agent=${agentFilter}` : ''}`}
              style={{
                background: filter === f.value ? '#1F5F3F' : '#fff',
                color: filter === f.value ? '#FAF7F0' : '#1F5F3F',
                padding: '6px 14px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 'bold',
                border: '1px solid #1F5F3F',
              }}
            >
              {f.label}
            </a>
          ))}
        </div>

        {/* Agent filter */}
        {agentCounts.size > 0 && (
          <div style={{ marginBottom: 20, fontSize: 12 }}>
            <span style={{ color: '#666', marginLeft: 8 }}>فلتر بالـ agent:</span>
            <a href={`?filter=${filter}`} style={{
              padding: '4px 10px',
              background: agentFilter === 'all' ? '#1F5F3F' : '#fff',
              color: agentFilter === 'all' ? '#FAF7F0' : '#1F5F3F',
              borderRadius: 6,
              textDecoration: 'none',
              marginLeft: 6,
              border: '1px solid #1F5F3F',
            }}>الكل</a>
            {Array.from(agentCounts.entries()).map(([name, count]) => (
              <a key={name} href={`?filter=${filter}&agent=${name}`} style={{
                padding: '4px 10px',
                background: agentFilter === name ? '#1F5F3F' : '#fff',
                color: agentFilter === name ? '#FAF7F0' : '#666',
                borderRadius: 6,
                textDecoration: 'none',
                marginLeft: 6,
                border: '1px solid #ddd',
                fontSize: 11,
                display: 'inline-block',
                marginBottom: 4,
              }}>{name} ({count})</a>
            ))}
          </div>
        )}

        {/* Insights list */}
        <div style={{ display: 'grid', gap: 12 }}>
          {insights.length === 0 ? (
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 60,
              textAlign: 'center',
              color: '#999',
              border: '1px solid #eee',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ margin: 0 }}>مفيش insights مطابقة للفلتر</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                الـ AI agents بيكتبوا insights كل يوم — ارجع بكرة!
              </p>
            </div>
          ) : (
            insights.map(insight => {
              const priority = PRIORITY_COLORS[insight.priority] ?? PRIORITY_COLORS.low
              const icon = TYPE_ICONS[insight.insight_type] ?? '💡'
              return (
                <div key={insight.id} style={{
                  background: '#fff',
                  padding: 16,
                  borderRadius: 12,
                  border: `1px solid #eee`,
                  borderRight: `4px solid ${priority.fg}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{icon}</span>
                      <div>
                        <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 15 }}>
                          {insight.title}
                        </h3>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                          {insight.agent_name} · {timeAgo(insight.created_at)}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      background: priority.bg,
                      color: priority.fg,
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      height: 'fit-content',
                    }}>
                      {priority.label}
                    </span>
                  </div>
                  <p style={{ margin: '8px 0', fontSize: 13, color: '#444', lineHeight: 1.7 }}>
                    {insight.description}
                  </p>
                  {insight.recommended_action && (
                    <div style={{
                      background: '#FAF7F0',
                      padding: 10,
                      borderRadius: 8,
                      marginTop: 10,
                      fontSize: 12,
                      color: '#1F5F3F',
                    }}>
                      <strong>👉 الإجراء المقترح:</strong> {insight.recommended_action}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#999' }}>
          الـ insights بتتحدث يومياً من الـ AI agents
        </div>
      </div>
    </div>
  )
}
