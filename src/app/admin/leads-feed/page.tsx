// src/app/admin/leads-feed/page.tsx
// Live feed of leads from landing page + AI scoring

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Lead {
  id: string
  source: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  interested_category: string | null
  intent: string | null
  lead_score: number
  notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `${m}د`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}س`
  return `${Math.floor(h / 24)}ي`
}

function priorityColor(score: number): string {
  if (score >= 70) return '#6FCF97'
  if (score >= 40) return '#2FA084'
  return '#999'
}

function priorityLabel(score: number): string {
  if (score >= 70) return '🔥 عالي'
  if (score >= 40) return '⚡ متوسط'
  return '🌱 منخفض'
}

export default async function LeadsFeed() {
  const { data: leadsRaw } = await supabaseAdmin
    .from('sales_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const leads = (leadsRaw ?? []) as Lead[]

  // Stats
  const total = leads.length
  const highPriority = leads.filter(l => l.lead_score >= 70).length
  const today = leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0',
      minHeight: '100vh',
      padding: '24px',
      color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: '#FA8125', margin: 0, fontSize: 26 }}>🎯 Leads Feed</h1>
            <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>كل الـ leads جاية من الـ landing page</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href="/admin/agents" style={{ color: '#FA8125', fontSize: 13 }}>← الفريق</a>
            <a href="/admin/activity" style={{ color: '#FA8125', fontSize: 13 }}>← النشاط</a>
          </div>
        </div>

        <meta httpEquiv="refresh" content="30" />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'إجمالي الـ Leads', val: total, color: '#FA8125' },
            { label: 'النهارده', val: today, color: '#2FA084' },
            { label: '🔥 عالي النية', val: highPriority, color: '#6FCF97' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #eee' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Leads List */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #eee' }}>
          {leads.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p>لسه مفيش leads</p>
              <p style={{ fontSize: 12 }}>افتح الـ Meta Ads ووجّه الزوار على:</p>
              <code style={{ background: '#f0f0f0', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>
                madmonacairo.com/ad-landing
              </code>
            </div>
          ) : (
            leads.map((lead, idx) => (
              <div key={lead.id} style={{
                padding: '16px 20px',
                borderBottom: idx < leads.length - 1 ? '1px solid #f0f0f0' : 'none',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'flex-start',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 4 }}>
                    <strong style={{ color: '#FA8125', fontSize: 16 }}>{lead.contact_name ?? 'مجهول'}</strong>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: priorityColor(lead.lead_score) + '20',
                      color: priorityColor(lead.lead_score),
                      fontWeight: 'bold',
                    }}>
                      {priorityLabel(lead.lead_score)} ({lead.lead_score})
                    </span>
                    <span style={{ fontSize: 11, color: '#999' }}>{formatTime(lead.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                    {lead.interested_category && <span>📦 {lead.interested_category}</span>}
                    {lead.contact_phone && (
                      <span style={{ marginRight: 12 }} dir="ltr">
                        📞 +{lead.contact_phone}
                      </span>
                    )}
                  </div>
                  {lead.notes && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' }}>
                      {lead.notes.slice(0, 200)}
                    </div>
                  )}
                  {lead.metadata?.utm_source && (
                    <div style={{ fontSize: 10, color: '#999', marginTop: 4, fontFamily: 'monospace' }}>
                      from: {String(lead.metadata.utm_source)} / {String(lead.metadata.utm_campaign ?? '')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lead.contact_phone && (
                    <a
                      href={`https://wa.me/${lead.contact_phone}`}
                      target="_blank"
                      rel="noopener"
                      style={{
                        background: '#25D366',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: 8,
                        textDecoration: 'none',
                        fontSize: 12,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📱 واتساب
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#999' }}>
          الصفحة تعمل refresh كل 30 ثانية
        </div>
      </div>
    </div>
  )
}
