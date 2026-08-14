'use client'

// src/app/ad-listing/[slug]/AdListingForm.tsx
// Client-side lead capture form. Pre-filled with listing context.

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { pixelEvents } from '@/components/analytics/MetaPixel'

interface Props {
  listingId: string
  listingTitle: string
  categoryName: string | null
}

function FormInner({ listingId, listingTitle, categoryName }: Props) {
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const utm_source = searchParams?.get('utm_source') || 'direct'
  const utm_campaign = searchParams?.get('utm_campaign') || 'listing_direct'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          category: categoryName ?? 'إعلان معين',
          message: message || `مهتم بـ "${listingTitle}"`,
          utm_source,
          utm_campaign,
          listing_id: listingId,
          listing_title: listingTitle,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'حصل خطأ')
        setSubmitting(false)
        return
      }
      try { pixelEvents.lead(categoryName || undefined) } catch {}
      setSuccess(true)
    } catch {
      setError('حصل خطأ في الاتصال')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        textAlign: 'center',
        border: '2px solid #059669',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h2 style={{ color: '#059669', margin: '0 0 8px' }}>تم! استلمنا طلبك</h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          هنتواصل معاك في أقل من ساعة عن <strong>{listingTitle}</strong>
        </p>
        <a
          href={`https://wa.me/201002229982?text=${encodeURIComponent(`أهلاً، سجلت طلب على إعلان "${listingTitle}"`)}`}
          target="_blank"
          rel="noopener"
          style={{
            display: 'inline-block',
            background: '#25D366',
            color: '#fff',
            padding: '12px 28px',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          📱 كلمنا واتساب دلوقتي
        </a>
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff',
      padding: 20,
      borderRadius: 16,
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    }}>
      <h2 style={{ color: '#059669', fontSize: 18, margin: '0 0 4px' }}>
        احجز أو اطلب تفاصيل
      </h2>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 16px' }}>
        سيب رقمك ونكلمك في 30 دقيقة 🤝
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="اسمك"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="tel"
          placeholder="رقم تليفونك (مثل: 01001234567)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          dir="ltr"
          style={{ ...inputStyle, textAlign: 'right' }}
        />
        <textarea
          placeholder="أي سؤال أو تفاصيل؟ (اختياري)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />

        {error && (
          <div style={{
            background: '#fee',
            color: '#c00',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 8,
            fontSize: 13,
          }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            background: submitting ? '#999' : '#059669',
            color: '#FAF7F0',
            padding: '14px',
            borderRadius: 10,
            border: 'none',
            fontWeight: 'bold',
            fontSize: 16,
            cursor: submitting ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {submitting ? '...' : '✨ ابعت طلبي دلوقتي'}
        </button>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '2px solid #ddd',
  borderRadius: 8,
  fontSize: 15,
  marginBottom: 10,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function AdListingForm(props: Props) {
  return (
    <Suspense fallback={<div style={{ height: 280 }} />}>
      <FormInner {...props} />
    </Suspense>
  )
}
