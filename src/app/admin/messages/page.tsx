// src/app/admin/messages/page.tsx
// Agent-to-agent message log — shows context being shared between agents.
// Added May 16 2026 as part of Task 3 (agent reconnection).

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AgentMessage = {
  id: string
  from_agent: string
  to_agent: string
  message_type: string | null
  subject: string | null
  payload: any
  thread_id: string | null
  status: string | null
  priority: string | null
  response_required: boolean
  response_received: boolean
  created_at: string
  processed_at: string | null
}

export default async function AgentMessagesPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; status?: string }
}) {
  let q = supabaseAdmin.from('agent_messages').select('*').order('created_at', { ascending: false })
  if (searchParams.from) q = q.eq('from_agent', searchParams.from)
  if (searchParams.to) q = q.eq('to_agent', searchParams.to)
  if (searchParams.status) q = q.eq('status', searchParams.status)
  const { data } = await q.limit(100)
  const msgs = (data ?? []) as AgentMessage[]

  return (
    <div dir="rtl" style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ color: '#2B4521', margin: 0, fontSize: 26 }}>💬 Agent Messages</h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: 13 }}>
            {msgs.length} message · context shared بين الأجينتس
          </p>
        </header>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="/admin/messages" style={!searchParams.status ? chipActiveStyle : chipStyle}>الكل</a>
          <a href="/admin/messages?status=pending" style={searchParams.status === 'pending' ? chipActiveStyle : chipStyle}>pending</a>
          <a href="/admin/messages?status=processed" style={searchParams.status === 'processed' ? chipActiveStyle : chipStyle}>processed</a>
          <a href="/admin/messages?status=error" style={searchParams.status === 'error' ? chipActiveStyle : chipStyle}>error</a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.length === 0 && <div style={emptyStyle}>مفيش messages</div>}
          {msgs.map(m => (
            <article key={m.id} style={{
              ...cardStyle,
              borderRight: `4px solid ${statusColor(m.status)}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#2B4521', fontWeight: 600 }}>
                    <a href={`/admin/messages?from=${m.from_agent}`} style={linkStyle}>{m.from_agent}</a>
                    <span style={{ color: '#888', margin: '0 6px' }}>→</span>
                    <a href={`/admin/messages?to=${m.to_agent}`} style={linkStyle}>{m.to_agent}</a>
                  </div>
                  {m.subject && (
                    <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>{m.subject}</div>
                  )}
                  <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                    {m.message_type && <span>type: {m.message_type} · </span>}
                    {m.priority && <span>priority: {m.priority} · </span>}
                    <span>{new Date(m.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                  {m.status && <span style={{ ...badge, background: statusColor(m.status) }}>{m.status}</span>}
                  {m.response_required && (
                    <span style={{ ...badge, background: m.response_received ? '#10B981' : '#2FA084' }}>
                      {m.response_received ? '✓ replied' : '⏳ awaiting reply'}
                    </span>
                  )}
                </div>
              </div>
              {m.payload && (
                <pre style={{
                  margin: '8px 0 0', padding: 8, background: '#fafaf7',
                  borderRadius: 4, fontSize: 11, color: '#555',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  maxHeight: 120, overflow: 'auto',
                }}>{JSON.stringify(m.payload, null, 2).slice(0, 500)}</pre>
              )}
            </article>
          ))}
        </div>

        <BackBtn />
      </div>
    </div>
  )
}

function statusColor(s: string | null): string {
  switch (s) {
    case 'processed': return '#10B981'
    case 'pending': return '#2FA084'
    case 'error': return '#DC2626'
    default: return '#888'
  }
}

function BackBtn() {
  return (
    <div style={{ marginTop: 24, textAlign: 'center' }}>
      <a href="/admin/ai-os" style={{
        color: '#2B4521', textDecoration: 'none', fontSize: 13,
        padding: '8px 16px', background: '#fff', borderRadius: 8,
        border: '1px solid #2B4521', display: 'inline-block',
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
  color: '#2B4521', textDecoration: 'none',
}
const chipActiveStyle: React.CSSProperties = {
  ...chipStyle, background: '#2B4521', color: '#fff', borderColor: '#2B4521',
}
const badge: React.CSSProperties = {
  fontSize: 10, padding: '3px 8px', borderRadius: 12,
  color: '#fff',
}
const linkStyle: React.CSSProperties = {
  color: '#2B4521', textDecoration: 'none',
}
const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: 40, color: '#888',
  background: '#fff', borderRadius: 10, border: '1px dashed #E5E5E0',
}
