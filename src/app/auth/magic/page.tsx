// src/app/auth/magic/page.tsx
// Madmona Magic Link handler
// The WhatsApp link points here → we verify the token → store the session → redirect home
// This is the fix for: "بيطلب ابعت كود، ابعته، ألاقي نفسي لازم اطلع من الواتس وأدخل تاني على الأبليكيشن ألاقي صفحة بيضا"

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Status = 'verifying' | 'success' | 'error'

// معالج ماجيك-لينك بيعتمد على useSearchParams — dynamic عشان ماتوقعش الـ prerender
export const dynamic = 'force-dynamic'

export default function MagicLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    const token = searchParams.get('t')
    if (!token) {
      setStatus('error')
      setErrorMsg('لينك ناقص')
      return
    }

    // UUID sanity check
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(token)) {
      setStatus('error')
      setErrorMsg('لينك مش صحيح')
      return
    }

    const verify = async () => {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        const { data, error } = await supabase.rpc('madmona_verify_magic_link', {
          p_token: token,
        })

        if (error) {
          console.error('Magic verify RPC error:', error)
          setStatus('error')
          setErrorMsg('حصل خطأ، حاول تاني')
          return
        }

        if (!data?.success) {
          setStatus('error')
          setErrorMsg(data?.error || 'اللينك مش شغال')
          return
        }

        // Store session in localStorage — same-origin so main app can read it
        try {
          localStorage.setItem('madmona_session_token', data.token)
          localStorage.setItem('madmona_auth_user_id', data.auth_user_id)
          localStorage.setItem('madmona_phone', data.phone)
          if (data.full_name) localStorage.setItem('madmona_full_name', data.full_name)
          localStorage.setItem('madmona_session', JSON.stringify(data))
          localStorage.setItem('is_logged_in', '1')
          sessionStorage.setItem('madmona_session', JSON.stringify(data))
        } catch (e) {
          console.warn('localStorage set failed', e)
        }

        // Set cookies as SSR fallback
        try {
          const maxAge = 60 * 60 * 24 * 30 // 30 days
          document.cookie = `madmona_session_token=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax`
          document.cookie = `madmona_auth_user_id=${data.auth_user_id}; path=/; max-age=${maxAge}; SameSite=Lax`
        } catch (e) {
          console.warn('cookie set failed', e)
        }

        setStatus('success')

        // Redirect after short delay to let animation finish
        setTimeout(() => {
          // Prefer stored return URL if any, else home
          let returnTo = '/'
          try {
            const stored = sessionStorage.getItem('madmona_return_to')
            if (stored && stored.startsWith('/')) {
              returnTo = stored
              sessionStorage.removeItem('madmona_return_to')
            }
          } catch (_) {}
          router.replace(returnTo)
        }, 800)
      } catch (e) {
        console.error('Magic verify exception:', e)
        setStatus('error')
        setErrorMsg('حصل خطأ، حاول تاني')
      }
    }

    verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAF7',
        fontFamily: 'Cairo, -apple-system, system-ui, sans-serif',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '32px 24px',
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite' }}>
          🕌
        </div>

        {status === 'verifying' && (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#059669' }}>
              مرحباً بك في مضمونة
            </h1>
            <p style={{ color: '#666', margin: 0 }}>جاري الدخول...</p>
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid #E8E8E0',
                borderTopColor: '#2FA084',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '24px auto 0',
              }}
            />
          </>
        )}

        {status === 'success' && (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 22, color: '#059669' }}>
              تم الدخول ✓
            </h1>
            <p style={{ color: '#666', margin: 0 }}>جاري توجيهك...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 style={{ margin: '0 0 12px', fontSize: 20, color: '#059669' }}>
              {errorMsg}
            </h1>
            <p style={{ margin: '0 0 24px', color: '#444', lineHeight: 1.6 }}>
              ممكن تحاول تاني من الأبليكيشن.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg,#D4AF37 0%, #2FA084 100%)',
                color: '#fff',
                padding: '14px 32px',
                borderRadius: 12,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              افتح مضمونة
            </a>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }
      `}</style>
    </div>
  )
}
