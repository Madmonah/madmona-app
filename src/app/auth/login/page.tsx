'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'
import {
  ArrowRight, Phone, Lock, AlertCircle, Loader2, LogIn,
} from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/account'

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError('رقم التليفون مش صحيح. اكتبه بالشكل ده: 01002229982')
      return
    }
    if (password.length < 6) {
      setError('كلمة السر قصيرة جداً (6 حروف على الأقل)')
      return
    }

    setSubmitting(true)
    const email = phoneToEmail(normalized)

    const { error: signInErr } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    })

    if (signInErr) {
      console.error('[auth/login] sign in error:', signInErr)
      if (signInErr.message.includes('Invalid login credentials')) {
        setError('الرقم أو كلمة السر غلط. تأكد منهم.')
      } else if (signInErr.message.includes('Email not confirmed')) {
        setError('الحساب مش متفعّل لسه. تواصل معانا على واتساب +201002229982 للتفعيل.')
      } else {
        setError(signInErr.message || 'حصل خطأ، جرّب تاني')
      }
      setSubmitting(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col" dir="rtl">
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">تسجيل الدخول</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center justify-center w-12 h-12 bg-[#1F5F3F]/10 rounded-full mb-4 mx-auto">
              <LogIn className="w-5 h-5 text-[#1F5F3F]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-1">أهلاً بعودتك</h2>
            <p className="text-sm text-gray-500 text-center mb-6">سجّل دخولك بالرقم وكلمة السر</p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
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
                disabled={submitting || !phone || !password}
                className="w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الدخول...</span>
                  </>
                ) : (
                  'دخول'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-2">لسه ما عندكش حساب؟</p>
              <Link
                href={`/auth/signup${redirectTo !== '/account' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="inline-block text-[#1F5F3F] font-semibold hover:underline no-underline"
              >
                اعمل حساب جديد
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
