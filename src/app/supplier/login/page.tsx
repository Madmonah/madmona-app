'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, Mail, Lock, Phone, AlertCircle, Loader2 } from 'lucide-react'

// ============================================================
// Supplier login page.
// Currently a placeholder — full Supabase Auth integration is a
// separate backend track. For now this captures email/password and
// shows "coming soon" on submit, plus a clear path to signup or
// WhatsApp contact for verified suppliers.
// ============================================================

export default function SupplierLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showComingSoon, setShowComingSoon] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (!email.includes('@')) return setError('بريد إلكتروني غير صحيح')
    if (password.length < 6) return setError('كلمة السر قصيرة جداً')
    setSubmitting(true)
    // Show "coming soon" message after a brief artificial delay so the
    // submit button gets a real loading state.
    setTimeout(() => {
      setSubmitting(false)
      setShowComingSoon(true)
    }, 600)
  }

  if (showComingSoon) {
    const phoneClean = '201002229982'
    const waMessage = `أهلاً يا مضمونة 👋\n\nأنا أجر معانا مسجل عندكم والإيميل بتاعي ${email}، وعاوز أوصل للوحة بتاعتي.`
    const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(waMessage)}`

    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <div className="flex items-center justify-center w-14 h-14 bg-[#2FA084]/10 rounded-full mx-auto mb-4">
            <Building2 className="w-6 h-6 text-[#2FA084]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">لوحة أجر معانا قريباً</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            بنشتغل دلوقتي على لوحة تحكم أجر معانا. لحد ما تجهز، تقدر تتواصل معانا على الواتساب لإدارة وحداتك أو معرفة حجوزاتك.
          </p>
          <div className="space-y-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3 rounded-xl font-semibold hover:bg-[#25D366]/90 no-underline"
            >
              <Phone className="w-4 h-4" />
              تواصل عبر واتساب
            </a>
            <Link
              href="/"
              className="block text-center text-sm text-gray-500 hover:text-[#2B4521] py-2 no-underline"
            >
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col" dir="rtl">
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">دخول أجر معانا</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center justify-center w-12 h-12 bg-[#2B4521]/10 rounded-full mb-4 mx-auto">
              <Building2 className="w-5 h-5 text-[#2B4521]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-1">أهلاً بعودتك</h2>
            <p className="text-sm text-gray-500 text-center mb-6">سجل دخولك لإدارة مساحاتك</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30 focus:border-[#2B4521]"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  كلمة السر
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30 focus:border-[#2B4521]"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !email || !password}
                className="w-full bg-[#2B4521] text-white py-3 rounded-xl font-semibold hover:bg-[#2B4521]/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق...</span>
                  </>
                ) : (
                  'دخول'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-2">لسه ما عندكش حساب؟</p>
              <Link
                href="/supplier/signup"
                className="inline-block text-[#2B4521] font-semibold hover:underline no-underline"
              >
                سجل مساحتك معانا
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
