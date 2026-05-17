// src/app/admin/ad-creatives/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Ad {
  id: string
  listing_id: string | null
  category: string | null
  ad_type: string
  headline: string | null
  primary_text: string | null
  description: string | null
  cta_text: string | null
  visual_concept: string | null
  status: string
  impressions: number
  clicks: number
  leads_count: number
  created_at: string
}

export default async function AdCreativesPage() {
  const { data: ads } = await supabaseAdmin
    .from('ad_creatives').select('*')
    .order('created_at', { ascending: false }).limit(50)
  const all = (ads ?? []) as Ad[]

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#1F6F5F', margin: 0, fontSize: 26 }}>🎨 Ad Creatives</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <a href="/admin/ai-os" style={{ color: '#1F6F5F' }}>← AI OS</a>
            <a href="/admin/marketing-hq" style={{ color: '#1F6F5F' }}>← HQ</a>
          </div>
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          {all.length} إعلان مولد بالـ AI · جاهز للـ Meta ads بعد المراجعة
        </p>

        {all.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>🎨</div>
            <p>لسه مفيش ad creatives</p>
            <p style={{ fontSize: 12 }}>اطلب الـ ad-designer agent يولد creatives من الـ Marketing HQ</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {all.map(ad => (
              <div key={ad.id} style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ margin: 0, color: '#1F6F5F', fontSize: 18 }}>
                    {ad.headline ?? '(بدون عنوان)'}
                  </h2>
                  <span style={{
                    background: ad.status === 'approved' ? '#d4edda' : '#fff3cd',
                    color: ad.status === 'approved' ? '#155724' : '#856404',
                    padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 'bold',
                  }}>{ad.status}</span>
                </div>
                {ad.primary_text && (
                  <div style={{ background: '#FAF7F0', padding: 12, borderRadius: 8, marginBottom: 8, lineHeight: 1.7, fontSize: 14 }}>
                    {ad.primary_text}
                  </div>
                )}
                {ad.description && (
                  <p style={{ color: '#666', fontSize: 13, margin: '8px 0' }}>{ad.description}</p>
                )}
                {ad.cta_text && (
                  <span style={{ display: 'inline-block', background: '#2FA084', color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 'bold' }}>
                    {ad.cta_text}
                  </span>
                )}
                {ad.visual_concept && (
                  <details style={{ marginTop: 12, fontSize: 12 }}>
                    <summary style={{ cursor: 'pointer', color: '#1F6F5F' }}>🎨 Visual Concept</summary>
                    <p style={{ background: '#f9f9f9', padding: 10, marginTop: 6, borderRadius: 6, color: '#444' }}>
                      {ad.visual_concept}
                    </p>
                  </details>
                )}
                <div style={{ marginTop: 12, fontSize: 11, color: '#999', display: 'flex', gap: 16 }}>
                  <span>📅 {new Date(ad.created_at).toLocaleString('ar-EG')}</span>
                  <span>📊 {ad.impressions.toLocaleString()} مشاهدة · {ad.clicks} ضغطة · {ad.leads_count} lead</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
