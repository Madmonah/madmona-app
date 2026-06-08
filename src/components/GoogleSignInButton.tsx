'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2 } from 'lucide-react'
import type { Provider } from '@supabase/supabase-js'

// ============================================================
// Social sign-in buttons (Google / Facebook / Apple-ready).
// Starts Supabase OAuth. After the provider, the user lands on
// /auth/callback which checks for a verified phone and, if
// missing, routes them to /auth/complete-phone (WhatsApp OTP).
// The callback + phone step are provider-agnostic.
// ============================================================
function SocialSignInButton({
  provider,
  redirectTo,
  label,
  variant,
}: {
  provider: Provider
  redirectTo: string
  label: string
  variant: 'light' | 'facebook'
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setLoading(true)
    try {
      const origin = window.location.origin
      const callback = `${origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
      const options: Record<string, unknown> = { redirectTo: callback }
      if (provider === 'google') options.queryParams = { prompt: 'select_account' }
      if (provider === 'facebook') options.scopes = 'email'
      const { error: oauthErr } = await supabaseBrowser.auth.signInWithOAuth({
        provider,
        options,
      })
      if (oauthErr) {
        console.error(`[SocialSignInButton:${provider}] oauth error:`, oauthErr)
        setError('حصلت مشكلة في الدخول، حاول تاني')
        setLoading(false)
      }
      // On success the browser redirects to the provider.
    } catch (e) {
      console.error(`[SocialSignInButton:${provider}] exception:`, e)
      setError('حصلت مشكلة، حاول تاني')
      setLoading(false)
    }
  }

  const base =
    'w-full py-3.5 rounded-2xl font-bold text-base shadow-soft hover:shadow-card hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-3'
  const styles =
    variant === 'facebook'
      ? 'bg-[#1877F2] border border-[#1877F2] text-white'
      : 'bg-white border border-gray-200 text-gray-700'

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={loading} className={`${base} ${styles}`}>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : provider === 'facebook' ? (
          <FacebookGlyph />
        ) : (
          <GoogleGlyph />
        )}
        <span>{label}</span>
      </button>
      {error && <p className="text-[11px] text-red-600 mt-2 text-center">{error}</p>}
    </div>
  )
}

export function GoogleSignInButton({
  redirectTo = '/account',
  label = 'كمّل بحساب Google',
}: {
  redirectTo?: string
  label?: string
}) {
  return <SocialSignInButton provider="google" redirectTo={redirectTo} label={label} variant="light" />
}

export function FacebookSignInButton({
  redirectTo = '/account',
  label = 'كمّل بحساب Facebook',
}: {
  redirectTo?: string
  label?: string
}) {
  return <SocialSignInButton provider="facebook" redirectTo={redirectTo} label={label} variant="facebook" />
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}

function FacebookGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#FFFFFF" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
