'use client'

// ============================================================================
// /auth/signup — إنشاء حساب برقم التليفون + باسورد (8 Aug 2026)
//
// Flow (backed by the `phone-auth` edge function):
//   1. الاسم + الرقم + الباسورد  → phone-auth {action:'signup_start'}
//      → المارد يبعت كود ٦ أرقام على واتساب
//   2. المستخدم يكتب الكود        → phone-auth {action:'signup_verify'}
//      → الحساب يتعمل مؤكّد + دخول تلقائي + توحيد جلسة المارد (whoami)
//
// Preserved from the old page: claim-token hand-off from /add-listing/success
// and the /list-your-asset prefills. Google signup still available on top.
// ============================================================================

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone } from '@/lib/auth-helpers'
import { saveAccount } from '@/lib/saved-accounts'
import { syncModuleSession } from '@/lib/madmonaSession'
import {
  ArrowRight, Phone, Lock, User, AlertCircle, Loader2, UserPlus,
  Sparkles, MessageCircle, RotateCcw, PencilLine,
} from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'

const PHONE_AUTH_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/phone-auth`

async function phoneAuth(body: Record<string, unknown>) {
  const res = await fetch(PHONE_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ success: boolean; error?: string; [k: string]: unknown }>
}

// 🌍 (٢٧ أغسطس ٢٠٢٦) الدالة دي بره الكومبوننت فمفيش عندها useT —
// فبناخد t كباراميتر بدل ما نستدعي الهوك (ممنوع بره الكومبوننت).
function friendlyError(t: (k: string) => string, code?: string): string {
  switch (code) {
    case 'phone_exists':
      return t('su.exists')
    case 'invalid_code':
      return t('su.bad_code')
    case 'weak_password':
      return t('su.pw_short')
    case 'phone_required':
    case 'missing_params':
      return t('su.missing')
    default:
      if (code && /rate|limit|10/.test(code)) return t('su.rate')
      return code || t('su.generic')
  }
}

function SignupContent() {
  const { dir, t } = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/account'
  // Claim token from /add-listing/success — append to post-signup URL so
  // MadmonaListingClaimer can pick it up and convert the draft into a real listing.
  const claimToken = searchParams.get('token')
  const finalRedirect = claimToken
    ? `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}token=${encodeURIComponent(claimToken)}`
    : redirectTo

  // Pre-fill from /list-your-asset hand-off
  const prefilledName = searchParams.get('name') || ''
  const prefilledPhone = searchParams.get('phone') || ''

  const [step, setStep] = useState<'form' | 'code'>('form')
  const [fullName, setFullName] = useState(prefilledName)
  const [phone, setPhone] = useState(prefilledPhone)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const normalizedRef = useRef<string>('')

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [resendIn])

  const startSignup = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    setError(null)

    if (fullName.trim().length < 2) {
      setError(t('su.err_name'))
      return
    }
    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError(t('su.err_phone'))
      return
    }
    if (password.length < 8) {
      setError(t('su.pw_short'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('su.err_match'))
      return
    }

    normalizedRef.current = normalized
    setSubmitting(true)
    try {
      const out = await phoneAuth({
        action: 'signup_start',
        phone: normalized,
        full_name: fullName.trim(),
      })
      if (!out.success) {
        setError(friendlyError(t, out.error))
        return
      }
      setStep('code')
      setResendIn(60)
    } catch {
      setError(t('su.net'))
    } finally {
      setSubmitting(false)
    }
  }

  const resendCode = async () => {
    if (resendIn > 0 || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const out = await phoneAuth({
        action: 'signup_start',
        phone: normalizedRef.current,
        full_name: fullName.trim(),
      })
      if (!out.success) setError(friendlyError(t, out.error))
      else setResendIn(60)
    } catch {
      setError(t('su.net'))
    } finally {
      setSubmitting(false)
    }
  }

  const verifyAndCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (code.trim().length < 4) {
      setError(t('su.err_code_empty'))
      return
    }

    setSubmitting(true)
    try {
      const normalized = normalizedRef.current
      const out = await phoneAuth({
        action: 'signup_verify',
        phone: normalized,
        code: code.trim(),
        password,
        full_name: fullName.trim(),
      })
      if (!out.success) {
        setError(friendlyError(t, out.error))
        return
      }

      // الحساب اتعمل مؤكّد — دخول مباشر بنفس الباسورد
      const { error: signInErr } = await supabaseBrowser.auth.signInWithPassword({
        phone: normalized.slice(1), // '+2010...' -> '2010...'
        password,
      })
      if (signInErr) {
        // الحساب موجود — وجّهه لصفحة الدخول بالرقم جاهز
        router.push(`/auth/login?phone=${encodeURIComponent(normalized)}`)
        return
      }

      try { saveAccount(normalized, fullName.trim() || normalized, 'customer') } catch {}
      try { await syncModuleSession() } catch {}

      router.push(finalRedirect)
      router.refresh()
    } catch {
      setError(t('su.net'))
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#059669]/40 focus:ring-4 focus:ring-[#059669]/10 transition-all'

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir={dir}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#34D399]/5 rounded-full blur-3xl animate-float pointer-events-none" />
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
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur rounded-full mb-4 shadow-soft">
              <Sparkles className="w-3 h-3 text-[#2FA084]" />
              <span className="text-xs font-bold text-gray-700">{t('su.brand')}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              {step === 'form' ? (
                <>{t('su.h_create_1')} <span className="gradient-text-green">{t('su.h_create_2')}</span> {t('su.h_create_3')}</>
              ) : (
                <>{t('su.h_code_1')} <span className="gradient-text-green">{t('su.h_code_2')}</span> {t('su.h_code_3')}</>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {step === 'form'
                ? t('su.sub_form')
                : t('su.sub_code')}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
            {step === 'form' && (
              <>
                <GoogleSignInButton redirectTo={finalRedirect} label={t('su.google')} />

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px bg-gray-100 flex-1" />
                  <span className="text-[11px] text-gray-400 font-bold">{t('su.or_phone')}</span>
                  <div className="h-px bg-gray-100 flex-1" />
                </div>

                <form onSubmit={startSignup} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-[#059669]" />
                      {t('su.name')}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t('su.name_ph')}
                      className={inputCls}
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <Phone className="w-3.5 h-3.5 text-[#059669]" />
                      {t('su.phone')}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className={inputCls}
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                      autoComplete="tel"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-[#059669]" />
                      {t('su.password')}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('su.pw_ph')}
                      className={inputCls}
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-[#059669]" />
                      {t('su.pw_confirm')}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputCls}
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 animate-scale-in">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        {error}
                        {error.includes('حساب بالفعل') && (
                          <>
                            {' '}
                            <Link href={`/auth/login?phone=${encodeURIComponent(phone)}`} className="font-bold underline">
                              {t('su.login_here')}
                            </Link>
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#34D399] text-[#04352A] py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-elevated transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('su.one_sec')}</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        {t('su.send_code')}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {step === 'code' && (
              <form onSubmit={verifyAndCreate} className="space-y-5">
                <div className="flex items-center justify-center gap-2 p-3 bg-[#34D399]/5 rounded-2xl text-sm text-[#059669] font-bold">
                  <MessageCircle className="w-4 h-4" />
                  <span dir="ltr">{normalizedRef.current}</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    {t('su.wa_code')}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="——————"
                    className={`${inputCls} text-center text-2xl tracking-[0.5em] font-black`}
                    dir="ltr"
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 animate-scale-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || code.length < 4}
                  className="w-full bg-[#34D399] text-[#04352A] py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-elevated transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('su.creating')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      {t('su.confirm_open')}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setCode(''); setError(null) }}
                    className="font-bold text-gray-400 hover:text-[#059669] transition-colors flex items-center gap-1"
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    {t('su.change_data')}
                  </button>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={resendIn > 0 || submitting}
                    className="font-bold text-[#059669] disabled:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {resendIn > 0 ? t('su.resend_in', { n: resendIn }) : t('su.resend')}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-500 leading-relaxed">
              {t('su.have_account')}{' '}
              <Link href="/auth/login" className="text-[#059669] font-bold hover:underline">
                {t('su.login')}
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            {t('su.terms_pre')}{' '}
            <Link href="/terms" className="text-[#059669] font-semibold hover:underline">{t('sf.terms')}</Link>
            {' '}{t('su.and')}{' '}
            <Link href="/privacy" className="text-[#059669] font-semibold hover:underline">{t('sf.privacy')}</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
