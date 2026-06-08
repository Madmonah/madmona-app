'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'
import {
  ArrowRight, Phone, Lock, User, Mail, AlertCircle, Loader2, UserPlus, CheckCircle, Sparkles, KeyRound, CreditCard,
} from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import { GoogleSignInButton, FacebookSignInButton } from '@/components/GoogleSignInButton'

function SignupContent() {
  const { t, dir } = useT()
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
      setError(t('auth.err_name'))
      return
    }
    const normalized = normalizePhone(phone)
    if (!normalized) {
      setError(t('auth.err_phone'))
      return
    }
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(t('auth.err_email'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.err_password_short'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.err_password_mismatch'))
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
        setError(t('auth.err_account_exists'))
      } else {
        setError(signUpErr.message || t('auth.err_generic'))
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

    // ============================================================
    // INLINE CLAIM — runs synchronously while we still have the
    // user.id in hand. Service-role API doesn't need an active
    // session, so this works even if email confirmation is required
    // and the auto-login below fails. Belt-and-suspenders: the
    // MadmonaListingClaimer in the layout will also try if the user
    // navigates with ?token=... later.
    // ============================================================
    if (data?.user?.id) {
      const profileId = data.user.id
      // (a) Token-based claim (if user came from /add-listing/success)
      if (claimToken) {
        try {
          await fetch('/api/listing-drafts/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: claimToken, profile_id: profileId }),
          })
        } catch (e) {
          console.warn('[auth/signup] token claim failed:', e)
        }
      }
      // (b) Phone-based bulk claim — catches users with multiple drafts,
      // or with a draft but no token in the signup URL.
      try {
        await fetch('/api/listing-drafts/claim-by-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalized, profile_id: profileId }),
        })
      } catch (e) {
        console.warn('[auth/signup] phone claim failed:', e)
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
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir={dir}>
        <div className="w-full max-w-md bg-white rounded-3xl shadow-luxe p-10 text-center animate-scale-in">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black mb-2">{t('auth.success_title')}</h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            {t('auth.success_body')}
          </p>
          <a
            href="https://wa.me/201002229982?text=مرحباً، عملت حساب جديد ومحتاج تفعيله."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-3.5 rounded-2xl font-bold shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline"
          >
            {t('auth.contact_whatsapp')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir={dir}>
      {/* Decorative blobs */}
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
              <span className="text-xs font-bold text-gray-700">
                {fromListing ? t('auth.from_listing_badge') : t('auth.join_badge')}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              {fromListing ? (<>{t('auth.continue_pre')} <span className="gradient-text-green">{t('auth.continue_emph')}</span></>) : (<>{t('auth.start_pre')} <span className="gradient-text-green">{t('auth.start_emph')}</span></>)}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {fromListing
                ? t('auth.sub_from_listing')
                : t('auth.sub_signup')}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-[#1F6F5F]" />
                  {t('auth.name_label')}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('auth.name_placeholder')}
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Phone className="w-3.5 h-3.5 text-[#1F6F5F]" />
                  {t('auth.phone_label')}
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
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5 text-[#1F6F5F]" />
                  {t('auth.email')}
                  <span className="text-[10px] font-normal text-gray-400 normal-case tracking-normal mr-auto flex items-center gap-1">
                    <KeyRound className="w-2.5 h-2.5" />
                    {t('auth.email_recovery_hint')}
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="email"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  💡 {t('auth.email_help_text')}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5 text-[#1F6F5F]" />
                  {t('auth.id_label')}
                  <span className="text-[10px] font-normal text-gray-400 normal-case tracking-normal mr-auto">
                    {t('auth.optional')}
                  </span>
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder={t('auth.id_placeholder')}
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  inputMode="numeric"
                  maxLength={14}
                />
                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  🔒 {t('auth.id_help_text')}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-[#1F6F5F]" />
                  {t('auth.password_label')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password_min_placeholder')}
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-[#1F6F5F]" />
                  {t('auth.confirm_password')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
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
                className="w-full bg-[#1F6F5F] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-elevated transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('auth.creating')}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {t('auth.create_btn')}
                  </>
                )}
              </button>
            </form>

            {/* Social signup */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px bg-gray-100 flex-1" />
              <span className="text-[11px] text-gray-400 font-bold">أو</span>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <GoogleSignInButton redirectTo={finalRedirect} label="سجّل بـ Google" />
            <div className="h-3" />
            <FacebookSignInButton redirectTo={finalRedirect} label="سجّل بـ Facebook" />

            <div className="mt-7 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-2">{t('auth.have_account_q')}</p>
              <Link
                href={`/auth/login${redirectTo !== '/account' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                className="inline-flex items-center gap-1 text-[#1F6F5F] font-bold hover:gap-2 transition-all no-underline"
              >
                {t('auth.login_link')}
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            {t('auth.terms_signup_pre')}{' '}
            <Link href="/terms" className="text-[#1F6F5F] font-semibold hover:underline">
              {t('auth.terms_link')}
            </Link>
            {' '}{t('auth.terms_and')}{' '}
            <Link href="/privacy" className="text-[#1F6F5F] font-semibold hover:underline">
              {t('auth.privacy_link')}
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
        <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
