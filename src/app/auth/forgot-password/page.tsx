'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Mail, AlertCircle, Loader2, KeyRound, CheckCircle, MessageCircle, Sparkles,
} from 'lucide-react'

// ============================================================================
// /auth/forgot-password
//
// User enters their email → POST /api/auth/forgot-password.
// Server looks up profile, sends reset link email if found.
//
// Always shows generic success message (anti-enumeration security).
// ============================================================================

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [whatsappFallback, setWhatsappFallback] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('اكتب إيميل صحيح')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()

      // Two failure modes that need WhatsApp fallback:
      //   - no_email: profile has no email saved
      //   - email_not_configured: Resend not yet active
      if (data.no_email || data.email_not_configured) {
        setWhatsappFallback(true)
        setSubmitting(false)
        return
      }

      // Default: success (whether email actually exists or not — for security)
      setDone(true)
      setSubmitting(false)
    } catch (e) {
      setError('حصل خطأ في الاتصال. حاول تاني.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir="rtl">
      {/* Decorative blobs */}
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
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur rounded-full mb-4 shadow-soft">
              <Sparkles className="w-3 h-3 text-[#B8860B]" />
              <span className="text-xs font-bold text-gray-700">مضمونة · Madmona</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              نسيت <span className="gradient-text-green">كلمة السر؟</span>
            </h1>
            <p className="text-sm text-gray-500 mt-2">هنبعتلك لينك إعادة تعيين على إيميلك</p>
          </div>

          {/* Success state */}
          {done && (
            <div className="bg-white rounded-3xl shadow-luxe p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-black mb-3">شيك على إيميلك ✉️</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">
                لو حسابك موجود في النظام، هتلاقي رسالة في إيميلك خلال دقيقة.
              </p>
              <p className="text-xs text-gray-500 mb-6">
                ميتنسيش تشوف في الـSpam folder كمان لو ما لقيتش الرسالة.
              </p>
              <Link
                href="/auth/login"
                className="inline-block bg-[#1F5F3F] text-white px-6 py-3 rounded-xl font-bold shadow-elevated hover:shadow-luxe transition-all no-underline"
              >
                ارجع لتسجيل الدخول
              </Link>
            </div>
          )}

          {/* WhatsApp fallback (no email on profile or Resend not configured) */}
          {whatsappFallback && (
            <div className="bg-white rounded-3xl shadow-luxe p-8 text-center">
              <div className="w-16 h-16 bg-[#25D366]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-[#25D366]" />
              </div>
              <h2 className="text-2xl font-black mb-3">تواصل معانا على واتساب</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                مش لاقيين إيميل مسجّل على حسابك. تواصل معانا على واتساب وهنعملك إعادة تعيين كلمة السر فوراً.
              </p>
              <a
                href={`https://wa.me/201002229982?text=${encodeURIComponent('أهلاً، نسيت كلمة السر بتاعت حسابي على Madmona. ممكن تساعدوني في إعادة تعيينها؟')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3.5 rounded-xl font-bold shadow-elevated hover:shadow-luxe transition-all no-underline"
              >
                <MessageCircle className="w-4 h-4" />
                ابعت واتساب
              </a>
              <p className="text-xs text-gray-500 mt-4">رد فوري · ٢٤/٧</p>
            </div>
          )}

          {/* Form */}
          {!done && !whatsappFallback && (
            <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 text-[#1F5F3F]" />
                    الإيميل
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-2">
                    اكتب الإيميل اللي عملت بيه الحساب
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
                  disabled={submitting || !email}
                  className="w-full bg-[#1F5F3F] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      ابعت لينك إعادة تعيين
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600 mb-2">فاكر كلمة السر؟</p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1 text-[#1F5F3F] font-bold hover:gap-2 transition-all no-underline"
                >
                  ارجع لتسجيل الدخول
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500 mb-2">ملكش إيميل في الحساب؟</p>
                <a
                  href="https://wa.me/201002229982?text=أهلاً،%20نسيت%20كلمة%20السر%20بتاعت%20حسابي%20على%20Madmona"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#25D366] font-bold text-sm hover:gap-2 transition-all no-underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  تواصل واتساب
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
