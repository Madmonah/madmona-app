'use client'

// ============================================================================
// /auth/forgot-password — استرجاع كلمة السر (8 Aug 2026)
//
// Flow (backed by the `phone-auth` edge function):
//   1. المستخدم يكتب رقمه ويختار القناة:
//        واتساب من المارد  → phone-auth {action:'forgot_start', channel:'whatsapp'}
//        إيميل من Brevo     → phone-auth {action:'forgot_start', channel:'email'}
//   2. يكتب الكود + كلمة السر الجديدة → {action:'forgot_reset'}
//      → دخول تلقائي بالباسورد الجديد + توحيد جلسة المارد (whoami)
//
// (استبدلت النسخة القديمة اللي كانت بتشتغل بالإيميل بس عبر
//  /api/auth/forgot-password — دي كانت معطّلة من ساعة ما Resend اتقفل.)
// ============================================================================

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone } from '@/lib/auth-helpers'
import { syncModuleSession } from '@/lib/madmonaSession'
import {
  ArrowRight, Phone, Lock, AlertCircle, Loader2, KeyRound, CheckCircle,
  MessageCircle, Mail, Sparkles, RotateCcw, PencilLine,
} from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'

const PHONE_AUTH_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/phone-auth`

async function phoneAuth(body: Record<string, unknown>) {
  const res = await fetch(PHONE_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ success: boolean; error?: string; sent_to?: string }>
}

function friendlyError(code?: string): string {
  switch (code) {
    case 'no_account_with_phone':
      return 'مفيش حساب مسجّل بالرقم ده.'
    case 'no_email_on_account':
      return 'حسابك مالوش إيميل متسجّل — استخدم الواتساب بدله.'
    case 'invalid_code':
      return 'الكود غلط أو انتهت صلاحيته — جرّب تاني أو اطلب كود جديد.'
    case 'weak_password':
      return 'كلمة السر الجديدة لازم تكون ٨ حروف على الأقل.'
    default:
      if (code && /rate|limit|10/.test(code)) return 'طلبت أكواد كتير — استنى شوية وجرّب تاني.'
      return code || 'حصلت مشكلة — جرّب تاني.'
  }
}

function ForgotContent() {
  const { dir } = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledPhone = searchParams.get('phone') || ''

  const [step, setStep] = useState<'phone' | 'reset' | 'done'>('phone')
  const [phone, setPhone] = useState(prefilledPhone)
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const normalizedRef = useRef<string>('')

  useEffect(() => {
    if (resendIn <= 0) return
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [resendIn])

  const sendCode = async (via: 'whatsapp' | 'email', e?: FormEvent) => {
    e?.preventDefault()
    setError(null)

    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError('اكتب رقم موبايل مصري صحيح (01XXXXXXXXX).')
      return
    }
    normalizedRef.current = normalized
    setChannel(via)
    setSubmitting(true)
    try {
      const out = await phoneAuth({ action: 'forgot_start', phone: normalized, channel: via })
      if (!out.success) {
        setError(friendlyError(out.error))
        return
      }
      setSentTo(out.sent_to || (via === 'whatsapp' ? normalized : ''))
      setStep('reset')
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
        action: 'forgot_start',
        phone: normalizedRef.current,
        channel,
      })
      if (!out.success) setError(friendlyError(out.error))
      else setResendIn(60)
    } catch {
      setError('النت فصل لحظة — جرّب تاني.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (code.trim().length < 4) {
      setError('اكتب الكود اللي وصلك.')
      return
    }
    if (newPassword.length < 8) {
      setError('كلمة السر الجديدة لازم تكون ٨ حروف على الأقل.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتين السر مش زي بعض.')
      return
    }

    setSubmitting(true)
    try {
      const normalized = normalizedRef.current
      const out = await phoneAuth({
        action: 'forgot_reset',
        phone: normalized,
        code: code.trim(),
        new_password: newPassword,
      })
      if (!out.success) {
        setError(friendlyError(out.error))
        return
      }

      // دخول تلقائي بالباسورد الجديد — native phone أولًا وبعدين الحسابات القديمة
      const intl = normalized.slice(1)
      const { error: phoneErr } = await supabaseBrowser.auth.signInWithPassword({
        phone: intl,
        password: newPassword,
      })
      if (phoneErr) {
        const { phoneToEmail } = await import('@/lib/auth-helpers')
        await supabaseBrowser.auth
          .signInWithPassword({ email: phoneToEmail(normalized), password: newPassword })
          .catch(() => null)
      }
      try { await syncModuleSession() } catch {}

      setStep('done')
      setTimeout(() => {
        router.push('/account')
        router.refresh()
      }, 1500)
    } catch {
      setError('النت فصل لحظة — جرّب تاني.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#FA8125]/40 focus:ring-4 focus:ring-[#FA8125]/10 transition-all'

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir={dir}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FA8125]/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#2FA084]/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

      <header className="relative z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/auth/login" className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all">
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
              {step === 'done' ? (
                <>اتغيّرت <span className="gradient-text-green">بنجاح</span> ✓</>
              ) : (
                <>نسيت <span className="gradient-text-green">كلمة السر؟</span></>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {step === 'phone' && 'اكتب رقمك واختار الكود يوصلك منين'}
              {step === 'reset' && `بعتنا الكود لـ ${sentTo} — صالح ١٠ دقايق`}
              {step === 'done' && 'ثانية واحدة وبنودّيك على حسابك…'}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
            {step === 'phone' && (
              <form onSubmit={(e) => sendCode('whatsapp', e)} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Phone className="w-3.5 h-3.5 text-[#FA8125]" />
                    رقم الموبايل
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
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 animate-scale-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {error}
                      {error.includes('مفيش حساب') && (
                        <>
                          {' '}
                          <Link href="/auth/signup" className="font-bold underline">اعمل حساب جديد</Link>
                        </>
                      )}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !phone}
                  className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {submitting && channel === 'whatsapp' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  كود واتساب من المارد
                </button>

                <button
                  type="button"
                  onClick={() => sendCode('email')}
                  disabled={submitting || !phone}
                  className="w-full bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-base hover:border-[#FA8125]/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {submitting && channel === 'email' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 text-[#FA8125]" />
                  )}
                  كود على الإيميل
                </button>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={resetPassword} className="space-y-5">
                <div className="flex items-center justify-center gap-2 p-3 bg-[#FA8125]/5 rounded-2xl text-sm text-[#FA8125] font-bold">
                  {channel === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  <span dir="ltr">{sentTo}</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    الكود
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

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5 text-[#FA8125]" />
                    كلمة السر الجديدة
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    <Lock className="w-3.5 h-3.5 text-[#FA8125]" />
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
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || code.length < 4 || !newPassword}
                  className="w-full bg-[#FA8125] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>بنغيّرها…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      غيّر كلمة السر وادخل
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setCode(''); setError(null) }}
                    className="font-bold text-gray-400 hover:text-[#FA8125] transition-colors flex items-center gap-1"
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    غيّر الرقم / القناة
                  </button>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={resendIn > 0 || submitting}
                    className="font-bold text-[#FA8125] disabled:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ث` : 'ابعت الكود تاني'}
                  </button>
                </div>
              </form>
            )}

            {step === 'done' && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-[#FA8125]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#FA8125]" />
                </div>
                <p className="text-sm text-gray-600">كلمة السر اتغيّرت ودخلت على حسابك ✓</p>
              </div>
            )}

            {step !== 'done' && (
              <p className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-500 leading-relaxed">
                افتكرتها؟{' '}
                <Link href="/auth/login" className="text-[#FA8125] font-bold hover:underline">
                  ارجع لتسجيل الدخول
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#FA8125] animate-spin" />
      </div>
    }>
      <ForgotContent />
    </Suspense>
  )
}
