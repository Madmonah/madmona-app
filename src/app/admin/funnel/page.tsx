// src/app/admin/funnel/page.tsx
// Conversion Funnel Dashboard
// Shows: ad clicks → landing visits → leads → high-priority leads → bookings
// Per campaign + per source. Critical for measuring ROI on Meta ads.

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface FunnelRow {
  campaign: string
  source: string
  visits: number
  leads: number
  high_priority_leads: number
  avg_score: number | null
  bookings: number
  total_revenue: number
}

async function getFunnelData(daysBack: number): Promise<FunnelRow[]> {
  const sinceIso = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  // Visits per campaign (from site_events)
  const { data: visitsRaw } = await supabaseAdmin
    .from('site_events')
    .select('utm_source, utm_campaign, session_id')
    .gte('created_at', sinceIso)
    .eq('event_type', 'page_view')

  type V = { utm_source: string | null; utm_campaign: string | null; session_id: string }
  const visits = (visitsRaw ?? []) as V[]

  // Leads per campaign (from sales_leads metadata)
  const { data: leadsRaw } = await supabaseAdmin
    .from('sales_leads')
    .select('lead_score, metadata, created_at')
    .gte('created_at', sinceIso)

  type L = { lead_score: number; metadata: Record<string, unknown> | null; created_at: string }
  const leads = (leadsRaw ?? []) as L[]

  // Bookings (linked through profile/phone if possible)
  const { data: bookingsRaw } = await supabaseAdmin
    .from('marketplace_bookings')
    .select('total_amount, created_at')
    .gte('created_at', sinceIso)

  type B = { total_amount: number; created_at: string }
  const bookings = (bookingsRaw ?? []) as B[]

  // Group by campaign+source
  const groups = new Map<string, FunnelRow>()

  const getKey = (source: string | null, campaign: string | null) =>
    `${source ?? 'direct'}::${campaign ?? 'organic'}`

  // Count unique sessions per campaign
  const sessionsByKey = new Map<string, Set<string>>()
  for (const v of visits) {
    const key = getKey(v.utm_source, v.utm_campaign)
    if (!sessionsByKey.has(key)) sessionsByKey.set(key, new Set())
    sessionsByKey.get(key)!.add(v.session_id)
  }

  for (const [key, sessions] of sessionsByKey.entries()) {
    const [source, campaign] = key.split('::')
    groups.set(key, {
      source, campaign,
      visits: sessions.size,
      leads: 0, high_priority_leads: 0, avg_score: null, bookings: 0, total_revenue: 0,
    })
  }

  // Add leads
  for (const l of leads) {
    const meta = l.metadata ?? {}
    const source = (meta.utm_source as string | null) ?? null
    const campaign = (meta.utm_campaign as string | null) ?? null
    const key = getKey(source, campaign)

    if (!groups.has(key)) {
      groups.set(key, {
        source: source ?? 'direct', campaign: campaign ?? 'organic',
        visits: 0, leads: 0, high_priority_leads: 0, avg_score: null, bookings: 0, total_revenue: 0,
      })
    }
    const row = groups.get(key)!
    row.leads += 1
    if (l.lead_score >= 70) row.high_priority_leads += 1
    row.avg_score = ((row.avg_score ?? 0) * (row.leads - 1) + l.lead_score) / row.leads
  }

  // Bookings — for now, just total (can't reliably link without booking-level UTM)
  // We attribute all to "all" pseudo-row at top
  const allKey = 'all::all'
  const totalBookings = bookings.length
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0)

  const sorted = Array.from(groups.values())
    .sort((a, b) => b.leads - a.leads || b.visits - a.visits)

  // Add total row at top
  return [
    {
      source: 'all',
      campaign: '⭐ الإجمالي',
      visits: visits.length,
      leads: leads.length,
      high_priority_leads: leads.filter(l => l.lead_score >= 70).length,
      avg_score: leads.length > 0 ? leads.reduce((s, l) => s + l.lead_score, 0) / leads.length : null,
      bookings: totalBookings,
      total_revenue: totalRevenue,
    },
    ...sorted,
  ]
}

