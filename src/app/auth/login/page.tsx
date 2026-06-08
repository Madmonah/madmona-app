'use client'

import { Suspense, useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'
import { saveAccount } from '@/lib/saved-accounts'
import {
  ArrowRight, Phone, Lock, AlertCircle, Loader2, LogIn, Sparkles, KeyRound,
} from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'

function LoginContent() {
  const { t, dir } = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/account'
  const prefilledPhone = searchParams.get('phone') || ''

  const [phone, setPhone] = useState(prefilledPhone)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-fill phone from query param when account switcher redirects here
  useEffect(() => {
    if (prefilledPhone) {
      setPhone(prefilledPhone)
    }
  }, [prefilledPhone])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError(t('auth.err_phone'))
      return
    }
    if (!password) {
      setError(t('auth.err_password_short'))
      return
    }

    setSubmitting(true)

    // 1) Employee login first: phone + PIN (e.g. the 4-digit clock-in PIN) -> /me.
    //    Employees have NO minimum-length rule — any PIN works.
    try {
      // @ts-expect-error rpc typing
      const { data: emp } = await supabaseBrowser.rpc('employee_login_phone_pin', {
        p_phone: normalized, p_pin: password,
      })
      if (emp?.success) {
        localStorage.setItem('madmona_token', emp.token)
        router.push('/me')
        return
      }
    } catch {
      /* not an employee — fall through to customer login */
    }

    // A short credential that wasn't a valid employee PIN can't be a customer password.
    if (password.length < 6) {
      setError('رقم التليفون أو الـ PIN غلط')
      setSubmitting(false)
      return
    }

    // 2) Customer account login (phone -> email + password via Supabase Auth).
    const email = phoneToEmail(normalized)

    const { error: signInErr, data: signInData } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    })

    if (signInErr) {
      console.error('[auth/login] sign in error:', signInErr)
      if (signInErr.message.includes('Invalid login credentials')) {
        setError(t('auth.err_invalid_creds'))
      } else if (signInErr.message.includes('Email not confirmed')) {
        setError(t('auth.err_not_confirmed'))
      } else {
        setError(signInErr.message || t('auth.err_generic'))
      }
      setSubmitting(false)
      return
    }

    // Save account to localStorage for fast switching later
    try {
      if (signInData?.user?.id) {
        // @ts-expect-error
        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('full_name, role')
          .eq('id', signInData.user.id)
          .maybeSingle()

        const label = profile?.full_name || normalized
        const role = profile?.role || 'customer'
        saveAccount(normalized, label, role)
      } else {
        saveAccount(normalized, normalized)
      }
    } catch (e) {
      // Silent fail — saving is nice-to-have
      console.warn('[auth/login] saveAccount failed:', e)
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir={dir}>
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1F6F5F]/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#2FA084]/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

      <header className="relative z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-slide-up">
          {/* Brand badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur rounded-full mb-4 shadow-soft">
              <Sparkles className="w-3 h-3 text-[#2FA084]" />
              <span className="text-xs font-bold text-gray-700">{t('common.brand')} · Madmona</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              {prefilledPhone ? (
                <>{t('auth.switch_pre')} <span className="gradient-text-green">{t('auth.account_word')}</span></>
              ) : (
                <>{t('auth.welcome_pre')} <span className="gradient-text-green">{t('auth.welcome_emph')}</span></>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {prefilledPhone ? t('auth.sub_switch') : t('auth.sub_login')}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Phone className="w-3.5 h-3.5 text-[#1F6F5F]" />
                  {t('auth.phone_label')}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="tel"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5 text-[#1F6F5F]" />
                    {t('auth.password_label')}
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[11px] font-bold text-[#1F6F5F] hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    {t('auth.forgot')}
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="current-password"
                  autoFocus={!!prefilledPhone}
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1.5">
                  موظف؟ اكتب رقمك والـ PIN بتاع البصمة في خانة الباسورد وهتدخل على حسابك على طول.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 animate-scale-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !phone || !password}
                className="w-full bg-[#1F6F5F] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-elevated transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('auth.logging_in')}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {t('auth.login_btn')}
                  </>
                )}
              </button>
            </form>

            {/* Social login */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px bg-gray-100 flex-1" />
              <span className="text-[11px] text-gray-400 font-bold">أو</span>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <GoogleSignInButton redirectTo={redirectTo} label="سجّل دخول بـ Google" />

            <div className="mt-7 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-2">{t('auth.no_account_yet')}</p>
              <Link
                href={`/auth/signup${redirectTo !== '/account' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="inline-flex items-center gap-1 text-[#1F6F5F] font-bold hover:gap-2 transition-all no-underline"
              >
                {t('auth.create_account')}
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            {t('auth.terms_pre')}{' '}
            <Link href="/terms" className="text-[#1F6F5F] font-semibold hover:underline">
              {t('auth.terms_link')}
            </Link>
            {' '}{t('auth.terms_and')}{' '}
            <Link href="/privacy" className="text-[#1F6F5F] font-semibold hover:underline">
              {t('auth.privacy_link')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
