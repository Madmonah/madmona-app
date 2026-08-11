'use client'

// ============================================================================
// /account/email — إضافة/تغيير الإيميل الحقيقي (8 Aug 2026)
//
// المشكلة اللي بتحلها: 283 حساب قديم متعمل له إيميل مصطنع (2010...@madmonacairo.com)
// مش صندوق حقيقي — فأكواد الاسترجاع والإشعارات كانت بتضيع في الفراغ.
//
// Flow (backed by `phone-auth` v2 — authed actions):
//   1. المستخدم يكتب إيميله الحقيقي → email_change_start → كود 6 أرقام عبر Brevo
//   2. يكتب الكود → email_change_verify → الإيميل يتسجّل مؤكَّد على حسابه
// ============================================================================

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import toast, { Toaster } from 'react-hot-toast'
import {
  ArrowRight, Loader2, Mail, AlertCircle, CheckCircle, ShieldCheck,
  RotateCcw, PencilLine, Send,
} from 'lucide-react'

const PHONE_AUTH_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/phone-auth`

// نفس تعريف السيرفر: أرقام فقط قبل @madmonacairo.com = إيميل مصطنع من النظام
const SYNTHETIC_EMAIL = /^[0-9]+@madmonacairo\.com$/i

async function phoneAuth(body: Record<string, unknown>, accessToken: string) {
  const res = await fetch(PHONE_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ success: boolean; error?: string; sent_to?: string; email?: string }>
}

function friendlyError(code?: string): string {
  switch (code) {
    case 'invalid_email':
      return 'اكتب إيميل صحيح (مثال: name@gmail.com).'
    case 'email_taken':
      return 'الإيميل ده مستخدم على حساب تاني بالفعل.'
    case 'invalid_code':
      return 'الكود غلط أو انتهت صلاحيته — جرّب تاني أو اطلب كود جديد.'
    case 'not_authenticated':
      return 'جلستك انتهت — سجّل دخول تاني.'
    default:
      return code || 'حصلت مشكلة — جرّب تاني.'
  }
}

export default function AccountEmailPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState('')
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  const [step, setStep] = useState<'view' | 'form' | 'code' | 'done'>('view')
  const [newEmail, setNewEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const emailRef = useRef('')

  const isSynthetic = !currentEmail || SYNTHETIC_EMAIL.test(currentEmail)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabaseBrowser.auth.getSession()
      if (!data.session) {
        router.replace('/auth/login?redirect=/account/email')
        return
      }
      setAccessToken(data.session.access_token)
      setCurrentEmail(data.session.user.email || null)
      setLoading(false)
    })()
  }, [router])

  useEffect(() => {
    if (resendIn <= 0) return
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [resendIn])

  const startChange = async (e?: FormEvent) => {
    e?.preventDefault()
    setError(null)
    const email = newEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError('اكتب إيميل صحيح (مثال: name@gmail.com).')
      return
    }
    emailRef.current = email
    setSubmitting(true)
    try {
      const out = await phoneAuth({ action: 'email_change_start', new_email: email }, accessToken)
      if (!out.success) {
        setError(friendlyError(out.error))
        return
      }
      setSentTo(out.sent_to || email)
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
      const out = await phoneAuth(
        { action: 'email_change_start', new_email: emailRef.current },
        accessToken,
      )
      if (!out.success) setError(friendlyError(out.error))
      else setResendIn(60)
    } catch {
      setError('النت فصل لحظة — جرّب تاني.')
    } finally {
      setSubmitting(false)
    }
  }

  const verifyChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (code.trim().length < 4) {
      setError('اكتب الكود اللي وصلك على الإيميل.')
      return
    }
    setSubmitting(true)
    try {
      const out = await phoneAuth(
        { action: 'email_change_verify', new_email: emailRef.current, code: code.trim() },
        accessToken,
      )
      if (!out.success) {
        setError(friendlyError(out.error))
        return
      }
      // حدّث الجلسة المحلية عشان الإيميل الجديد يظهر في كل حتة
      try { await supabaseBrowser.auth.refreshSession() } catch {}
      setCurrentEmail(out.email || emailRef.current)
      setStep('done')
      toast.success('إيميلك اتسجّل واتأكد ✓')
    } catch {
      setError('النت فصل لحظة — جرّب تاني.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#FA8125]/40 focus:ring-4 focus:ring-[#FA8125]/10 transition-all'

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <Toaster position="top-center" />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/account"
            className="w-9 h-9 bg-[#FAFAF7] hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black text-gray-900">الإيميل</h1>
            <p className="text-[11px] text-gray-500">عشان الأكواد والإشعارات توصلك في مكان حقيقي</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#FA8125] animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {/* الحالة الحالية */}
            {step === 'view' && (
              <>
                {isSynthetic ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900 mb-1">حسابك شغال بإيميل مؤقت من النظام</p>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          أكواد استرجاع كلمة السر والإشعارات بالإيميل مش بتوصلك.
                          ضيف إيميلك الحقيقي مرة واحدة وهنأكده بكود — وخلاص.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl shadow-soft p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#FA8125]/10 text-[#FA8125] flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate" dir="ltr" style={{ textAlign: 'right' }}>
                          {currentEmail}
                        </p>
                        <p className="text-[11px] text-[#FA8125] font-bold flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> إيميل مؤكَّد
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setStep('form'); setError(null) }}
                  className="w-full bg-[#FA8125] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  {isSynthetic ? 'ضيف إيميلك الحقيقي' : 'غيّر الإيميل'}
                </button>
              </>
            )}

            {/* إدخال الإيميل الجديد */}
            {step === 'form' && (
              <form onSubmit={startChange} className="bg-white rounded-3xl shadow-soft p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 text-[#FA8125]" />
                    الإيميل الجديد
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className={inputCls}
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                    autoComplete="email"
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
                  disabled={submitting || !newEmail}
                  className="w-full bg-[#FA8125] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  ابعتلي كود التأكيد
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('view'); setError(null) }}
                  className="w-full text-center text-xs font-bold text-gray-400 hover:text-[#FA8125] transition-colors"
                >
                  رجوع
                </button>
              </form>
            )}

            {/* كود التأكيد */}
            {step === 'code' && (
              <form onSubmit={verifyChange} className="bg-white rounded-3xl shadow-soft p-6 space-y-5">
                <div className="flex items-center justify-center gap-2 p-3 bg-[#FA8125]/5 rounded-2xl text-sm text-[#FA8125] font-bold">
                  <Mail className="w-4 h-4" />
                  <span dir="ltr">{sentTo}</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    الكود اللي وصلك
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
                  <p className="text-[11px] text-gray-500 mt-1.5">مش لاقيه؟ بص في فولدر السبام.</p>
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
                  className="w-full bg-[#FA8125] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  أكّد الإيميل
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setCode(''); setError(null) }}
                    className="font-bold text-gray-400 hover:text-[#FA8125] transition-colors flex items-center gap-1"
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    غيّر الإيميل
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

            {/* تم */}
            {step === 'done' && (
              <div className="bg-white rounded-3xl shadow-soft p-8 text-center">
                <div className="w-16 h-16 bg-[#FA8125]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#FA8125]" />
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1" dir="ltr">{currentEmail}</p>
                <p className="text-xs text-gray-500 mb-6">
                  اتسجّل واتأكد — من دلوقتي أكواد الاسترجاع والإشعارات هتوصلك هنا.
                </p>
                <Link
                  href="/account"
                  className="inline-block bg-[#FA8125] text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-elevated hover:-translate-y-0.5 transition-all"
                >
                  رجوع لحسابي
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
