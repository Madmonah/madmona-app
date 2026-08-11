// src/app/admin/fraud-alerts/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Alert {
  id: string
  alert_type: string
  target_type: string
  target_id: string
  severity: string
  confidence_score: number
  description: string
  evidence: Record<string, unknown> | null
  recommended_action: string
  status: string
  created_at: string
}

const SEV_COLOR: Record<string, { bg: string; fg: string; emoji: string }> = {
  critical: { bg: '#7c1d1d', fg: '#fff', emoji: '🚨' },
  high: { bg: '#6FCF97', fg: '#fff', emoji: '🔥' },
  medium: { bg: '#2FA084', fg: '#fff', emoji: '⚠️' },
  low: { bg: '#666', fg: '#fff', emoji: '👁️' },
}

export default async function FraudAlertsPage() {
  const { data } = await supabaseAdmin
    .from('fraud_alerts')
    .select('*')
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)
  const alerts = (data ?? []) as Alert[]

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#2B4521', margin: 0, fontSize: 26 }}>🚨 Fraud Alerts</h1>
          <a href="/admin/ai-os" style={{ color: '#2B4521', fontSize: 13 }}>← AI OS</a>
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          {alerts.length} alert من Fraud Detector AI
        </p>

        {alerts.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <p>مفيش alerts - المنصة آمنة</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {alerts.map(a => {
              const sev = SEV_COLOR[a.severity] ?? SEV_COLOR.low
              return (
                <div key={a.id} style={{
                  background: '#fff', padding: 16, borderRadius: 12,
                  borderRight: `4px solid ${sev.bg}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <span style={{
                        background: sev.bg, color: sev.fg,
                        padding: '4px 10px', borderRadius: 6,
                        fontSize: 11, fontWeight: 'bold', marginLeft: 8,
                      }}>
                        {sev.emoji} {a.severity.toUpperCase()}
                      </span>
                      <span style={{
                        background: '#FAF7F0', color: '#666',
                        padding: '4px 10px', borderRadius: 6, fontSize: 11,
                      }}>
                        {a.alert_type}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#999' }}>
                      {a.confidence_score}% ثقة
                    </span>
                  </div>

                  <h3 style={{ margin: '8px 0', color: '#2B4521', fontSize: 15 }}>
                    {a.description}
                  </h3>

                  {a.evidence && Object.keys(a.evidence).length > 0 && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', color: '#6FCF97', fontWeight: 'bold', fontSize: 12 }}>
                        📋 الأدلة
                      </summary>
                      <pre style={{
                        background: '#FAF7F0', padding: 10, borderRadius: 6,
                        marginTop: 6, fontSize: 11, overflow: 'auto',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {JSON.stringify(a.evidence, null, 2)}
                      </pre>
                    </details>
                  )}

                  <div style={{
                    background: '#2B4521', color: '#FAF7F0',
                    padding: 10, borderRadius: 6, marginTop: 10, fontSize: 12,
                  }}>
                    <strong>👉 الإجراء:</strong> {a.recommended_action}
                  </div>

                  <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                    Target: {a.target_type} · {new Date(a.created_at).toLocaleString('ar-EG')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
