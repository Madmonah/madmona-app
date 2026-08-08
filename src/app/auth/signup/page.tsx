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

function friendlyError(code?: string): string {
  switch (code) {
    case 'phone_exists':
      return 'الرقم ده عليه حساب بالفعل — سجّل دخول أو استرجع كلمة السر.'
    case 'invalid_code':
      return 'الكود غلط أو انتهت صلاحيته — جرّب تاني أو اطلب كود جديد.'
    case 'weak_password':
      return 'كلمة السر لازم تكون ٨ حروف على الأقل.'
    case 'phone_required':
    case 'missing_params':
      return 'في بيانات ناقصة — راجع الخانات وجرّب تاني.'
    default:
      if (code && /rate|limit|10/.test(code)) return 'طلبت أكواد كتير — استنى شوية وجرّب تاني.'
      return code || 'حصلت مشكلة — جرّب تاني.'
  }
}

function SignupContent() {
  const { dir } = useT()
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
      setError('اكتب اسمك بالكامل.')
      return
    }
    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError('اكتب رقم موبايل مصري صحيح (01XXXXXXXXX).')
      return
    }
    if (password.length < 8) {
      setError('كلمة السر لازم تكون ٨ حروف على الأقل.')
      return
    }
    if (password !== confirmPassword) {
      setError('كلمتين السر مش زي بعض.')
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
        setError(friendlyError(out.error))
        return
      }
      setStep('code')
      setResendIn(60)
    } catch {
      setError('النت فصل لحظة — جرّب تاني.')
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
      if (!out.success) setError(friendlyError(out.error))
      else setResendIn(60)
    } catch {
      setError('النت فصل لحظة — جرّب تاني.')
    } finally {
      setSubmitting(false)
    }
  }

  const verifyAndCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (code.trim().length < 4) {
      setError('اكتب الكود اللي وصلك على واتساب.')
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
        setError(friendlyError(out.error))
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
      setError('النت فصل لحظة — جرّب تاني.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all'

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir={dir}>
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
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur rounded-full mb-4 shadow-soft">
              <Sparkles className="w-3 h-3 text-[#2FA084]" />
              <span className="text-xs font-bold text-gray-700">مضمونة · Madmona</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              {step === 'form' ? (
                <>اعمل <span className="gradient-text-green">حسابك</span> في دقيقة</>
              ) : (
                <>اكتب <span className="gradient-text-green">الكود</span> اللي وصلك</>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {step === 'form'
                ? 'رقم موبايلك + كلمة سر — وهنأكد الرقم بكود على واتساب'
                : 'المارد بعتلك كود ٦ أرقام على واتساب — صالح ١٠ دقايق'}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
            {step === 'form' && (
              <>
                <GoogleSignInButton redirectTo={finalRedirect} label="اعمل حساب بـ Google" />

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px bg-gray-100 flex-1" />
                  <span className="text-[11px] text-gray-400 font-bold">أو برقم موبايلك</span>
                  <div className="h-px bg-gray-100 flex-1" />
                </div>

                <form onSubmit={startSignup} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-[#1F6F5F]" />
                      الاسم
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="اسمك بالكامل"
                      className={inputCls}
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <Phone className="w-3.5 h-3.5 text-[#1F6F5F]" />
                      رقم الموبايل (واتساب)
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
                      <Lock className="w-3.5 h-3.5 text-[#1F6F5F]" />
                      كلمة السر
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="٨ حروف على الأقل"
                      className={inputCls}
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-[#1F6F5F]" />
                      تأكيد كلمة السر
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
                              سجّل دخول من هنا
                            </Link>
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#1F6F5F] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-elevated transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ثانية واحدة…</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        ابعتلي كود التأكيد على واتساب
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {step === 'code' && (
              <form onSubmit={verifyAndCreate} className="space-y-5">
                <div className="flex items-center justify-center gap-2 p-3 bg-[#1F6F5F]/5 rounded-2xl text-sm text-[#1F6F5F] font-bold">
                  <MessageCircle className="w-4 h-4" />
                  <span dir="ltr">{normalizedRef.current}</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    كود الواتساب
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
                  className="w-full bg-[#1F6F5F] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-elevated transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>بنعمل الحساب…</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      أكّد وافتح حسابي
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setCode(''); setError(null) }}
                    className="font-bold text-gray-400 hover:text-[#1F6F5F] transition-colors flex items-center gap-1"
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    غيّر البيانات
                  </button>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={resendIn > 0 || submitting}
                    className="font-bold text-[#1F6F5F] disabled:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ث` : 'ابعت الكود تاني'}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-500 leading-relaxed">
              عندك حساب بالفعل؟{' '}
              <Link href="/auth/login" className="text-[#1F6F5F] font-bold hover:underline">
                سجّل دخول
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            بإنشاء الحساب انت موافق على{' '}
            <Link href="/terms" className="text-[#1F6F5F] font-semibold hover:underline">الشروط</Link>
            {' '}و{' '}
            <Link href="/privacy" className="text-[#1F6F5F] font-semibold hover:underline">الخصوصية</Link>
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
        <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
