// src/app/admin/qc-reports/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface QCReport {
  id: string
  listing_id: string
  overall_score: number | null
  pass_status: string | null
  title_quality_score: number | null
  description_quality_score: number | null
  photos_quality_score: number | null
  pricing_reasonable: boolean | null
  category_correct: boolean | null
  issues: Array<Record<string, unknown>> | null
  improvements: Array<Record<string, unknown>> | null
  recommended_action: string | null
  human_review_needed: boolean
  created_at: string
}

export default async function QCReportsPage() {
  const { data: reports } = await supabaseAdmin
    .from('qc_reports').select('*')
    .order('created_at', { ascending: false }).limit(30)
  const all = (reports ?? []) as QCReport[]

  // Get listing info for each
  const listingIds = all.map(r => r.listing_id)
  const { data: listings } = await supabaseAdmin
    .from('listings').select('id, title').in('id', listingIds.length > 0 ? listingIds : [''])
  const titleByListingId = new Map<string, string>()
  ;((listings ?? []) as Array<{ id: string; title: string }>).forEach(l => {
    titleByListingId.set(l.id, l.title)
  })

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#FA8125', margin: 0, fontSize: 26 }}>✅ QC Reports</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <a href="/admin/ai-os" style={{ color: '#FA8125' }}>← AI OS</a>
            <a href="/admin/marketing-hq" style={{ color: '#FA8125' }}>← HQ</a>
          </div>
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          {all.length} تقرير جودة من Quality Control AI
        </p>

        {all.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <p>لسه مفيش QC reports</p>
            <p style={{ fontSize: 12 }}>الـ Quality Control بيراجع الإعلانات الجديدة تلقائياً</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {all.map(r => {
              const score = r.overall_score ?? 0
              const scoreColor = score >= 80 ? '#28a745' : score >= 60 ? '#2FA084' : '#6FCF97'
              return (
                <div key={r.id} style={{
                  background: '#fff', padding: 20, borderRadius: 12,
                  border: '1px solid #eee',
                  borderRight: `4px solid ${r.pass_status === 'pass' ? '#28a745' : r.pass_status === 'fail' ? '#6FCF97' : '#2FA084'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <h2 style={{ margin: 0, color: '#FA8125', fontSize: 16 }}>
                        {titleByListingId.get(r.listing_id) ?? r.listing_id}
                      </h2>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        background: scoreColor, color: '#fff',
                        padding: '4px 12px', borderRadius: 12, fontSize: 14, fontWeight: 'bold',
                      }}>
                        {score}/100
                      </span>
                      <span style={{
                        background: r.pass_status === 'pass' ? '#d4edda' : r.pass_status === 'fail' ? '#f8d7da' : '#fff3cd',
                        color: r.pass_status === 'pass' ? '#155724' : r.pass_status === 'fail' ? '#721c24' : '#856404',
                        padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 'bold',
                      }}>
                        {r.pass_status}
                      </span>
                    </div>
                  </div>

                  {/* Scores grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: '#FAF7F0', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#FA8125' }}>{r.title_quality_score ?? 0}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>عنوان</div>
                    </div>
                    <div style={{ background: '#FAF7F0', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#FA8125' }}>{r.description_quality_score ?? 0}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>وصف</div>
                    </div>
                    <div style={{ background: '#FAF7F0', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#FA8125' }}>{r.photos_quality_score ?? 0}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>صور</div>
                    </div>
                  </div>

                  {/* Issues */}
                  {r.issues && r.issues.length > 0 && (
                    <details style={{ marginBottom: 8 }}>
                      <summary style={{ cursor: 'pointer', color: '#6FCF97', fontWeight: 'bold', fontSize: 13 }}>
                        ⚠️ Issues ({r.issues.length})
                      </summary>
                      <div style={{ marginTop: 8 }}>
                        {r.issues.map((issue: Record<string, unknown>, i) => (
                          <div key={i} style={{
                            background: '#fff3cd', padding: 8, borderRadius: 6,
                            marginBottom: 4, fontSize: 12, color: '#856404',
                          }}>
                            <strong>[{String(issue.severity ?? '')}]</strong> {String(issue.field ?? '')}: {String(issue.message ?? '')}
                            {Boolean(issue.suggestion) && <><br/><em>💡 {String(issue.suggestion)}</em></>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Improvements */}
                  {r.improvements && r.improvements.length > 0 && (
                    <details>
                      <summary style={{ cursor: 'pointer', color: '#FA8125', fontWeight: 'bold', fontSize: 13 }}>
                        💡 Improvements ({r.improvements.length})
                      </summary>
                      <div style={{ marginTop: 8 }}>
                        {r.improvements.map((imp: Record<string, unknown>, i) => (
                          <div key={i} style={{
                            background: '#FAF7F0', padding: 10, borderRadius: 6,
                            marginBottom: 6, fontSize: 12,
                          }}>
                            <strong>{String(imp.field ?? '')}</strong>:<br/>
                            <span style={{ color: '#666' }}>الحالي: {String(imp.current ?? '')}</span><br/>
                            <span style={{ color: '#FA8125' }}>المقترح: {String(imp.suggested ?? '')}</span>
                            {Boolean(imp.reason) && <><br/><em style={{ color: '#999' }}>{String(imp.reason)}</em></>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  <div style={{ marginTop: 12, fontSize: 11, color: '#999', display: 'flex', gap: 16 }}>
                    <span>📅 {new Date(r.created_at).toLocaleString('ar-EG')}</span>
                    <span>📋 Action: <strong>{r.recommended_action ?? '—'}</strong></span>
                    {r.human_review_needed && <span style={{ color: '#6FCF97', fontWeight: 'bold' }}>👤 محتاج مراجعة بشرية</span>}
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
