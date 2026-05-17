// src/app/admin/workflows/page.tsx
// Agent Workflows viewer — orchestrated multi-step workflows (in-progress + done).
// Added May 16 2026 as part of Task 3.

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Workflow = {
  id: string
  workflow_name: string
  goal: string | null
  steps: any
  current_step: number | null
  status: string
  step_results: any
  triggered_by: string | null
  triggered_by_event: string | null
  final_output: any
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  let q = supabaseAdmin.from('agent_workflows').select('*').order('created_at', { ascending: false })
  if (searchParams.status) q = q.eq('status', searchParams.status)
  const { data } = await q.limit(50)
  const flows = (data ?? []) as Workflow[]

  return (
    <div dir="rtl" style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ color: '#1F6F5F', margin: 0, fontSize: 26 }}>🌊 Agent Workflows</h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: 13 }}>
            {flows.length} workflow · orchestrated multi-step tasks
          </p>
        </header>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="/admin/workflows" style={!searchParams.status ? chipActiveStyle : chipStyle}>الكل</a>
          <a href="/admin/workflows?status=in_progress" style={searchParams.status === 'in_progress' ? chipActiveStyle : chipStyle}>⏳ in progress</a>
          <a href="/admin/workflows?status=completed" style={searchParams.status === 'completed' ? chipActiveStyle : chipStyle}>✓ completed</a>
          <a href="/admin/workflows?status=failed" style={searchParams.status === 'failed' ? chipActiveStyle : chipStyle}>✗ failed</a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flows.length === 0 && <div style={emptyStyle}>مفيش workflows</div>}
          {flows.map(w => {
            const totalSteps = Array.isArray(w.steps) ? w.steps.length : 0
            const progress = totalSteps && w.current_step != null ? Math.round((w.current_step / totalSteps) * 100) : 0
            return (
              <article key={w.id} style={{
                ...cardStyle,
                borderRight: `4px solid ${statusColor(w.status)}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, color: '#1F6F5F', fontSize: 14 }}>{w.workflow_name}</h3>
                    {w.goal && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#333' }}>{w.goal}</p>}
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {w.triggered_by && <span>triggered by: {w.triggered_by} · </span>}
                      <span>{new Date(w.created_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <span style={{ ...badge, background: statusColor(w.status) }}>{w.status}</span>
                </div>

                {totalSteps > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                      step {w.current_step ?? 0} من {totalSteps}
                    </div>
                    <div style={{ height: 6, background: '#E5E5E0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', background: statusColor(w.status),
                        width: `${progress}%`, transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
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

function statusColor(s: string | null): string {
  switch (s) {
    case 'completed': return '#10B981'
    case 'in_progress': return '#0EA5E9'
    case 'failed': return '#DC2626'
    case 'pending': return '#2FA084'
    default: return '#888'
  }
}

function BackBtn() {
  return (
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      <a href="/admin/ai-os" style={{
        color: '#1F6F5F', textDecoration: 'none', fontSize: 13,
        padding: '8px 16px', background: '#fff', borderRadius: 8,
        border: '1px solid #1F6F5F', display: 'inline-block',
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
  color: '#1F6F5F', textDecoration: 'none',
}
const chipActiveStyle: React.CSSProperties = {
  ...chipStyle, background: '#1F6F5F', color: '#fff', borderColor: '#1F6F5F',
}
const badge: React.CSSProperties = {
  fontSize: 10, padding: '3px 8px', borderRadius: 12,
  color: '#fff', flexShrink: 0,
}
const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: 40, color: '#888',
  background: '#fff', borderRadius: 10, border: '1px dashed #E5E5E0',
}
