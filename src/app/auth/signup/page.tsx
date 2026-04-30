'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'
import {
  ArrowRight, Phone, Lock, User, AlertCircle, Loader2, UserPlus, CheckCircle,
} from 'lucide-react'

// ============================================================================
// /auth/signup
// 
// Phone + password signup. Uses synthesized email under the hood for Supabase
// Auth, stores the real phone via raw_user_meta_data which the trigger
// `handle_new_user` reads to create a profiles row.
// ============================================================================

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/supplier/marketplace'

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('اكتب اسمك بالكامل')
      return
    }
    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError('رقم التليفون مش صحيح. اكتبه بالشكل ده: 01002229982')
      return
    }
    if (password.length < 6) {
      setError('كلمة السر قصيرة جداً (6 حروف على الأقل)')
      return
    }
    if (password !== confirmPassword) {
      setError('كلمتين السر مش متطابقتين')
      return
    }

    setSubmitting(true)
    const email = phoneToEmail(normalized)

    const { data, error: signUpErr } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone: normalized,
          full_name: fullName.trim(),
        },
      },
    })

    if (signUpErr) {
      console.error('[auth/signup] sign up error:', signUpErr)
      if (signUpErr.message.includes('already registered') || signUpErr.message.includes('User already')) {
        setError('فيه حساب موجود بالرقم ده. لو نسيت كلمة السر تواصل معانا.')
      } else {
        setError(signUpErr.message || 'حصل خطأ، جرّب تاني')
      }
      setSubmitting(false)
      return
    }

    // If the user is automatically signed in (no email confirmation required),
    // redirect to the target page. Otherwise show a "check email" message —
    // but with synthetic emails we want them auto-confirmed. If session is null,
    // try to sign in directly.
    if (data.session) {
      router.push(redirectTo)
      router.refresh()
      return
    }

    // No session = email confirmation required. With synthetic emails this
    // won't deliver. Try to immediately sign them in.
    const { error: signInErr } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    })

    if (signInErr) {
      // Fallback: tell them an admin needs to verify
      setSuccess(true)
      setSubmitting(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">تم إنشاء الحساب</h1>
          <p className="text-sm text-gray-600 mb-6">
            حسابك قيد التفعيل. تواصل معانا على الواتساب لتفعيل الحساب وتقدر تسجل دخول.
          </p>
          <a
            href="https://wa.me/201002229982?text=مرحباً، عملت حساب جديد ومحتاج تفعيله."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#25D366] text-white px-6 py-3 rounded-xl font-semibold no-underline"
          >
            تواصل واتساب
          </a>
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
          <h1 className="text-lg font-bold text-gray-900">إنشاء حساب</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center justify-center w-12 h-12 bg-[#1F5F3F]/10 rounded-full mb-4 mx-auto">
              <UserPlus className="w-5 h-5 text-[#1F5F3F]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-1">إنشاء حساب جديد</h2>
            <p className="text-sm text-gray-500 text-center mb-6">انضم لـMadmona Marketplace</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  الاسم بالكامل
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  رقم التليفون
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01002229982"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="tel"
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
                  placeholder="6 حروف على الأقل"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  أكّد كلمة السر
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="new-password"
                  required
                  minLength={6}
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
                disabled={submitting}
                className="w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الإنشاء...</span>
                  </>
                ) : (
                  'إنشاء الحساب'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-2">عندك حساب بالفعل؟</p>
              <Link
                href={`/auth/login${redirectTo !== '/supplier/marketplace' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="inline-block text-[#1F5F3F] font-semibold hover:underline no-underline"
              >
                سجّل دخولك
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