function rate(numerator: number, denominator: number): string {
  if (denominator === 0) return '—'
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

export default async function FunnelDashboard({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const days = parseInt(params.days ?? '7', 10)
  const rows = await getFunnelData(days)

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0',
      minHeight: '100vh',
      padding: '24px',
      color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: '#1F5F3F', margin: 0, fontSize: 26 }}>📊 Conversion Funnel</h1>
            <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>
              من إعلان إلى Lead إلى حجز — لكل campaign
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <a href="/admin/agents" style={{ color: '#1F5F3F' }}>← Agents</a>
            <a href="/admin/leads-feed" style={{ color: '#1F5F3F' }}>← Leads</a>
            <a href="/admin/ad-builder" style={{ color: '#1F5F3F' }}>← Ad Builder</a>
          </div>
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { d: 1, label: 'النهارده' },
            { d: 7, label: '7 أيام' },
            { d: 30, label: '30 يوم' },
            { d: 90, label: '90 يوم' },
          ].map((opt) => (
            <a
              key={opt.d}
              href={`?days=${opt.d}`}
              style={{
                background: days === opt.d ? '#1F5F3F' : '#fff',
                color: days === opt.d ? '#FAF7F0' : '#1F5F3F',
                padding: '8px 16px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 'bold',
                border: '1px solid #1F5F3F',
              }}
            >
              {opt.label}
            </a>
          ))}
        </div>

        {/* Funnel visualization for top row */}
        {rows.length > 0 && (
          <div style={{
            background: '#fff',
            padding: 20,
            borderRadius: 12,
            marginBottom: 20,
            border: '1px solid #eee',
          }}>
            <h3 style={{ color: '#1F5F3F', margin: '0 0 16px' }}>📐 Funnel الإجمالي ({days} يوم)</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 10,
              alignItems: 'center',
            }}>
              {[
                { label: '👁️ زيارات', val: rows[0].visits, color: '#666' },
                { label: '🎯 Leads', val: rows[0].leads, color: '#B8860B', rate: rate(rows[0].leads, rows[0].visits) },
                { label: '🔥 عالي النية', val: rows[0].high_priority_leads, color: '#C2410C', rate: rate(rows[0].high_priority_leads, rows[0].leads) },
                { label: '💰 حجوزات', val: rows[0].bookings, color: '#1F5F3F', rate: rate(rows[0].bookings, rows[0].leads) },
                { label: '💵 إيرادات', val: `${rows[0].total_revenue.toLocaleString()}ج`, color: '#1F5F3F' },
              ].map((stage, i) => (
                <div key={i} style={{
                  background: i === 0 ? '#FAF7F0' : i === 4 ? '#1F5F3F' : '#fff',
                  color: i === 4 ? '#FAF7F0' : '#1a1a1a',
                  padding: 14,
                  borderRadius: 10,
                  textAlign: 'center',
                  border: i !== 4 ? '1px solid #eee' : 'none',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: i === 4 ? '#FAF7F0' : stage.color }}>
                    {stage.val}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{stage.label}</div>
                  {stage.rate && (
                    <div style={{
                      fontSize: 10,
                      marginTop: 4,
                      color: i === 4 ? '#FAF7F0' : '#999',
                    }}>
                      {stage.rate} conversion
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-campaign breakdown */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #eee' }}>
          <div style={{ padding: '12px 16px', background: '#FAF7F0', borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: 0, color: '#1F5F3F', fontSize: 16 }}>📋 تفصيل لكل Campaign</h3>
          </div>

          {rows.length === 1 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
              <p>لسه مفيش بيانات tracking</p>
              <p style={{ fontSize: 12 }}>ابدأ campaign على Meta ووجّه الزوار للـ landing page بـ utm_source و utm_campaign</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FAF7F0' }}>
                  <th style={thStyle}>Campaign</th>
                  <th style={thStyle}>المصدر</th>
                  <th style={thStyle}>👁️ زيارات</th>
                  <th style={thStyle}>🎯 Leads</th>
                  <th style={thStyle}>CR%</th>
                  <th style={thStyle}>🔥 عالي</th>
                  <th style={thStyle}>متوسط Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#1F5F3F' }}>{r.campaign}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: '#FAF7F0',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                      }}>{r.source}</span>
                    </td>
                    <td style={tdStyle}>{r.visits}</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>{r.leads}</td>
                    <td style={tdStyle}>{rate(r.leads, r.visits)}</td>
                    <td style={{ ...tdStyle, color: r.high_priority_leads > 0 ? '#C2410C' : '#999' }}>
                      {r.high_priority_leads > 0 ? `🔥 ${r.high_priority_leads}` : '—'}
                    </td>
                    <td style={tdStyle}>
                      {r.avg_score !== null ? r.avg_score.toFixed(0) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Help */}
        <div style={{
          background: '#fff',
          padding: 16,
          borderRadius: 12,
          marginTop: 20,
          border: '1px solid #eee',
          fontSize: 13,
          color: '#666',
          lineHeight: 1.7,
        }}>
          <strong style={{ color: '#1F5F3F' }}>💡 نصايح:</strong>
          <ul style={{ margin: '8px 0', paddingRight: 20 }}>
            <li>CR (Conversion Rate) أعلى = الـ landing page شغّالة كويس</li>
            <li>متوسط Score أعلى = الـ targeting بتاعك دقيق</li>
            <li>كل campaign محتاج اسم مختلف عشان تقدر تقارن (e.g. <code>cameras_oct</code> vs <code>cars_oct</code>)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 10px',
  textAlign: 'right',
  fontWeight: 'bold',
  fontSize: 12,
  color: '#666',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 10px',
  textAlign: 'right',
}
