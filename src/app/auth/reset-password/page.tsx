'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowRight, Lock, AlertCircle, Loader2, KeyRound, CheckCircle, Eye, EyeOff, Sparkles, ShieldCheck,
} from 'lucide-react'

// ============================================================================
// /auth/reset-password?token=XXX
//
// Page user lands on from the email reset link.
// Validates token, lets user set a new password.
// ============================================================================

type Stage = 'loading' | 'invalid' | 'expired' | 'used' | 'ready' | 'success'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [stage, setStage] = useState<Stage>('loading')
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setStage('invalid')
      return
    }
    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (data.valid) {
          setMaskedEmail(data.masked_email || null)
          setStage('ready')
        } else if (data.error === 'expired') {
          setStage('expired')
        } else if (data.error === 'used') {
          setStage('used')
        } else {
          setStage('invalid')
        }
      } catch {
        setStage('invalid')
      }
    }
    verify()
  }, [token])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('كلمة السر لازم تكون 8 حروف على الأقل')
      return
    }
    if (password !== confirmPassword) {
      setError('كلمتين السر مش متطابقتين')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'حصل خطأ، حاول تاني')
        setSubmitting(false)
        return
      }

      setStage('success')
      setSubmitting(false)
    } catch {
      setError('حصل خطأ في الاتصال. حاول تاني.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1F5F3F]/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#B8860B]/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

      <header className="relative z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/auth/login" className="w-9 h-9 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-full flex items-center justify-center transition-all">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-slide-up">
          {/* Loading */}
          {stage === 'loading' && (
            <div className="bg-white rounded-3xl shadow-luxe p-10 text-center">
              <Loader2 className="w-8 h-8 text-[#1F5F3F] animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-600">جاري التحقق من اللينك...</p>
            </div>
          )}

          {/* Invalid token */}
          {(stage === 'invalid' || stage === 'expired' || stage === 'used') && (
            <div className="bg-white rounded-3xl shadow-luxe p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-black mb-3">
                {stage === 'expired' && 'اللينك انتهت صلاحيته'}
                {stage === 'used' && 'اللينك اتستخدم بالفعل'}
                {stage === 'invalid' && 'اللينك مش صحيح'}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                {stage === 'expired' && 'اللينك ده كان صالح لمدة ساعة بس. اطلب لينك جديد.'}
                {stage === 'used' && 'كلمة السر اتغيرت بالفعل بستخدام اللينك ده. لو محتاج تغيرها تاني، اطلب لينك جديد.'}
                {stage === 'invalid' && 'اللينك مش معروف. ممكن يكون اتغير أو اتمسح.'}
              </p>
              <Link
                href="/auth/forgot-password"
                className="inline-flex items-center gap-2 bg-[#1F5F3F] text-white px-6 py-3.5 rounded-xl font-bold shadow-elevated hover:shadow-luxe transition-all no-underline"
              >
                <KeyRound className="w-4 h-4" />
                اطلب لينك جديد
              </Link>
            </div>
          )}

          {/* Success — password updated */}
          {stage === 'success' && (
            <div className="bg-white rounded-3xl shadow-luxe p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-black mb-3">تم! ✓</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                كلمة السر اتحدّثت بنجاح. تقدر تسجل دخول دلوقتي بكلمة السر الجديدة.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 bg-[#1F5F3F] text-white px-6 py-3.5 rounded-xl font-bold shadow-elevated hover:shadow-luxe transition-all no-underline"
              >
                سجّل دخول
                <ArrowRight className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          )}

          {/* Form — token valid, set new password */}
          {stage === 'ready' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur rounded-full mb-4 shadow-soft">
                  <Sparkles className="w-3 h-3 text-[#B8860B]" />
                  <span className="text-xs font-bold text-gray-700">مضمونة · Madmona</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
                  كلمة سر <span className="gradient-text-green">جديدة</span>
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                  حدّد كلمة سر جديدة لحسابك
                  {maskedEmail && (
                    <span className="block text-xs text-gray-400 mt-1" dir="ltr">{maskedEmail}</span>
                  )}
                </p>
              </div>

              <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
                <div className="mb-4 p-3 bg-[#1F5F3F]/5 border border-[#1F5F3F]/15 rounded-xl flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1F5F3F] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#1F5F3F]/90 leading-relaxed">
                    اختار كلمة سر قوية: 8 حروف أو أكتر، وتجمع بين أحرف وأرقام.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-[#1F5F3F]" />
                      كلمة السر الجديدة
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all pl-12"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                        autoComplete="new-password"
                        autoFocus
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 hover:bg-gray-100 rounded-lg flex items-center justify-center text-gray-500"
                        aria-label={showPassword ? 'إخفاء' : 'إظهار'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password.length > 0 && password.length < 8 && (
                      <p className="text-[11px] text-orange-600 mt-1.5">
                        محتاج {8 - password.length} حرف كمان
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-[#1F5F3F]" />
                      تأكيد كلمة السر
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all"
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                      autoComplete="new-password"
                      required
                    />
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <p className="text-[11px] text-red-600 mt-1.5">
                        كلمتين السر مش متطابقتين
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 animate-scale-in">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !password || !confirmPassword || password.length < 8 || password !== confirmPassword}
                    className="w-full bg-[#1F5F3F] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري التحديث...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        حدّث كلمة السر
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F5F3F] animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
