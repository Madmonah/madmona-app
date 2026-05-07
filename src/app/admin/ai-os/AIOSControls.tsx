'use client'

// src/app/admin/ai-os/AIOSControls.tsx
// Interactive controls for AI OS — toggle and manual trigger

import { useState } from 'react'

interface Agent {
  agent_name: string
  team: string
  display_name: string | null
  description: string | null
  enabled: boolean
  schedule_cron: string | null
  last_run_at: string | null
  run_count: number
  success_count: number
  error_count: number
}

interface TeamMeta {
  label: string
  color: string
}

interface Props {
  agentsByTeam: Record<string, Agent[]>
  teams: Record<string, TeamMeta>
}

export default function AIOSControls({ agentsByTeam, teams }: Props) {
  const [adminPw, setAdminPw] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('madmona_admin_pw') ?? ''
    }
    return ''
  })
  const [agents, setAgents] = useState<Record<string, Agent[]>>(agentsByTeam)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<Record<string, { type: 'success' | 'error'; msg: string }>>({})

  const showFeedback = (agentName: string, type: 'success' | 'error', msg: string) => {
    setFeedback(prev => ({ ...prev, [agentName]: { type, msg } }))
    setTimeout(() => {
      setFeedback(prev => {
        const next = { ...prev }
        delete next[agentName]
        return next
      })
    }, 3000)
  }

  const toggleAgent = async (agentName: string, currentEnabled: boolean) => {
    if (!adminPw) {
      const pw = prompt('كلمة سر الـ admin:')
      if (!pw) return
      setAdminPw(pw)
      sessionStorage.setItem('madmona_admin_pw', pw)
    }

    setLoading(prev => ({ ...prev, [agentName]: true }))
    try {
      const res = await fetch('/api/admin/agent-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pw': adminPw || sessionStorage.getItem('madmona_admin_pw') || '',
        },
        body: JSON.stringify({ agent_name: agentName, enabled: !currentEnabled }),
      })
      const data = await res.json()
      if (!res.ok) {
        showFeedback(agentName, 'error', data.error ?? 'فشل')
        return
      }
      setAgents(prev => {
        const next: Record<string, Agent[]> = {}
        for (const [team, list] of Object.entries(prev)) {
          next[team] = list.map(a =>
            a.agent_name === agentName ? { ...a, enabled: !currentEnabled } : a
          )
        }
        return next
      })
      showFeedback(agentName, 'success', !currentEnabled ? 'مفعّل ✓' : 'موقوف')
    } catch {
      showFeedback(agentName, 'error', 'خطأ في الاتصال')
    } finally {
      setLoading(prev => ({ ...prev, [agentName]: false }))
    }
  }

  const triggerAgent = async (agentName: string) => {
    if (!adminPw) {
      const pw = prompt('كلمة سر الـ admin:')
      if (!pw) return
      setAdminPw(pw)
      sessionStorage.setItem('madmona_admin_pw', pw)
    }

    setLoading(prev => ({ ...prev, [agentName]: true }))
    try {
      const res = await fetch('/api/admin/agent-toggle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pw': adminPw || sessionStorage.getItem('madmona_admin_pw') || '',
        },
        body: JSON.stringify({ agent_name: agentName }),
      })
      const data = await res.json()
      if (!res.ok) {
        showFeedback(agentName, 'error', data.error ?? 'فشل')
        return
      }
      showFeedback(agentName, 'success', 'في الطابور 🚀')
    } catch {
      showFeedback(agentName, 'error', 'خطأ في الاتصال')
    } finally {
      setLoading(prev => ({ ...prev, [agentName]: false }))
    }
  }

  return (
    <div>
      {Object.entries(agents).map(([team, members]) => {
        const teamMeta = teams[team] ?? { label: team, color: '#666' }
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
                const isLoading = loading[agent.agent_name]
                const fb = feedback[agent.agent_name]
                return (
                  <div key={agent.agent_name} style={{
                    background: '#fff',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #eee',
                    borderRight: `4px solid ${agent.enabled ? teamMeta.color : '#ccc'}`,
                    opacity: isLoading ? 0.6 : 1,
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
                      <button
                        onClick={() => toggleAgent(agent.agent_name, agent.enabled)}
                        disabled={isLoading}
                        style={{
                          fontSize: 10,
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: 'none',
                          cursor: isLoading ? 'wait' : 'pointer',
                          background: agent.enabled ? '#d4edda' : '#f0f0f0',
                          color: agent.enabled ? '#155724' : '#666',
                        }}
                      >
                        {agent.enabled ? 'نشط ✓' : 'موقوف'}
                      </button>
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
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => triggerAgent(agent.agent_name)}
                        disabled={isLoading || !agent.enabled}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: isLoading || !agent.enabled ? 'not-allowed' : 'pointer',
                          background: agent.enabled ? '#1F5F3F' : '#ccc',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}
                      >
                        {isLoading ? '...' : '🚀 شغّله دلوقتي'}
                      </button>
                    </div>

                    {fb && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 4,
                        fontSize: 11,
                        background: fb.type === 'success' ? '#d4edda' : '#f8d7da',
                        color: fb.type === 'success' ? '#155724' : '#721c24',
                      }}>
                        {fb.msg}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
