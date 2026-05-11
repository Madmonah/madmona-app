'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'
import {
  ArrowRight, Phone, Lock, User, Mail, AlertCircle, Loader2, UserPlus, CheckCircle, Sparkles, KeyRound, CreditCard,
} from 'lucide-react'

function SignupContent() {
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
  const fromListing = searchParams.get('from') === 'listing'
  const prefilledName = searchParams.get('name') || ''
  const prefilledPhone = searchParams.get('phone') || ''
  const prefilledEmail = searchParams.get('email') || ''

  const [fullName, setFullName] = useState(prefilledName)
  const [phone, setPhone] = useState(prefilledPhone)
  const [email, setEmail] = useState(prefilledEmail)
  const [nationalId, setNationalId] = useState('')
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
      setError('رقم التليفون مش صحيح. اكتبه بالشكل ده: 01XXXXXXXXX')
      return
    }
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('اكتب إيميل صحيح (محتاجينه عشان لو نسيت كلمة السر)')
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
    const authEmail = phoneToEmail(normalized)

    const { data, error: signUpErr } = await supabaseBrowser.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          phone: normalized,
          full_name: fullName.trim(),
          recovery_email: trimmedEmail,
          ...(nationalId.trim() ? { national_id: nationalId.trim() } : {}),
        },
      },
    })

    if (signUpErr) {
      console.error('[auth/signup] sign up error:', signUpErr)
      if (signUpErr.message.includes('already registered') || signUpErr.message.includes('User already')) {
        setError('فيه حساب موجود بالرقم ده. سجّل دخول أو اعمل reset لكلمة السر.')
      } else {
        setError(signUpErr.message || 'حصل خطأ، جرّب تاني')
      }
      setSubmitting(false)
      return
    }

    // Save recovery email + optional national_id on the profile (best-effort)
    if (data?.user?.id) {
      try {
        const profileUpdate: Record<string, unknown> = { email: trimmedEmail }
        // Save national_id if provided. Column may not exist in all DBs - migration:
        //   ALTER TABLE profiles ADD COLUMN national_id TEXT;
        if (nationalId.trim()) {
          profileUpdate.national_id = nationalId.trim()
        }
        // @ts-expect-error
        await supabaseBrowser
          .from('profiles')
          .update(profileUpdate)
          .eq('id', data.user.id)
      } catch (e) {
        console.warn('[auth/signup] could not update profile:', e)
      }
    }

    if (data.session) {
      router.push(finalRedirect)
      router.refresh()
      return
    }

    const { error: signInErr } = await supabaseBrowser.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (signInErr) {
      setSuccess(true)
      setSubmitting(false)
      return
    }

    // After successful auto-login, ensure email is saved
    if (data?.user?.id) {
      try {
        // @ts-expect-error
        await supabaseBrowser
          .from('profiles')
          .update({ email: trimmedEmail })
          .eq('id', data.user.id)
      } catch (e) {
        // silent
      }
    }

    router.push(finalRedirect)
    router.refresh()
  }

  if (success) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-luxe p-10 text-center animate-scale-in">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black mb-2">تم إنشاء الحساب</h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            حسابك قيد التفعيل. تواصل معانا على الواتساب لتفعيل الحساب وتقدر تسجل دخول.
          </p>
          <a
            href="https://wa.me/201002229982?text=مرحباً، عملت حساب جديد ومحتاج تفعيله."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3.5 rounded-2xl font-bold shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline"
          >
            تواصل واتساب
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir="rtl">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1F5F3F]/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#B8860B]/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

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
              <Sparkles className="w-3 h-3 text-[#B8860B]" />
              <span className="text-xs font-bold text-gray-700">
                {fromListing ? 'أصلك متسجل ✓ خطوة واحدة لباقي العملية' : 'انضم لمضمونة'}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              {fromListing ? (<>أكمل <span className="gradient-text-green">حسابك</span></>) : (<>ابدأ <span className="gradient-text-green">رحلتك</span></>)}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {fromListing
                ? 'الأصل اللي سجلته جاهز. اعمل حساب وفريقنا هينشره خلال 24 ساعة.'
                : 'أنشئ حسابك وابدأ تحجز فوراً'}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-[#1F5F3F]" />
                  الاسم بالكامل
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Phone className="w-3.5 h-3.5 text-[#1F5F3F]" />
                  رقم التليفون
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="tel"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5 text-[#1F5F3F]" />
                  الإيميل
                  <span className="text-[10px] font-normal text-gray-400 normal-case tracking-normal mr-auto flex items-center gap-1">
                    <KeyRound className="w-2.5 h-2.5" />
                    لاسترجاع كلمة السر
                  </span>
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
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  💡 محتاجينه عشان نقدر نساعدك تستعيد كلمة السر لو نسيتها
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5 text-[#1F5F3F]" />
                  رقم البطاقة
                  <span className="text-[10px] font-normal text-gray-400 normal-case tracking-normal mr-auto">
                    (اختياري)
                  </span>
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="14 رقم"
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  inputMode="numeric"
                  maxLength={14}
                />
                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  🔒 بيسرّع الحجز لو جيت تحجز حاجة محتاجة تحقق هوية (عربيات، عقارات، الخ). بياناتك محفوظة، بس أجر معانا اللي بتحجز عنده بيشوفها.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-[#1F5F3F]" />
                  كلمة السر
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 حروف على الأقل"
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-[#1F5F3F]" />
                  أكّد كلمة السر
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40 focus:ring-4 focus:ring-[#1F5F3F]/10 transition-all"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="new-password"
                  required
                  minLength={6}
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
                disabled={submitting}
                className="w-full bg-[#1F5F3F] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-elevated transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الإنشاء...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    إنشاء الحساب
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-2">عندك حساب بالفعل؟</p>
              <Link
                href={`/auth/login${redirectTo !== '/account' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="inline-flex items-center gap-1 text-[#1F5F3F] font-bold hover:gap-2 transition-all no-underline"
              >
                سجّل دخولك
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            بالتسجيل، أنت توافق على{' '}
            <Link href="/terms" className="text-[#1F5F3F] font-semibold hover:underline">
              الشروط والأحكام
            </Link>
            {' '}و{' '}
            <Link href="/privacy" className="text-[#1F5F3F] font-semibold hover:underline">
              سياسة الخصوصية
            </Link>
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
        <Loader2 className="w-6 h-6 text-[#1F5F3F] animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
