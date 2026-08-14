// src/app/admin/agents/page.tsx
// Admin Dashboard — Agent monitoring page
// Shows all 20 agents, their status, recent runs, and key metrics

import { supabase as supabaseAdmin } from '@/lib/supabase'
import type { CSSProperties } from 'react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AgentRow {
  agent_name: string
  team: string
  display_name: string
  description: string | null
  enabled: boolean
  schedule_cron: string | null
  last_run_at: string | null
  next_run_at: string | null
  run_count: number
  success_count: number
  error_count: number
}

interface RecentRunRow {
  id: string
  agent_name: string
  status: string
  duration_ms: number | null
  started_at: string
  output_summary: Record<string, unknown> | null
  error_message: string | null
}

async function getDashboardData(): Promise<{
  agents: AgentRow[]
  recentRuns: RecentRunRow[]
  todayKpis: Record<string, unknown> | null
}> {
  const [agentsRes, runsRes, kpiRes] = await Promise.all([
    supabaseAdmin.from('agent_registry').select('*').order('team').order('agent_name'),
    supabaseAdmin.from('agent_runs').select('*').order('started_at', { ascending: false }).limit(20),
    supabaseAdmin.rpc('compute_daily_kpis'),
  ])

  return {
    agents: (agentsRes.data ?? []) as AgentRow[],
    recentRuns: (runsRes.data ?? []) as RecentRunRow[],
    todayKpis: (kpiRes.data ?? null) as Record<string, unknown> | null,
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `${mins}د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}س`
  return `${Math.floor(hrs / 24)}ي`
}

function statusBadgeStyle(status: string): CSSProperties {
  const base: CSSProperties = {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 'bold',
    display: 'inline-block',
  }
  if (status === 'success') return { ...base, background: '#d4edda', color: '#155724' }
  if (status === 'error') return { ...base, background: '#f8d7da', color: '#721c24' }
  if (status === 'started') return { ...base, background: '#fff3cd', color: '#856404' }
  return { ...base, background: '#e9ecef', color: '#495057' }
}

export default async function AgentsDashboard() {
  const { agents, recentRuns, todayKpis } = await getDashboardData()
  const salesAgents = agents.filter((a) => a.team === 'sales')
  const marketingAgents = agents.filter((a) => a.team === 'marketing')

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0',
      minHeight: '100vh',
      padding: '32px 24px',
      color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ color: '#059669', margin: 0, fontSize: 28 }}>🎯 فريق مضمونة الذكي</h1>
          <p style={{ color: '#666', marginTop: 8 }}>20 AI agent بيشتغلوا في فرق sales و marketing</p>
        </header>

        {todayKpis && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#059669', fontSize: 18 }}>📊 أرقام النهارده</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
              {[
                { label: 'تسجيلات', val: todayKpis.total_signups },
                { label: 'مؤجرين جداد', val: todayKpis.new_suppliers },
                { label: 'إعلانات جديدة', val: todayKpis.new_listings },
                { label: 'حجوزات', val: todayKpis.new_bookings },
                { label: 'قيمة (ج)', val: Number(todayKpis.bookings_value ?? 0).toLocaleString() },
                { label: 'رسائل WhatsApp', val: todayKpis.whatsapp_messages_sent },
                { label: 'ايميلات', val: todayKpis.emails_sent },
                { label: 'زوار', val: todayKpis.unique_visitors },
                { label: 'agent runs', val: todayKpis.agents_runs },
              ].map((k) => (
                <div key={k.label} style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #eee' }}>
                  <div style={{ fontSize: 22, fontWeight: 'bold', color: '#059669' }}>{String(k.val ?? 0)}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#059669', fontSize: 20, borderBottom: '2px solid #059669', paddingBottom: 8 }}>
            👔 فريق Sales ({salesAgents.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
            {salesAgents.map((a) => (
              <AgentCard key={a.agent_name} agent={a} />
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#059669', fontSize: 20, borderBottom: '2px solid #059669', paddingBottom: 8 }}>
            📢 فريق Marketing ({marketingAgents.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
            {marketingAgents.map((a) => (
              <AgentCard key={a.agent_name} agent={a} />
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ color: '#059669', fontSize: 20, borderBottom: '2px solid #059669', paddingBottom: 8 }}>
            ⚡ آخر 20 تشغيل
          </h2>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', overflow: 'hidden', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FAF7F0' }}>
                  <th style={{ padding: 12, textAlign: 'right' }}>Agent</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>الحالة</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>المدة</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>الوقت</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>تفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 10, fontWeight: 'bold' }}>{r.agent_name}</td>
                    <td style={{ padding: 10 }}>
                      <span style={statusBadgeStyle(r.status)}>{r.status}</span>
                    </td>
                    <td style={{ padding: 10 }}>{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                    <td style={{ padding: 10, color: '#666' }}>{formatTime(r.started_at)}</td>
                    <td style={{ padding: 10, color: '#666', fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.error_message ?? (r.output_summary ? JSON.stringify(r.output_summary).slice(0, 80) : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function AgentCard({ agent }: { agent: AgentRow }) {
  const successRate = agent.run_count > 0 ? Math.round((agent.success_count / agent.run_count) * 100) : 0
  const isHealthy = successRate >= 80 || agent.run_count === 0
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 16,
      border: '1px solid #eee',
      borderRight: `4px solid ${isHealthy ? '#059669' : '#6FCF97'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#059669' }}>{agent.display_name}</h3>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 12,
          background: agent.enabled ? '#d4edda' : '#e9ecef',
          color: agent.enabled ? '#155724' : '#495057',
        }}>
          {agent.enabled ? 'شغال' : 'متوقف'}
        </span>
      </div>
      <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>{agent.description}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 11 }}>
        <div>
          <div style={{ color: '#999' }}>تشغيلات</div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>{agent.run_count}</div>
        </div>
        <div>
          <div style={{ color: '#999' }}>نجاح</div>
          <div style={{ fontWeight: 'bold', fontSize: 14, color: successRate >= 80 ? '#059669' : '#6FCF97' }}>
            {successRate}%
          </div>
        </div>
        <div>
          <div style={{ color: '#999' }}>آخر تشغيل</div>
          <div style={{ fontWeight: 'bold' }}>{formatTime(agent.last_run_at)}</div>
        </div>
        <div>
          <div style={{ color: '#999' }}>الجاي</div>
          <div style={{ fontWeight: 'bold' }}>{formatTime(agent.next_run_at)}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: '#999', fontFamily: 'monospace' }}>
        {agent.schedule_cron ?? '—'}
      </div>
    </div>
  )
}
