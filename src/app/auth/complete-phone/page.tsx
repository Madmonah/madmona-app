'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone } from '@/lib/auth-helpers'
import {
  Phone, ShieldCheck, AlertCircle, Loader2, CheckCircle, MessageCircle,
} from 'lucide-react'

function CompletePhoneContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/account'

  const [checkingSession, setCheckingSession] = useState(true)
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Must be logged in (via Google) to be here.
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        router.replace('/auth/login')
        return
      }
      setCheckingSession(false)
    })
  }, [router])

  const sendCode = async () => {
    setError(null)
    setInfo(null)
    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError('اكتب رقم موبايل مصري صح (مثال: 01XXXXXXXXX)')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.message || 'مقدرناش نبعت الكود، حاول تاني')
        setSubmitting(false)
        return
      }
      setStep('code')
      setInfo('بعتنالك كود على الواتس اب 📲')
    } catch (e) {
      console.error('[complete-phone] send error:', e)
      setError('حصلت مشكلة، حاول تاني')
    }
    setSubmitting(false)
  }

  const verifyCode = async () => {
    setError(null)
    setInfo(null)
    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError('رقم التليفون مش صحيح')
      setStep('phone')
      return
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('الكود لازم يكون 6 أرقام')
      return
    }
    setSubmitting(true)
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        router.replace('/auth/login')
        return
      }
      const res = await fetch('/api/auth/complete-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: normalized, code: code.trim() }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.message || 'الكود غلط أو انتهت صلاحيته')
        setSubmitting(false)
        return
      }
      setDone(true)
      setTimeout(() => {
        router.replace(redirectTo)
        router.refresh()
      }, 1200)
    } catch (e) {
      console.error('[complete-phone] verify error:', e)
      setError('حصلت مشكلة، حاول تاني')
      setSubmitting(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-luxe p-10 text-center animate-scale-in">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black mb-2">تمام! 🎉</h1>
          <p className="text-sm text-gray-600">تم تأكيد رقمك، بنكمّلك دلوقتي…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1F6F5F]/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#2FA084]/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur rounded-full mb-4 shadow-soft">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2FA084]" />
              <span className="text-xs font-bold text-gray-700">خطوة أخيرة</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              أكّد <span className="gradient-text-green">رقم موبايلك</span>
            </h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              محتاجين رقمك عشان نتواصل معاك على الواتس اب ونأمّن حسابك. هنبعتلك كود تأكيد.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
            {step === 'phone' ? (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Phone className="w-3.5 h-3.5 text-[#1F6F5F]" />
                    رقم الموبايل
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
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={sendCode}
                  disabled={submitting || !phone}
                  className="w-full bg-[#1F6F5F] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>بنبعت الكود…</span></>
                  ) : (
                    <><MessageCircle className="w-4 h-4" />ابعت كود الواتس اب</>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1F6F5F]" />
                    كود التأكيد
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="------"
                    className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-2xl font-black tracking-[0.4em] text-center focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
                    dir="ltr"
                    autoFocus
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    بعتنا الكود على <span dir="ltr">{normalizePhone(phone)}</span>
                  </p>
                </div>

                {info && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-800">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{info}</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={verifyCode}
                  disabled={submitting || code.length !== 6}
                  className="w-full bg-[#1F6F5F] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>بنأكّد…</span></>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" />أكّد الرقم</>
                  )}
                </button>

                <div className="flex items-center justify-between text-[12px]">
                  <button
                    onClick={() => { setStep('phone'); setCode(''); setError(null); setInfo(null) }}
                    className="text-gray-500 hover:text-gray-700 font-semibold"
                  >
                    غيّر الرقم
                  </button>
                  <button
                    onClick={sendCode}
                    disabled={submitting}
                    className="text-[#1F6F5F] hover:underline font-bold disabled:opacity-50"
                  >
                    ابعت الكود تاني
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function CompletePhonePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
      </div>
    }>
      <CompletePhoneContent />
    </Suspense>
  )
}
