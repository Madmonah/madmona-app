// src/app/admin/agent-runs/page.tsx
// Agent Runs viewer — execution history across all 50 agents.
// Added May 16 2026 as part of admin dashboard redesign.

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Run = {
  id: string
  agent_name: string
  status: string
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  error_message: string | null
  trigger_type: string | null
}

export default async function AgentRunsPage({
  searchParams,
}: {
  searchParams: { status?: string; agent?: string }
}) {
  let query = supabaseAdmin
    .from('agent_runs')
    .select('*')
    .order('started_at', { ascending: false })

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.agent) query = query.eq('agent_name', searchParams.agent)

  const { data } = await query.limit(100)
  const runs = (data ?? []) as Run[]

  // Status counts
  const { count: totalCount } = await supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true })
  const { count: errorCount } = await supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true }).eq('status', 'error')
  const { count: pendingCount } = await supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  const { count: successCount } = await supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true }).eq('status', 'success')

  return (
    <div dir="rtl" style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ color: '#FA8125', margin: 0, fontSize: 26 }}>🔁 Agent Runs</h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: 13 }}>
            {totalCount ?? 0} run · {successCount ?? 0} success · {errorCount ?? 0} error · {pendingCount ?? 0} pending
          </p>
        </header>

        {/* Status filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="/admin/agent-runs" style={!searchParams.status ? chipActiveStyle : chipStyle}>الكل</a>
          <a href="/admin/agent-runs?status=success" style={searchParams.status === 'success' ? chipActiveStyle : chipStyle}>✓ Success</a>
          <a href="/admin/agent-runs?status=error" style={searchParams.status === 'error' ? chipActiveStyle : chipStyle}>✗ Error</a>
          <a href="/admin/agent-runs?status=pending" style={searchParams.status === 'pending' ? chipActiveStyle : chipStyle}>⏳ Pending</a>
        </div>

        {/* Runs table */}
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 10, border: '1px solid #E5E5E0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ background: '#fafaf7' }}>
              <tr>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Started</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Trigger</th>
                <th style={thStyle}>Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                    مفيش runs مطابقة
                  </td>
                </tr>
              )}
              {runs.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #E5E5E0' }}>
                  <td style={tdStyle}>
                    <a href={`/admin/agent-runs?agent=${r.agent_name}`} style={{ color: '#FA8125', textDecoration: 'none' }}>
                      {r.agent_name}
                    </a>
                  </td>
                  <td style={tdStyle}><span style={statusBadgeStyle(r.status)}>{r.status}</span></td>
                  <td style={tdStyle}>{new Date(r.started_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</td>
                  <td style={tdStyle}>{r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                  <td style={tdStyle}>{r.trigger_type || '—'}</td>
                  <td style={{ ...tdStyle, color: '#DC2626', maxWidth: 280, fontSize: 11 }}>
                    {r.error_message ? r.error_message.slice(0, 100) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ textAlign: 'center', color: '#888', fontSize: 11, marginTop: 12 }}>
          آخر 100 run · pagination قادم في تحديث لاحق
        </p>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a href="/admin/ai-os" style={{
            color: '#FA8125', textDecoration: 'none', fontSize: 13,
            padding: '8px 16px', background: '#fff', borderRadius: 8,
            border: '1px solid #FA8125', display: 'inline-block',
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
const thStyle: React.CSSProperties = {
  padding: 10, textAlign: 'right', fontWeight: 600, color: '#FA8125',
  borderBottom: '1px solid #E5E5E0',
}
const tdStyle: React.CSSProperties = {
  padding: 10, color: '#333',
}
const chipStyle: React.CSSProperties = {
  fontSize: 12, padding: '6px 12px', background: '#fff',
  borderRadius: 20, border: '1px solid #E5E5E0',
  color: '#FA8125', textDecoration: 'none',
}
const chipActiveStyle: React.CSSProperties = {
  ...chipStyle, background: '#FA8125', color: '#fff', borderColor: '#FA8125',
}
function statusBadgeStyle(status: string): React.CSSProperties {
  const colors: Record<string, string> = {
    success: '#10B981', error: '#DC2626', pending: '#2FA084', running: '#0EA5E9',
  }
  return {
    fontSize: 10, padding: '3px 8px', borderRadius: 12,
    background: colors[status] ?? '#888', color: '#fff', display: 'inline-block',
  }
}
