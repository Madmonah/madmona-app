// src/app/admin/collaborations/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'
import LaunchCollaboration from './LaunchCollaboration'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Collaboration {
  id: string
  collaboration_name: string
  goal: string
  participating_agents: string[]
  coordinator_agent: string
  status: string
  contributions: Record<string, unknown> | null
  final_output: Record<string, unknown> | null
  created_at: string
  completed_at: string | null
}

interface Message {
  id: string
  from_agent: string
  to_agent: string
  message_type: string
  subject: string
  status: string
  priority: string
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  active: '#0EA5E9', completed: '#28a745', failed: '#6FCF97', paused: '#666',
}

export default async function CollaborationsPage() {
  const [{ data: collabs }, { data: msgs }] = await Promise.all([
    supabaseAdmin
      .from('agent_collaborations').select('*')
      .order('created_at', { ascending: false }).limit(20),
    supabaseAdmin
      .from('agent_messages').select('id, from_agent, to_agent, message_type, subject, status, priority, created_at')
      .order('created_at', { ascending: false }).limit(20),
  ])

  const collaborations = (collabs ?? []) as Collaboration[]
  const messages = (msgs ?? []) as Message[]

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#FA8125', margin: 0, fontSize: 26 }}>🎯 Agent Collaborations</h1>
          <a href="/admin/ai-os" style={{ color: '#FA8125', fontSize: 13 }}>← AI OS</a>
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Orchestrator AI يدير تعاون الـ agents لتحقيق أهداف معقدة
        </p>

        <LaunchCollaboration />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Collaborations', val: collaborations.length, color: '#FA8125' },
            { label: 'Active', val: collaborations.filter(c => c.status === 'active').length, color: '#0EA5E9' },
            { label: 'Messages', val: messages.length, color: '#2FA084' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', padding: 18, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <h2 style={{ color: '#FA8125', fontSize: 18, marginBottom: 12 }}>🤝 Active Collaborations</h2>

        {collaborations.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>🎯</div>
            <p>لسه مفيش collaborations</p>
            <p style={{ fontSize: 12 }}>اطلق collaboration جديدة من فوق</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
            {collaborations.map(c => (
              <div key={c.id} style={{
                background: '#fff', padding: 16, borderRadius: 12,
                borderRight: `4px solid ${STATUS_COLOR[c.status] ?? '#666'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{ margin: 0, color: '#FA8125', fontSize: 15 }}>
                    🎯 {c.collaboration_name}
                  </h3>
                  <span style={{
                    background: STATUS_COLOR[c.status] ?? '#666', color: '#fff',
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 'bold',
                  }}>
                    {c.status.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#666', margin: '8px 0' }}>{c.goal}</p>
                <div style={{ fontSize: 12, color: '#FA8125' }}>
                  <strong>Agents:</strong> {(c.participating_agents ?? []).join(' · ')}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                  Coordinator: {c.coordinator_agent} · {new Date(c.created_at).toLocaleString('ar-EG')}
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ color: '#FA8125', fontSize: 18, marginBottom: 12 }}>📬 Recent Messages</h2>

        {messages.length === 0 ? (
          <div style={{ background: '#fff', padding: 30, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <p>مفيش messages بين الـ agents</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#FA8125', color: '#FAF7F0' }}>
                  <th style={{ padding: 10, textAlign: 'right' }}>From → To</th>
                  <th style={{ padding: 10, textAlign: 'right' }}>Subject</th>
                  <th style={{ padding: 10, textAlign: 'center' }}>Type</th>
                  <th style={{ padding: 10, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: 10, textAlign: 'center' }}>وقت</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m, i) => (
                  <tr key={m.id} style={{
                    borderBottom: '1px solid #eee',
                    background: i % 2 === 0 ? '#fff' : '#FAF7F0',
                  }}>
                    <td style={{ padding: 8, fontSize: 11 }}>
                      <strong>{m.from_agent}</strong> → {m.to_agent}
                    </td>
                    <td style={{ padding: 8 }}>{m.subject.slice(0, 50)}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <span style={{
                        background: '#FAF7F0', padding: '2px 6px',
                        borderRadius: 4, fontSize: 10,
                      }}>
                        {m.message_type}
                      </span>
                    </td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <span style={{
                        background: m.status === 'completed' ? '#d4edda' :
                          m.status === 'pending' ? '#fff3cd' : '#f8d7da',
                        padding: '2px 6px', borderRadius: 4, fontSize: 10,
                      }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: 8, textAlign: 'center', fontSize: 10, color: '#999' }}>
                      {new Date(m.created_at).toLocaleTimeString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
