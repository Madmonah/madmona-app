// src/app/admin/prompt-versions/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'
import PromptVersionActions from './PromptVersionActions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Version {
  id: string
  agent_name: string
  version: number
  prompt_text: string
  prev_version: number | null
  changes_summary: string | null
  hypothesis: string | null
  is_active: boolean
  created_at: string
}

export default async function PromptVersionsPage() {
  const { data } = await supabaseAdmin
    .from('prompt_versions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  const versions = (data ?? []) as Version[]

  // Group by agent
  const byAgent = new Map<string, Version[]>()
  for (const v of versions) {
    if (!byAgent.has(v.agent_name)) byAgent.set(v.agent_name, [])
    byAgent.get(v.agent_name)!.push(v)
  }

  const pendingCount = versions.filter(v => !v.is_active).length

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#FA8125', margin: 0, fontSize: 26 }}>🧠 Prompt Versions</h1>
          <a href="/admin/performance" style={{ color: '#FA8125', fontSize: 13 }}>← Performance</a>
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          {versions.length} نسخة prompt من Prompt Optimizer · {pendingCount} في انتظار المراجعة
        </p>

        {versions.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>🧠</div>
            <p>لسه مفيش تحسينات مقترحة</p>
            <p style={{ fontSize: 12 }}>شغّل الـ prompt-optimizer من /admin/ai-os</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {Array.from(byAgent.entries()).map(([agent, vs]) => (
              <div key={agent} style={{
                background: '#fff', padding: 20, borderRadius: 12,
                border: '1px solid #eee',
              }}>
                <h2 style={{ margin: 0, color: '#FA8125', fontSize: 18, marginBottom: 12 }}>
                  🎯 {agent} ({vs.length} versions)
                </h2>

                <div style={{ display: 'grid', gap: 10 }}>
                  {vs.map(v => (
                    <div key={v.id} style={{
                      background: v.is_active ? '#d4edda' : '#FAF7F0',
                      padding: 14, borderRadius: 8,
                      border: v.is_active ? '2px solid #28a745' : '1px solid #ddd',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong style={{ color: '#FA8125' }}>
                          v{v.version} {v.is_active ? '✅ Active' : '⏳ Pending'}
                        </strong>
                        <span style={{ fontSize: 11, color: '#666' }}>
                          {new Date(v.created_at).toLocaleString('ar-EG')}
                        </span>
                      </div>

                      {v.hypothesis && (
                        <details style={{ marginBottom: 8 }}>
                          <summary style={{ cursor: 'pointer', color: '#0EA5E9', fontWeight: 'bold', fontSize: 13 }}>
                            💡 الفرضية
                          </summary>
                          <div style={{
                            background: '#fff', padding: 10, borderRadius: 6,
                            marginTop: 6, fontSize: 13, lineHeight: 1.7,
                          }}>
                            {v.hypothesis}
                          </div>
                        </details>
                      )}

                      {v.changes_summary && (
                        <details style={{ marginBottom: 8 }}>
                          <summary style={{ cursor: 'pointer', color: '#FA8125', fontWeight: 'bold', fontSize: 13 }}>
                            🔧 التغييرات
                          </summary>
                          <div style={{
                            background: '#fff', padding: 10, borderRadius: 6,
                            marginTop: 6, fontSize: 12, whiteSpace: 'pre-wrap',
                          }}>
                            {v.changes_summary}
                          </div>
                        </details>
                      )}

                      <details style={{ marginBottom: 8 }}>
                        <summary style={{ cursor: 'pointer', color: '#666', fontWeight: 'bold', fontSize: 13 }}>
                          📜 الـ Prompt الكامل ({v.prompt_text.length} حرف)
                        </summary>
                        <pre style={{
                          background: '#FA8125', color: '#FAF7F0',
                          padding: 12, borderRadius: 6, marginTop: 6,
                          fontSize: 11, overflow: 'auto', maxHeight: 300,
                          whiteSpace: 'pre-wrap', fontFamily: 'monospace',
                        }}>
                          {v.prompt_text}
                        </pre>
                      </details>

                      {!v.is_active && (
                        <PromptVersionActions versionId={v.id} agentName={v.agent_name} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
