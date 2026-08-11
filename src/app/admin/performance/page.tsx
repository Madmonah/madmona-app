// src/app/admin/performance/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Metric {
  agent_name: string
  period: string
  total_runs: number
  success_count: number
  error_count: number
  success_rate: number
  avg_duration_ms: number
  outputs_approved: number
  outputs_dismissed: number
  outputs_actioned: number
  approval_rate: number
  top_error_message: string | null
  top_error_count: number
  computed_at: string
}

interface Improvement {
  id: string
  target_agent: string
  weakness_identified: string
  proposed_change_type: string
  proposed_change_summary: string
  expected_impact: string
  confidence: string
  status: string
  created_at: string
}

export default async function PerformancePage() {
  // Trigger fresh computation
  await supabaseAdmin.rpc('compute_all_agent_performance')

  const [{ data: metricsData }, { data: improvementsData }] = await Promise.all([
    supabaseAdmin
      .from('agent_performance_metrics').select('*')
      .eq('period', 'last_7d')
      .order('total_runs', { ascending: false }),
    supabaseAdmin
      .from('agent_improvements').select('*')
      .order('created_at', { ascending: false }).limit(10),
  ])

  const metrics = ((metricsData ?? []) as Metric[]).filter(m => m.total_runs > 0)
  const improvements = (improvementsData ?? []) as Improvement[]

  const totalRuns = metrics.reduce((s, m) => s + m.total_runs, 0)
  const totalSuccess = metrics.reduce((s, m) => s + m.success_count, 0)
  const totalErrors = metrics.reduce((s, m) => s + m.error_count, 0)
  const overallSuccessRate = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#FA8125', margin: 0, fontSize: 26 }}>📊 AI Performance</h1>
          <a href="/admin/ai-os" style={{ color: '#FA8125', fontSize: 13 }}>← AI OS</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'إجمالي runs', val: totalRuns, color: '#FA8125' },
            { label: 'success rate', val: `${overallSuccessRate}%`, color: overallSuccessRate >= 80 ? '#28a745' : '#6FCF97' },
            { label: 'أخطاء', val: totalErrors, color: '#6FCF97' },
            { label: 'agents نشطة', val: metrics.length, color: '#2FA084' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', padding: 18, borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {improvements.filter(i => i.status === 'proposed').length > 0 && (
          <div style={{
            background: '#fff3cd', color: '#856404',
            padding: 14, borderRadius: 8, marginBottom: 16,
            border: '1px solid #ffeaa7',
          }}>
            🔧 <strong>{improvements.filter(i => i.status === 'proposed').length} تحسين مقترح</strong> من Prompt Optimizer
          </div>
        )}

        <h2 style={{ color: '#FA8125', fontSize: 18, marginBottom: 12 }}>📈 أداء آخر 7 أيام</h2>
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FA8125', color: '#FAF7F0' }}>
                <th style={{ padding: 12, textAlign: 'right' }}>Agent</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Runs</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Success%</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Avg time</th>
                <th style={{ padding: 12, textAlign: 'right' }}>أخطاء متكررة</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={m.agent_name} style={{
                  borderBottom: '1px solid #eee',
                  background: i % 2 === 0 ? '#fff' : '#FAF7F0',
                }}>
                  <td style={{ padding: 10, fontWeight: 'bold' }}>{m.agent_name}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{m.total_runs}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    <span style={{
                      background: m.success_rate >= 90 ? '#d4edda' : m.success_rate >= 70 ? '#fff3cd' : '#f8d7da',
                      color: m.success_rate >= 90 ? '#155724' : m.success_rate >= 70 ? '#856404' : '#721c24',
                      padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 'bold',
                    }}>
                      {m.success_rate}%
                    </span>
                  </td>
                  <td style={{ padding: 10, textAlign: 'center', color: '#666' }}>
                    {Math.round((m.avg_duration_ms || 0) / 1000)}s
                  </td>
                  <td style={{ padding: 10, fontSize: 11, color: '#6FCF97' }}>
                    {m.top_error_message ? `${m.top_error_message.slice(0, 60)}... (${m.top_error_count}×)` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {improvements.length > 0 && (
          <>
            <h2 style={{ color: '#FA8125', fontSize: 18, marginBottom: 12 }}>
              🔧 تحسينات مقترحة ({improvements.length})
            </h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {improvements.map(imp => (
                <div key={imp.id} style={{
                  background: '#fff', padding: 16, borderRadius: 12,
                  borderRight: `4px solid ${
                    imp.confidence === 'high' ? '#28a745' :
                    imp.confidence === 'medium' ? '#2FA084' : '#666'
                  }`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, color: '#FA8125', fontSize: 15 }}>
                      🎯 {imp.target_agent}
                    </h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: '#FAF7F0', padding: '2px 8px', borderRadius: 4, fontSize: 10 }}>
                        {imp.proposed_change_type}
                      </span>
                      <span style={{
                        background: imp.confidence === 'high' ? '#d4edda' : '#fff3cd',
                        color: imp.confidence === 'high' ? '#155724' : '#856404',
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold',
                      }}>
                        {imp.confidence}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: '#666', margin: '8px 0' }}>
                    <strong>⚠️ الضعف:</strong> {imp.weakness_identified}
                  </p>

                  <div style={{ background: '#FAF7F0', padding: 10, borderRadius: 6, fontSize: 12, color: '#FA8125' }}>
                    <strong>💡 الحل:</strong> {imp.proposed_change_summary}
                  </div>

                  <p style={{ marginTop: 8, fontSize: 11, color: '#28a745' }}>
                    📈 {imp.expected_impact}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {improvements.length === 0 && metrics.length > 0 && (
          <div style={{ background: '#fff', padding: 30, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 36 }}>✅</div>
            <p>كل الـ agents شغّالة كويس — مفيش تحسينات مقترحة</p>
            <p style={{ fontSize: 12 }}>شغّل الـ prompt-optimizer من /admin/ai-os لتحليل الـ agents الضعيفة</p>
          </div>
        )}
      </div>
    </div>
  )
}
