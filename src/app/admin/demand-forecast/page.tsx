// src/app/admin/demand-forecast/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Forecast {
  id: string
  forecast_date: string
  forecast_period: string
  category: string
  predicted_searches: number | null
  predicted_bookings: number | null
  current_supply: number | null
  supply_gap: number | null
  confidence: string | null
  contributing_factors: Record<string, unknown> | null
  recommended_action: string | null
  created_at: string
}

const CONF_COLOR: Record<string, string> = {
  high: '#28a745', medium: '#2FA084', low: '#666',
}

export default async function DemandForecastPage() {
  const { data } = await supabaseAdmin
    .from('demand_forecasts')
    .select('*')
    .order('supply_gap', { ascending: true })
    .limit(20)
  const forecasts = (data ?? []) as Forecast[]

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#059669', margin: 0, fontSize: 26 }}>📈 Demand Forecast</h1>
          <a href="/admin/ai-os" style={{ color: '#059669', fontSize: 13 }}>← AI OS</a>
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          {forecasts.length} توقع طلب من Demand Forecaster AI
        </p>

        {forecasts.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>📈</div>
            <p>لسه مفيش توقعات</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {forecasts.map(f => {
              const gap = f.supply_gap ?? 0
              const isUrgent = gap < -5
              return (
                <div key={f.id} style={{
                  background: '#fff', padding: 16, borderRadius: 12,
                  borderRight: `4px solid ${isUrgent ? '#6FCF97' : '#059669'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h2 style={{ margin: 0, color: '#059669', fontSize: 16 }}>
                      {isUrgent ? '🔥' : '📊'} {f.category}
                    </h2>
                    <span style={{
                      background: CONF_COLOR[f.confidence ?? 'low'] ?? '#666',
                      color: '#fff',
                      padding: '4px 10px', borderRadius: 6,
                      fontSize: 11, fontWeight: 'bold',
                    }}>
                      ثقة: {f.confidence}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: '#FAF7F0', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>{f.predicted_searches ?? 0}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>بحث متوقع</div>
                    </div>
                    <div style={{ background: '#FAF7F0', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>{f.predicted_bookings ?? 0}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>حجز متوقع</div>
                    </div>
                    <div style={{ background: '#FAF7F0', padding: 10, borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>{f.current_supply ?? 0}</div>
                      <div style={{ fontSize: 10, color: '#666' }}>عرض حالي</div>
                    </div>
                    <div style={{
                      background: gap < 0 ? '#fee' : '#d4edda', padding: 10, borderRadius: 6, textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: gap < 0 ? '#6FCF97' : '#28a745' }}>
                        {gap > 0 ? '+' : ''}{gap}
                      </div>
                      <div style={{ fontSize: 10, color: '#666' }}>الفجوة</div>
                    </div>
                  </div>

                  {f.contributing_factors && (
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                      <strong>عوامل:</strong> {Array.isArray(f.contributing_factors)
                        ? (f.contributing_factors as string[]).join(' · ')
                        : JSON.stringify(f.contributing_factors)}
                    </div>
                  )}

                  {f.recommended_action && (
                    <div style={{
                      background: isUrgent ? '#6FCF97' : '#059669',
                      color: '#FAF7F0',
                      padding: 10, borderRadius: 6, fontSize: 12,
                    }}>
                      <strong>👉 الإجراء:</strong> {f.recommended_action}
                    </div>
                  )}

                  <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                    {f.forecast_period} · {new Date(f.created_at).toLocaleString('ar-EG')}
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
