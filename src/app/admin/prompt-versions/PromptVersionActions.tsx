'use client'

// src/app/admin/prompt-versions/PromptVersionActions.tsx
import { useState } from 'react'

interface Props {
  versionId: string
  agentName: string
}

export default function PromptVersionActions({ versionId, agentName }: Props) {
  const [adminPw, setAdminPw] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('madmona_admin_pw') ?? ''
    }
    return ''
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'activated' | 'rejected' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const performAction = async (action: 'activate' | 'reject') => {
    let pw = adminPw
    if (!pw) {
      const entered = prompt('كلمة سر الـ admin:')
      if (!entered) return
      setAdminPw(entered)
      sessionStorage.setItem('madmona_admin_pw', entered)
      pw = entered
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/prompt-version-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pw': pw },
        body: JSON.stringify({ version_id: versionId, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'فشل')
        return
      }
      setDone(action === 'activate' ? 'activated' : 'rejected')
    } catch {
      setError('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{
        marginTop: 10, padding: 8,
        background: done === 'activated' ? '#28a745' : '#666',
        color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 'bold',
        textAlign: 'center',
      }}>
        {done === 'activated' ? `✅ تم تفعيل النسخة الجديدة لـ ${agentName}` : `✗ تم الرفض`}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button
          onClick={() => performAction('activate')}
          disabled={loading}
          style={{
            padding: '8px 16px', background: '#28a745', color: '#fff',
            border: 'none', borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 12, fontWeight: 'bold', flex: 1,
          }}
        >
          ✅ فعّل النسخة الجديدة
        </button>
        <button
          onClick={() => performAction('reject')}
          disabled={loading}
          style={{
            padding: '8px 16px', background: '#fff', color: '#666',
            border: '1px solid #ddd', borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer', fontSize: 12,
          }}
        >
          ✗ رفض
        </button>
      </div>
      {error && (
        <div style={{
          marginTop: 8, padding: 6,
          background: '#f8d7da', color: '#721c24',
          borderRadius: 4, fontSize: 11,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
