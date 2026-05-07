'use client'

// src/app/admin/insights/InsightActions.tsx
// Action buttons for individual insights

import { useState } from 'react'

interface Props {
  insightId: string
  currentStatus: string
}

export default function InsightActions({ insightId, currentStatus }: Props) {
  const [adminPw, setAdminPw] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('madmona_admin_pw') ?? ''
    }
    return ''
  })
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const performAction = async (action: 'actioned' | 'dismissed' | 'reviewed') => {
    let pw = adminPw
    if (!pw) {
      const entered = prompt('كلمة سر الـ admin:')
      if (!entered) return
      setAdminPw(entered)
      sessionStorage.setItem('madmona_admin_pw', entered)
      pw = entered
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/insight-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pw': pw,
        },
        body: JSON.stringify({ insight_id: insightId, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', msg: data.error ?? 'فشل' })
        setTimeout(() => setFeedback(null), 3000)
        return
      }
      setStatus(action)
      const labels = { actioned: 'تم التنفيذ ✓', dismissed: 'تم الرفض', reviewed: 'تمت المراجعة ✓' }
      setFeedback({ type: 'success', msg: labels[action] })
      setTimeout(() => setFeedback(null), 2000)
    } catch {
      setFeedback({ type: 'error', msg: 'خطأ في الاتصال' })
      setTimeout(() => setFeedback(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  if (status !== 'new') {
    return (
      <div style={{
        marginTop: 10,
        padding: '6px 12px',
        background: status === 'actioned' ? '#d4edda' : '#f0f0f0',
        color: status === 'actioned' ? '#155724' : '#666',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 'bold',
        display: 'inline-block',
      }}>
        {status === 'actioned' ? '✓ تم التنفيذ' : status === 'dismissed' ? '✗ تم الرفض' : '👁️ تمت المراجعة'}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          onClick={() => performAction('actioned')}
          disabled={loading}
          style={{
            padding: '6px 12px',
            background: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 11,
            fontWeight: 'bold',
          }}
        >
          ✓ تم التنفيذ
        </button>
        <button
          onClick={() => performAction('reviewed')}
          disabled={loading}
          style={{
            padding: '6px 12px',
            background: '#1F5F3F',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 11,
            fontWeight: 'bold',
          }}
        >
          👁️ شفته
        </button>
        <button
          onClick={() => performAction('dismissed')}
          disabled={loading}
          style={{
            padding: '6px 12px',
            background: '#fff',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 11,
          }}
        >
          ✗ تجاهل
        </button>
      </div>
      {feedback && (
        <div style={{
          marginTop: 8,
          padding: '6px 10px',
          background: feedback.type === 'success' ? '#d4edda' : '#f8d7da',
          color: feedback.type === 'success' ? '#155724' : '#721c24',
          borderRadius: 4,
          fontSize: 11,
          display: 'inline-block',
        }}>
          {feedback.msg}
        </div>
      )}
    </div>
  )
}
