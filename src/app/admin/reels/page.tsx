// src/app/admin/reels/page.tsx
import { supabase as supabaseAdmin } from '@/lib/supabase'
import RenderTrigger from './components/RenderTrigger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Reel {
  id: string
  listing_id: string | null
  category: string | null
  title: string
  hook: string
  scenes: Array<Record<string, unknown>> | null
  music_suggestion: string | null
  shot_list: Array<Record<string, unknown>> | null
  total_duration_sec: number | null
  caption: string | null
  hashtags: string[] | null
  cta: string | null
  status: string
  video_url: string | null
  created_at: string
}

export default async function ReelsPage() {
  const { data: reels } = await supabaseAdmin
    .from('reel_scripts').select('*')
    .order('created_at', { ascending: false }).limit(30)
  const all = (reels ?? []) as Reel[]

  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma', background: '#FAF7F0', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#1F5F3F', margin: 0, fontSize: 26 }}>🎬 Reel Scripts</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <a href="/admin/ai-os" style={{ color: '#1F5F3F' }}>← AI OS</a>
            <a href="/admin/marketing-hq" style={{ color: '#1F5F3F' }}>← HQ</a>
          </div>
        </div>

        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          {all.length} reel script جاهز للتصوير
        </p>

        <RenderTrigger
          draftedReels={all
            .filter(r => !r.video_url && r.status !== 'rendered')
            .map(r => ({ id: r.id, title: r.title }))}
        />

        {all.length === 0 ? (
          <div style={{ background: '#fff', padding: 60, borderRadius: 12, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48 }}>🎬</div>
            <p>لسه مفيش reel scripts</p>
            <p style={{ fontSize: 12 }}>اطلب الـ reel-script-writer من /admin/ai-os</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {all.map(reel => (
              <div key={reel.id} style={{
                background: '#fff', padding: 20, borderRadius: 12,
                border: '1px solid #eee', borderRight: '4px solid #C2410C',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h2 style={{ margin: 0, color: '#1F5F3F', fontSize: 18 }}>{reel.title}</h2>
                  <span style={{
                    background: reel.video_url ? '#1F5F3F' : reel.status === 'approved' ? '#d4edda' : '#fff3cd',
                    color: reel.video_url ? '#FAF7F0' : reel.status === 'approved' ? '#155724' : '#856404',
                    padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 'bold',
                  }}>{reel.video_url ? '🎬 جاهز للنشر' : reel.status}</span>
                </div>

                {/* Video player (if rendered) */}
                {reel.video_url && (
                  <div style={{ margin: '12px 0', background: '#000', borderRadius: 8, overflow: 'hidden', maxWidth: 360 }}>
                    <video
                      src={reel.video_url}
                      controls
                      playsInline
                      style={{ width: '100%', display: 'block' }}
                    />
                    <div style={{ padding: 8, background: '#1F5F3F', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <a href={reel.video_url} download style={{ color: '#FAF7F0', fontSize: 12, textDecoration: 'underline' }}>
                        ⬇ تحميل MP4
                      </a>
                      <span style={{ color: '#B8860B', fontSize: 11 }}>·</span>
                      <a href={reel.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#FAF7F0', fontSize: 12, textDecoration: 'underline' }}>
                        🔗 URL
                      </a>
                    </div>
                  </div>
                )}

                {/* Hook */}
                <div style={{
                  background: '#1F5F3F', color: '#FAF7F0', padding: 16,
                  borderRadius: 8, margin: '12px 0', fontSize: 16, fontWeight: 'bold',
                }}>
                  💥 Hook: {reel.hook}
                </div>

                {/* Scenes */}
                {reel.scenes && reel.scenes.length > 0 && (
                  <details style={{ marginBottom: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#1F5F3F', fontWeight: 'bold', fontSize: 13 }}>
                      🎞️ Scenes ({reel.scenes.length}) · {reel.total_duration_sec ?? '?'}s
                    </summary>
                    <div style={{ marginTop: 8 }}>
                      {reel.scenes.map((s: Record<string, unknown>, i) => (
                        <div key={i} style={{ background: '#FAF7F0', padding: 12, borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
                          <strong>Scene {i + 1} ({String(s.duration_sec ?? '?')}s):</strong><br/>
                          <em>Action:</em> {String(s.action ?? '')}<br/>
                          {Boolean(s.text_overlay) && <><em>Text overlay:</em> {String(s.text_overlay)}<br/></>}
                          {Boolean(s.voice_over) && <><em>Voice over:</em> {String(s.voice_over)}</>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Caption */}
                {reel.caption && (
                  <details style={{ marginBottom: 8 }}>
                    <summary style={{ cursor: 'pointer', color: '#1F5F3F', fontWeight: 'bold', fontSize: 13 }}>
                      📝 Caption
                    </summary>
                    <div style={{ background: '#FAF7F0', padding: 12, borderRadius: 6, marginTop: 6, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {reel.caption}
                    </div>
                  </details>
                )}

                {/* Music */}
                {reel.music_suggestion && (
                  <p style={{ fontSize: 12, color: '#666', margin: '8px 0' }}>
                    🎵 <strong>Music:</strong> {reel.music_suggestion}
                  </p>
                )}

                {/* Hashtags */}
                {reel.hashtags && reel.hashtags.length > 0 && (
                  <p style={{ fontSize: 11, color: '#1F5F3F', margin: '8px 0', wordSpacing: '4px' }}>
                    {reel.hashtags.join(' ')}
                  </p>
                )}

                <div style={{ marginTop: 12, fontSize: 11, color: '#999' }}>
                  📅 {new Date(reel.created_at).toLocaleString('ar-EG')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
