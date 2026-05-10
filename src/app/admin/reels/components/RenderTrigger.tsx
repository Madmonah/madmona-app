'use client'

// src/app/admin/reels/components/RenderTrigger.tsx
// Manual "Start rendering" button for /admin/reels page

import { useState } from 'react'

interface Result {
  id: string
  title: string
  status: 'OK' | 'FAIL'
  url?: string
  error?: string
}

export default function RenderTrigger() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRender = async () => {
    let pw = sessionStorage.getItem('madmona_admin_pw')
    if (!pw) {
      pw = prompt('كلمة سر الـ admin:')
      if (!pw) return
      sessionStorage.setItem('madmona_admin_pw', pw)
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const r = await fetch('/api/cron/render-reels?limit=10', {
        method: 'POST',
        headers: { 'x-admin-pw': pw },
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? 'فشل')
      } else {
        setResults(data.results)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={handleRender}
        disabled={loading}
        style={{
          background: loading
            ? '#999'
            : 'linear-gradient(135deg, #1F5F3F 0%, #2d7a52 50%, #B8860B 100%)',
          color: '#FAF7F0',
          border: 'none',
          padding: '14px 28px',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 'bold',
          cursor: loading ? 'wait' : 'pointer',
          boxShadow: '0 6px 16px rgba(31, 95, 63, 0.3)',
          transition: 'all 0.2s',
        }}
      >
        {loading ? '🎬 جاري الـ rendering...' : '🚀 ابدأ rendering لكل الـ reels'}
      </button>

      {loading && (
        <p style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          ⏱️ كل reel بياخد 30-60 ثانية تقريباً. لو في 5 reels، استنى 3-5 دقايق...
        </p>
      )}

      {error && (
        <div style={{
          marginTop: 12, padding: 12, background: '#fee', border: '1px solid #fcc',
          borderRadius: 8, color: '#900', fontSize: 13,
        }}>
          ❌ {error}
        </div>
      )}

      {results && (
        <div style={{
          marginTop: 16, padding: 16, background: '#fff', borderRadius: 12,
          border: '1px solid #eee',
        }}>
          <div style={{ fontWeight: 'bold', color: '#1F5F3F', marginBottom: 8 }}>
            ✅ النتيجة: {results.filter(r => r.status === 'OK').length} نجح / {results.filter(r => r.status === 'FAIL').length} فشل
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
            {results.map((r) => (
              <div key={r.id} style={{
                padding: 8,
                background: r.status === 'OK' ? '#d4edda' : '#f8d7da',
                borderRadius: 6,
                color: r.status === 'OK' ? '#155724' : '#721c24',
              }}>
                {r.status === 'OK' ? '✅' : '❌'} {r.title}
                {r.error && <span style={{ display: 'block', fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>{r.error}</span>}
              </div>
            ))}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12, background: '#1F5F3F', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
            }}
          >
            🔄 تحديث الصفحة لعرض الـ videos
          </button>
        </div>
      )}
    </div>
  )
}
