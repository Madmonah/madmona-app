'use client'

// src/app/admin/reels/components/RenderTrigger.tsx
// Renders drafted reels ONE AT A TIME to avoid Vercel Edge 60s timeout.

import { useState } from 'react'

interface Result {
  id: string
  title: string
  status: 'OK' | 'FAIL'
  url?: string
  error?: string
}

interface ReelStub {
  id: string
  title: string
}

interface Props {
  draftedReels: ReelStub[]
}

export default function RenderTrigger({ draftedReels }: Props) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; currentTitle?: string } | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleRender = async () => {
    let pw = sessionStorage.getItem('madmona_admin_pw')
    if (!pw) {
      pw = prompt('كلمة سر الـ admin:')
      if (!pw) return
      sessionStorage.setItem('madmona_admin_pw', pw)
    }

    if (draftedReels.length === 0) {
      setError('مفيش reels في حالة drafted')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setProgress({ current: 0, total: draftedReels.length })

    const allResults: Result[] = []

    for (let i = 0; i < draftedReels.length; i++) {
      const reel = draftedReels[i]
      setProgress({ current: i + 1, total: draftedReels.length, currentTitle: reel.title })

      try {
        const r = await fetch(`/api/cron/render-reels?reel_id=${reel.id}`, {
          method: 'POST',
          headers: { 'x-admin-pw': pw },
        })

        // Try to parse JSON; if it fails, treat the body as the error
        let data: { results?: Result[]; error?: string } | null = null
        const text = await r.text()
        try {
          data = JSON.parse(text)
        } catch {
          allResults.push({
            id: reel.id, title: reel.title, status: 'FAIL',
            error: `non-JSON response (${r.status}): ${text.slice(0, 100)}`,
          })
          setResults([...allResults])
          continue
        }

        if (!r.ok || !data) {
          allResults.push({
            id: reel.id, title: reel.title, status: 'FAIL',
            error: data?.error ?? `HTTP ${r.status}`,
          })
        } else if (data.results && data.results.length > 0) {
          allResults.push(data.results[0])
        } else {
          allResults.push({
            id: reel.id, title: reel.title, status: 'FAIL',
            error: 'no result returned',
          })
        }
      } catch (e) {
        allResults.push({
          id: reel.id, title: reel.title, status: 'FAIL',
          error: e instanceof Error ? e.message : 'unknown',
        })
      }

      setResults([...allResults])
    }

    setProgress(null)
    setLoading(false)
  }

  if (draftedReels.length === 0 && results.length === 0) {
    return (
      <div style={{
        marginBottom: 24, padding: 12, background: '#f0f9ff', border: '1px solid #bae6fd',
        borderRadius: 8, color: '#075985', fontSize: 13,
      }}>
        ✓ مفيش reels في حالة drafted — كله متعمل أو render-ed بالفعل.
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={handleRender}
        disabled={loading || draftedReels.length === 0}
        style={{
          background: loading || draftedReels.length === 0
            ? '#999'
            : 'linear-gradient(135deg, #FA8125 0%, #F98F2A 50%, #2FA084 100%)',
          color: '#FAF7F0',
          border: 'none',
          padding: '14px 28px',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 'bold',
          cursor: loading || draftedReels.length === 0 ? 'wait' : 'pointer',
          boxShadow: '0 6px 16px rgba(250, 129, 37, 0.3)',
          transition: 'all 0.2s',
        }}
      >
        {loading
          ? `🎬 جاري الـ rendering... (${progress?.current ?? 0}/${progress?.total ?? 0})`
          : `🚀 ابدأ rendering لـ ${draftedReels.length} reels`}
      </button>

      {progress && progress.currentTitle && (
        <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
            ⚙️ شغّال على: <strong>{progress.currentTitle}</strong>
          </div>
          <div style={{ background: '#f0f0f0', height: 6, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${(progress.current / progress.total) * 100}%`,
              background: 'linear-gradient(90deg, #FA8125, #2FA084)',
              height: '100%', transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 12, padding: 12, background: '#fee', border: '1px solid #fcc',
          borderRadius: 8, color: '#900', fontSize: 13,
        }}>
          ❌ {error}
        </div>
      )}

      {results.length > 0 && (
        <div style={{
          marginTop: 16, padding: 16, background: '#fff', borderRadius: 12,
          border: '1px solid #eee',
        }}>
          <div style={{ fontWeight: 'bold', color: '#FA8125', marginBottom: 8 }}>
            📊 النتيجة: {results.filter(r => r.status === 'OK').length} نجح / {results.filter(r => r.status === 'FAIL').length} فشل من أصل {results.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, maxHeight: 300, overflowY: 'auto' }}>
            {results.map((r, idx) => (
              <div key={`${r.id}-${idx}`} style={{
                padding: 8,
                background: r.status === 'OK' ? '#d4edda' : '#f8d7da',
                borderRadius: 6,
                color: r.status === 'OK' ? '#155724' : '#721c24',
              }}>
                {r.status === 'OK' ? '✅' : '❌'} {r.title}
                {r.error && (
                  <span style={{ display: 'block', fontSize: 11, marginTop: 4, fontFamily: 'monospace', opacity: 0.8 }}>
                    {r.error}
                  </span>
                )}
              </div>
            ))}
          </div>
          {!loading && (
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 12, background: '#FA8125', color: '#fff', border: 'none',
                padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 'bold',
              }}
            >
              🔄 تحديث الصفحة لعرض الـ videos الجديدة
            </button>
          )}
        </div>
      )}
    </div>
  )
}
