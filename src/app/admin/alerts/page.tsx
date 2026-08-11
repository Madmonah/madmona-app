// src/app/admin/alerts/page.tsx
// Admin Alerts viewer — operational notifications to admin.
// Added May 16 2026 as part of admin dashboard redesign.

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Alert = {
  id: string
  alert_type: string | null
  severity: string | null
  title: string
  summary: string | null
  detail: any
  action_url: string | null
  status: string | null
  agent_name: string | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
}

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams: { severity?: string; status?: string }
}) {
  let query = supabaseAdmin
    .from('admin_alerts')
    .select('*')
    .order('created_at', { ascending: false })

  if (searchParams.severity) query = query.eq('severity', searchParams.severity)
  if (searchParams.status) query = query.eq('status', searchParams.status)

  const { data } = await query.limit(100)
  const alerts = (data ?? []) as Alert[]

  const { count: totalCount } = await supabaseAdmin.from('admin_alerts').select('*', { count: 'exact', head: true })

  return (
    <div dir="rtl" style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ color: '#2B4521', margin: 0, fontSize: 26 }}>🔔 Admin Alerts</h1>
          <p style={{ color: '#666', marginTop: 6, fontSize: 13 }}>
            {totalCount ?? 0} alert · operational notifications
          </p>
        </header>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="/admin/alerts" style={!searchParams.status && !searchParams.severity ? chipActiveStyle : chipStyle}>الكل</a>
          <a href="/admin/alerts?status=open" style={searchParams.status === 'open' ? chipActiveStyle : chipStyle}>مفتوح</a>
          <a href="/admin/alerts?status=acknowledged" style={searchParams.status === 'acknowledged' ? chipActiveStyle : chipStyle}>acknowledged</a>
          <a href="/admin/alerts?status=resolved" style={searchParams.status === 'resolved' ? chipActiveStyle : chipStyle}>محلول</a>
          <a href="/admin/alerts?severity=critical" style={searchParams.severity === 'critical' ? chipActiveStyle : chipStyle}>🔴 critical</a>
          <a href="/admin/alerts?severity=high" style={searchParams.severity === 'high' ? chipActiveStyle : chipStyle}>🟠 high</a>
          <a href="/admin/alerts?severity=warning" style={searchParams.severity === 'warning' ? chipActiveStyle : chipStyle}>🟡 warning</a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.length === 0 && (
            <div style={emptyStyle}>مفيش alerts مطابقة</div>
          )}
          {alerts.map(a => (
            <article key={a.id} style={{
              ...cardStyle,
              borderRight: `4px solid ${severityColor(a.severity)}`,
              opacity: a.status === 'resolved' ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                <h3 style={{ margin: 0, color: '#2B4521', fontSize: 14 }}>{a.title}</h3>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {a.severity && <span style={{ ...badge, background: severityColor(a.severity) }}>{a.severity}</span>}
                  {a.status && <span style={{ ...badge, background: statusBg(a.status) }}>{a.status}</span>}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                {a.alert_type && <span>type: {a.alert_type} · </span>}
                {a.agent_name && <span>agent: {a.agent_name} · </span>}
                <span>{new Date(a.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
              </div>
              {a.summary && (
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#333' }}>{a.summary}</p>
              )}
              {a.action_url && (
                <div style={{ marginTop: 8 }}>
                  <a href={a.action_url} style={{
                    color: '#2B4521', fontSize: 12, textDecoration: 'none',
                    padding: '4px 10px', background: '#fafaf7', borderRadius: 6,
                    border: '1px solid #E5E5E0', display: 'inline-block',
                  }}>افتح ↗</a>
                </div>
              )}
            </article>
          ))}
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a href="/admin/ai-os" style={{
            color: '#2B4521', textDecoration: 'none', fontSize: 13,
            padding: '8px 16px', background: '#fff', borderRadius: 8,
            border: '1px solid #2B4521', display: 'inline-block',
          }}>← رجوع للداشبورد</a>
        </div>
      </div>
    </div>
  )
}

function severityColor(sev: string | null): string {
  switch (sev) {
    case 'critical': return '#DC2626'
    case 'high': return '#EA580C'
    case 'warning': return '#2FA084'
    case 'info': return '#0EA5E9'
    default: return '#888'
  }
}
function statusBg(status: string): string {
  switch (status) {
    case 'open': return '#DC2626'
    case 'acknowledged': return '#2FA084'
    case 'resolved': return '#10B981'
    default: return '#888'
  }
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
const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: 40, color: '#888',
  background: '#fff', borderRadius: 10, border: '1px dashed #E5E5E0',
}
