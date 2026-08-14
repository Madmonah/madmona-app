// src/components/MadmonaInlineLogin.tsx
// Inline login component that fits inside ANY screen — chat, main app, modal, whatever.
// Handles the full phone → WhatsApp (code + magic link) → verify flow without ever
// forcing the user to leave the current app context.
//
// The user has TWO ways to complete login:
//   (1) Tap the magic link in WhatsApp → opens /auth/magic → session dropped in → done
//   (2) Copy the 6-digit code and paste it into this component's OTP input
//
// This component listens for a session appearing in localStorage (via a storage event
// or focus) so that when (1) completes in another tab / same-origin window, this
// component detects it and calls onSuccess without the user having to do anything.

'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  getMadmonaSession,
  setMadmonaSession,
  savePendingLoginState,
  getPendingLoginState,
  clearPendingLoginState,
  type MadmonaSession,
} from '@/lib/madmonaSession'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Props = {
  onSuccess: (session: MadmonaSession) => void
  onCancel?: () => void
  title?: string
  subtitle?: string
}

type Step = 'phone' | 'code'

const OTP_ENDPOINT = `${SUPABASE_URL}/functions/v1/madmona-otp`

function normalizeEgPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('20') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return '2' + digits
  if (digits.length === 10 && digits.startsWith('1')) return '20' + digits
  return digits.length >= 11 ? digits : null
}

export default function MadmonaInlineLogin({
  onSuccess,
  onCancel,
  title = 'دخول مضمونة',
  subtitle = 'ادخل رقم الواتساب بتاعك',
}: Props) {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [knownName, setKnownName] = useState<string | null>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // 🔑 On mount, check if the user is already logged in (magic link completed in another tab)
  // OR if we have a pending login state to restore (came back from WhatsApp)
  useEffect(() => {
    // Already logged in?
    const existing = getMadmonaSession()
    if (existing) {
      onSuccess(existing)
      return
    }

    // Restore pending state after WhatsApp roundtrip
    const pending = getPendingLoginState()
    if (pending) {
      if (pending.phone) setPhone(pending.phone)
      if (pending.name) setName(pending.name)
      if (pending.step === 'code_sent') {
        setStep('code')
        setTimeout(() => codeInputRef.current?.focus(), 100)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 🔑 Listen for the magic link completing in another window / tab
  useEffect(() => {
    const checkForSession = () => {
      const session = getMadmonaSession()
      if (session) {
        clearPendingLoginState()
        onSuccess(session)
      }
    }

    // Storage event fires when another same-origin tab writes to localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'madmona_session' || e.key === 'madmona_session_token') {
        checkForSession()
      }
    }

    // Focus event: user came back from WhatsApp / another app
    const onFocus = () => checkForSession()

    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    // Also poll every second while on code step (belt & suspenders for iOS PWAs)
    let interval: ReturnType<typeof setInterval> | null = null
    if (step === 'code') {
      interval = setInterval(checkForSession, 1000)
    }

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      if (interval) clearInterval(interval)
    }
  }, [step, onSuccess])

  async function requestCode() {
    setError('')
    const normalized = normalizeEgPhone(phone)
    if (!normalized || normalized.length < 11) {
      setError('رقم الواتساب مش صحيح. مثال: 01012345678')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(OTP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          phone: normalized,
          full_name: name || null,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'حصل خطأ. حاول تاني.')
        setLoading(false)
        return
      }

      setKnownName(data.known_name || null)
      savePendingLoginState({ step: 'code_sent', phone: normalized, name })
      setStep('code')
      setTimeout(() => codeInputRef.current?.focus(), 100)
    } catch (e) {
      setError('في مشكلة في الاتصال. حاول تاني.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    setError('')
    if (code.length !== 6) {
      setError('الكود لازم يكون 6 أرقام')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const normalized = normalizeEgPhone(phone)!
      const { data, error: rpcErr } = await supabase.rpc('madmona_verify_otp', {
        p_phone: normalized,
        p_code: code,
        p_full_name: name || null,
      })

      if (rpcErr) {
        setError('حصل خطأ. حاول تاني.')
        setLoading(false)
        return
      }
      if (!data?.success) {
        setError(data?.error || 'الكود غلط')
        setLoading(false)
        return
      }

      const session: MadmonaSession = {
        token: data.token,
        auth_user_id: data.auth_user_id,
        phone: normalized,
        full_name: knownName || name || null,
      }
      setMadmonaSession(session)
      clearPendingLoginState()
      onSuccess(session)
    } catch (e) {
      setError('في مشكلة. حاول تاني.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>🕌</div>
        <h2 style={styles.title}>{title}</h2>

        {step === 'phone' && (
          <>
            <p style={styles.sub}>{subtitle}</p>
            <input
              type="tel"
              inputMode="tel"
              placeholder="01012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={styles.input}
              disabled={loading}
              autoFocus
            />
            <input
              type="text"
              placeholder="اسمك (اختياري)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
            {error && <div style={styles.err}>{error}</div>}
            <button
              onClick={requestCode}
              disabled={loading || phone.length < 10}
              style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'جاري الإرسال...' : 'ابعت كود الدخول'}
            </button>
            {onCancel && (
              <button onClick={onCancel} style={styles.btnGhost}>
                إلغاء
              </button>
            )}
          </>
        )}

        {step === 'code' && (
          <>
            <p style={styles.sub}>
              بعتنالك كود ولينك مباشر على الواتساب.
              <br />
              <strong>اضغط على اللينك في الواتساب وهيوديك للدخول تلقائي</strong>،
              أو انسخ الكود ولصقه هنا.
            </p>
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ ...styles.input, ...styles.otpInput }}
              disabled={loading}
              maxLength={6}
              autoComplete="one-time-code"
            />
            {error && <div style={styles.err}>{error}</div>}
            <button
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'جاري التأكيد...' : 'أكّد الدخول'}
            </button>
            <button
              onClick={() => {
                setStep('phone')
                setCode('')
                setError('')
                clearPendingLoginState()
              }}
              style={styles.btnGhost}
            >
              غيّر الرقم
            </button>
            <div style={styles.hint}>
              📱 لو ضغطت على اللينك في الواتساب، الصفحة دي هترجع تلقائي
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'Cairo, -apple-system, system-ui, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '32px 24px',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    textAlign: 'center',
  },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { margin: '0 0 8px', fontSize: 22, color: '#059669', fontWeight: 700 },
  sub: { color: '#666', margin: '0 0 20px', lineHeight: 1.6, fontSize: 14 },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 16,
    border: '1.5px solid #E8E8E0',
    borderRadius: 12,
    marginBottom: 12,
    fontFamily: 'inherit',
    textAlign: 'right',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#FAFAF7',
    direction: 'ltr',
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: '0.4em',
    fontSize: 24,
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  err: {
    color: '#c94b4b',
    fontSize: 14,
    marginBottom: 12,
    background: '#fef0f0',
    padding: '10px 14px',
    borderRadius: 8,
    textAlign: 'right',
  },
  btn: {
    width: '100%',
    background: 'linear-gradient(135deg,#D4AF37 0%, #2FA084 100%)',
    color: '#fff',
    border: 'none',
    padding: '14px',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  btnGhost: {
    width: '100%',
    background: 'transparent',
    color: '#059669',
    border: 'none',
    padding: '12px',
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  hint: {
    marginTop: 16,
    padding: '10px 14px',
    background: '#F0F7F4',
    borderRadius: 8,
    fontSize: 13,
    color: '#059669',
    lineHeight: 1.5,
  },
}
