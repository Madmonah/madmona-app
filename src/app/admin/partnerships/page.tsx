// src/app/admin/partnerships/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Opportunity {
  id: string
  partner_type: string
  partner_name: string
  partner_handle: string | null
  partner_size: string | null
  opportunity_summary: string
  pitch_angle: string
  potential_value: string
  effort_level: string
  priority: string
  outreach_message: string
  status: string
  created_at: string
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#6FCF97', high: '#2FA084', medium: '#1F6F5F', low: '#666',
}
const TYPE_EMOJI: Record<string, string> = {
  influencer: '🌟', corporate: '🏢', event: '🎪',
  university: '🎓', media: '📰',
}

export default async function PartnershipsPage() {
  const { data } = await supabaseAdmin
    .from('partnership_opportunities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  const all = ((data ?? []) as Opportunity[]).sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
  )

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#1F6F5F', margin: 0, fontSize: 26 }}>🤝 Partnership Opportunities</h1>
          <a href="/admin/ai-os" style={{ color: '#1F6F5F', fontSize: 13 }}>← AI OS</a>
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          {all.length} فرصة شراكة من Partnership Scout AI
        </p>

        {all.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>🤝</div>
            <p>لسه مفيش فرص</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {all.map(opp => {
              const color = PRIORITY_COLOR[opp.priority] ?? '#666'
              const emoji = TYPE_EMOJI[opp.partner_type] ?? '🤝'
              return (
                <div key={opp.id} style={{
                  background: '#fff', padding: 20, borderRadius: 12,
                  borderRight: `4px solid ${color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <h2 style={{ margin: 0, color: '#1F6F5F', fontSize: 17 }}>
                        {emoji} {opp.partner_name}
                      </h2>
                      {opp.partner_handle && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          {opp.partner_handle} · {opp.partner_type} · {opp.partner_size ?? ''}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        background: color, color: '#fff',
                        padding: '4px 10px', borderRadius: 6,
                        fontSize: 11, fontWeight: 'bold',
                      }}>
                        {opp.priority.toUpperCase()}
                      </span>
                      <span style={{
                        background: '#FAF7F0', color: '#666',
                        padding: '4px 10px', borderRadius: 6, fontSize: 11,
                      }}>
                        جهد: {opp.effort_level}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: '8px 0', fontSize: 13, color: '#444', lineHeight: 1.7 }}>
                    {opp.opportunity_summary}
                  </p>

                  <div style={{
                    background: '#FAF7F0', padding: 10, borderRadius: 6,
                    margin: '10px 0', fontSize: 12,
                  }}>
                    <strong>🎯 الزاوية:</strong> {opp.pitch_angle}<br/>
                    <strong>💎 القيمة:</strong> {opp.potential_value}
                  </div>

                  <details>
                    <summary style={{ cursor: 'pointer', color: '#1F6F5F', fontWeight: 'bold', fontSize: 13 }}>
                      💬 رسالة DM جاهزة
                    </summary>
                    <div style={{
                      background: '#1F6F5F', color: '#FAF7F0',
                      padding: 14, borderRadius: 8, marginTop: 8,
                      fontSize: 13, lineHeight: 1.8,
                      whiteSpace: 'pre-wrap', fontFamily: 'Tahoma',
                    }}>
                      {opp.outreach_message}
                    </div>
                  </details>

                  <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                    📅 {new Date(opp.created_at).toLocaleString('ar-EG')}
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
