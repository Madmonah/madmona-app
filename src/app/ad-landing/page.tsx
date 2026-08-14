'use client'

// src/app/ad-landing/page.tsx
// Landing page optimized for Meta ads (Facebook/Instagram)
// Captures leads → triggers AI follow-up agents
// Fires Meta Pixel "Lead" event on successful submission for ad attribution

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { pixelEvents } from '@/components/analytics/MetaPixel'

const CATEGORIES = [
  { id: 'apartments', label: 'شقق وعقارات', icon: '🏠' },
  { id: 'cars', label: 'سيارات', icon: '🚗' },
  { id: 'cameras', label: 'كاميرات ومعدات تصوير', icon: '📷' },
  { id: 'event', label: 'معدات فعاليات', icon: '🎉' },
  { id: 'other', label: 'حاجة تانية', icon: '💡' },
]

function AdLandingForm() {
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const utm_source = searchParams?.get('utm_source') || 'direct'
  const utm_campaign = searchParams?.get('utm_campaign') || 'none'

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
          name, phone, category, message,
          utm_source, utm_campaign,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'حصل خطأ، حاول تاني')
        setSubmitting(false)
        return
      }

      // Fire Meta Pixel Lead event for ad attribution
      try {
        pixelEvents.lead(category || undefined)
      } catch {}

      setSuccess(true)
    } catch {
      setError('حصل خطأ في الاتصال')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#059669',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Tajawal, Tahoma, sans-serif',
      }}>
        <div style={{
          background: '#FAF7F0',
          padding: '40px 32px',
          borderRadius: '24px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ color: '#059669', fontSize: '28px', marginBottom: '12px' }}>تم! استلمنا بياناتك</h1>
          <p style={{ color: '#444', fontSize: '17px', lineHeight: 1.6, marginBottom: '24px' }}>
            هنتواصل معاك في أقل من ساعة على رقم <strong dir="ltr">{phone}</strong>
          </p>
          <a
            href={`https://wa.me/201002229982?text=${encodeURIComponent('أهلاً، سجلت اسمي على مضمونة وعايز أعرف تفاصيل أكتر')}`}
            target="_blank"
            rel="noopener"
            style={{
              display: 'inline-block',
              background: '#25D366',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            📱 كلمنا واتساب دلوقتي
          </a>
          <p style={{ color: '#999', fontSize: '13px', marginTop: '32px' }}>
            معاملاتك مضمونة 🤝
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #059669 0%, #164D32 100%)',
      padding: '20px',
      fontFamily: 'Tajawal, Tahoma, sans-serif',
    }}>
      <div style={{
        maxWidth: '520px',
        margin: '0 auto',
        paddingTop: '40px',
        textAlign: 'center',
      }}>
        <h1 style={{
          color: '#FAF7F0',
          fontSize: '36px',
          fontWeight: 'bold',
          marginBottom: '12px',
          lineHeight: 1.2,
        }}>
          محتاج تأجر <span style={{ color: '#2FA084' }}>أي حاجة</span>؟
        </h1>
        <p style={{
          color: '#FAF7F0',
          opacity: 0.9,
          fontSize: '18px',
          marginBottom: '8px',
        }}>
          شقق · سيارات · كاميرات · معدات
        </p>
        <p style={{
          color: '#2FA084',
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '32px',
        }}>
          معاملاتك مضمونة 🤝
        </p>

        <div style={{
          background: '#FAF7F0',
          padding: '28px 24px',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          textAlign: 'right',
        }}>
          <h2 style={{
            color: '#059669',
            fontSize: '20px',
            marginBottom: '6px',
          }}>
            سيب رقمك ونكلمك في 30 دقيقة
          </h2>
          <p style={{
            color: '#666',
            fontSize: '14px',
            marginBottom: '20px',
          }}>
            مجاني تماماً ومفيش أي التزام
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

            <p style={{ color: '#059669', fontWeight: 'bold', marginTop: '16px', marginBottom: '8px', fontSize: '14px' }}>
              عايز تأجر إيه؟ <span style={{ color: '#999', fontWeight: 'normal' }}>(اختياري)</span>
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginBottom: '16px',
            }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id === category ? '' : cat.id)}
                  style={{
                    background: category === cat.id ? '#059669' : '#fff',
                    color: category === cat.id ? '#FAF7F0' : '#059669',
                    border: `2px solid ${category === cat.id ? '#059669' : '#ddd'}`,
                    padding: '12px 8px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            <textarea
              placeholder="أي تفاصيل تساعدنا (اختياري)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
            />

            {error && (
              <div style={{
                background: '#fee',
                color: '#c00',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '14px',
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: submitting ? '#999' : '#059669',
                color: '#FAF7F0',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '17px',
                cursor: submitting ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                marginTop: '8px',
              }}
            >
              {submitting ? '...' : '✨ ابعت بياناتي دلوقتي'}
            </button>

            <p style={{
              textAlign: 'center',
              color: '#999',
              fontSize: '12px',
              marginTop: '16px',
              marginBottom: 0,
            }}>
              بياناتك آمنة ومفيش spam.
            </p>
          </form>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          marginTop: '24px',
          color: '#FAF7F0',
        }}>
          {[
            { icon: '🛡️', label: 'حماية كاملة' },
            { icon: '⚡', label: 'دفع سريع' },
            { icon: '💬', label: 'دعم مستمر' },
          ].map((b) => (
            <div key={b.label} style={{ textAlign: 'center', fontSize: '13px' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{b.icon}</div>
              {b.label}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', color: '#FAF7F0', opacity: 0.7, marginTop: '32px', fontSize: '13px' }}>
          <p style={{ margin: 0 }}>+200 إعلان · مؤجرين معتمدين · مدفوعات آمنة</p>
        </div>
      </div>

      <a
        href="https://wa.me/201002229982"
        target="_blank"
        rel="noopener"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          background: '#25D366',
          color: '#fff',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          textDecoration: 'none',
          zIndex: 100,
        }}
      >
        📱
      </a>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  border: '2px solid #ddd',
  borderRadius: '10px',
  fontSize: '15px',
  marginBottom: '12px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function AdLandingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#059669' }} />}>
      <AdLandingForm />
    </Suspense>
  )
}
