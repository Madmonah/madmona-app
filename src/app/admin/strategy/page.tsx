// src/app/admin/strategy/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Play {
  id: string
  play_type: string | null
  title: string
  hypothesis: string | null
  expected_impact: string | null
  effort_level: string | null
  priority: string | null
  status: string
  steps: Array<Record<string, unknown>> | null
  success_metrics: Array<Record<string, unknown>> | null
  created_at: string
}

export default async function StrategyPage() {
  const { data: plays } = await supabaseAdmin
    .from('strategy_plays').select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false }).limit(20)
  const all = (plays ?? []) as Play[]

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#1F6F5F', margin: 0, fontSize: 26 }}>🧠 Strategy Plays</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <a href="/admin/ai-os" style={{ color: '#1F6F5F' }}>← AI OS</a>
            <a href="/admin/marketing-hq" style={{ color: '#1F6F5F' }}>← HQ</a>
          </div>
        </div>

        {all.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>🧠</div>
            <p>لسه مفيش strategy plays</p>
            <p style={{ fontSize: 12 }}>Strategy Agent بيكتب plays أسبوعياً</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {all.map(play => (
              <div key={play.id} style={{
                background: '#fff', padding: 20, borderRadius: 12,
                border: '1px solid #eee',
                borderRight: `4px solid ${play.priority === 'urgent' ? '#6FCF97' : play.priority === 'high' ? '#2FA084' : '#1F6F5F'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                  <h2 style={{ margin: 0, color: '#1F6F5F', fontSize: 18 }}>{play.title}</h2>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ background: '#FAF7F0', padding: '2px 8px', borderRadius: 4, fontSize: 10 }}>
                      {play.play_type ?? 'play'}
                    </span>
                    <span style={{
                      background: play.priority === 'urgent' ? '#fee' : '#fff3cd',
                      color: play.priority === 'urgent' ? '#6FCF97' : '#856404',
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                    }}>
                      {play.priority ?? 'medium'}
                    </span>
                  </div>
                </div>

                {play.hypothesis && (
                  <div style={{ background: '#FAF7F0', padding: 12, borderRadius: 6, margin: '8px 0', fontSize: 13 }}>
                    <strong>Hypothesis:</strong> {play.hypothesis}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666', marginTop: 8 }}>
                  {play.expected_impact && <span>📈 {play.expected_impact}</span>}
                  {play.effort_level && <span>⚙️ Effort: {play.effort_level}</span>}
                  <span>📊 Status: <strong>{play.status}</strong></span>
                </div>

                {play.steps && play.steps.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: 'pointer', color: '#1F6F5F', fontSize: 13 }}>
                      📋 Steps ({play.steps.length})
                    </summary>
                    <ol style={{ marginTop: 8, paddingRight: 20, fontSize: 12 }}>
                      {play.steps.map((s: Record<string, unknown>, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          <strong>{String(s.action ?? '')}</strong>
                          {s.timeline ? <em style={{ color: '#666' }}> · {String(s.timeline)}</em> : null}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
