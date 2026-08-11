// src/app/admin/ceo-briefs/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Brief {
  id: string
  brief_date: string
  one_liner: string | null
  good_news: string[] | null
  concerns: string[] | null
  decisions_needed: Array<Record<string, unknown>> | null
  top_3_priorities: Array<Record<string, unknown>> | null
  revenue_today: number | null
  revenue_yesterday: number | null
  revenue_change_pct: number | null
  bookings_today: number | null
  ai_actions_today: number | null
  created_at: string
}

export default async function CEOBriefsPage() {
  const { data: briefs } = await supabaseAdmin
    .from('ceo_briefs').select('*')
    .order('brief_date', { ascending: false }).limit(30)
  const all = (briefs ?? []) as Brief[]

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#2B4521', margin: 0, fontSize: 26 }}>🌅 CEO Daily Briefs</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <a href="/admin/ai-os" style={{ color: '#2B4521' }}>← AI OS</a>
            <a href="/admin/marketing-hq" style={{ color: '#2B4521' }}>← HQ</a>
          </div>
        </div>

        {all.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>🌅</div>
            <p>لسه مفيش briefs</p>
            <p style={{ fontSize: 12 }}>الـ CEO Assistant بيكتب brief كل صباح</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {all.map(brief => (
              <div key={brief.id} style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#999' }}>{brief.brief_date}</div>
                    <h2 style={{ margin: '4px 0 0', color: '#2B4521', fontSize: 18, lineHeight: 1.4 }}>
                      {brief.one_liner ?? '(بدون عنوان)'}
                    </h2>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '16px 0' }}>
                  {[
                    { label: 'إيرادات اليوم', val: `${(brief.revenue_today ?? 0).toLocaleString()}ج` },
                    { label: 'إيرادات أمس', val: `${(brief.revenue_yesterday ?? 0).toLocaleString()}ج` },
                    { label: 'تغير', val: `${brief.revenue_change_pct ?? 0}%`, color: (brief.revenue_change_pct ?? 0) >= 0 ? '#28a745' : '#6FCF97' },
                    { label: 'AI Actions', val: brief.ai_actions_today ?? 0 },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#FAF7F0', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 'bold', color: s.color ?? '#2B4521' }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {brief.good_news && brief.good_news.length > 0 && (
                  <div style={{ background: '#d4edda', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                    <strong style={{ color: '#155724' }}>✅ أخبار حلوة</strong>
                    <ul style={{ margin: '4px 0 0', paddingRight: 20, fontSize: 13 }}>
                      {brief.good_news.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  </div>
                )}

                {brief.concerns && brief.concerns.length > 0 && (
                  <div style={{ background: '#fff3cd', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                    <strong style={{ color: '#856404' }}>⚠️ مخاوف</strong>
                    <ul style={{ margin: '4px 0 0', paddingRight: 20, fontSize: 13 }}>
                      {brief.concerns.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {brief.top_3_priorities && brief.top_3_priorities.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <strong style={{ color: '#2B4521' }}>🎯 Top 3 أولويات</strong>
                    {brief.top_3_priorities.map((p: Record<string, unknown>, i) => (
                      <div key={i} style={{ background: '#FAF7F0', padding: 10, borderRadius: 6, marginTop: 6, fontSize: 13 }}>
                        <strong>{i + 1}. {String(p.priority ?? '')}</strong><br/>
                        <em style={{ color: '#666' }}>{String(p.why ?? '')}</em><br/>
                        <span style={{ color: '#2B4521' }}>→ {String(p.action ?? '')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
