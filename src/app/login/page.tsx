'use client'

import { safeStorage } from '@/lib/safe-storage'

// =====================================================================
// /login — شاشة دخول واحدة موحّدة (٢٥/٨/٢٠٢٦)
// محمد: «فاتح من الديسكتوب وبيطلب تسجيل بالواتساب او كود مع اننا قلنا
//        يوزرنيم وباسورد ومفيش شاشة انا موظف دي تاني علي مستوي المشروع».
// قبل كده: الافتراضي كان واتساب + زرار «أنا موظف» بيفتح شاشة تانية بالـPIN.
// دلوقتي: فورم واحد للكل — (رقم موبايل أو إيميل) + باسورد — (٩/٩: الـPIN اتشال من الدخول نهائيًا بأمر محمد)
// بينادي login_with_password اللي بيقبل الاتنين، والواتساب فضل موجود
// كبديل تحت لدخول العملاء، من غير أي شاشة منفصلة.
// =====================================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useT } from '@/lib/i18n/LanguageProvider'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Phone, CheckCircle2, ShieldCheck, KeyRound, MessageCircle } from 'lucide-react'
import WhatsAppLogin from '@/components/WhatsAppLogin'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'
import { resolveLanding, LANDING_AUTO } from '@/lib/landing'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// (30 Jul 2026) دعم ?next= — الشرط !// بيمنع open redirect.
// 🧭 (٩/٩/٢٠٢٦) «بعد الدخول أروح فين؟» — لو مفيش وجهة مطلوبة بنسيب القرار
//    لـresolveLanding (موظف مضمونة → الإعلانات · صاحب بيزنس → لوحته الكاملة
//    · غيرهم → الهوم). محمد: «خلي كل حاجة تودّي على اللوحة الكاملة».
function nextPath(fallback = LANDING_AUTO): string {
  if (typeof window === 'undefined') return fallback
  const sp = new URLSearchParams(window.location.search)
  const n = sp.get('next') || sp.get('redirect') || ''
  return n.startsWith('/') && !n.startsWith('//') ? n : fallback
}

export default function MadmonaLoginPage() {
  const { t } = useT()
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [secret, setSecret] = useState('')
  const [showWa, setShowWa] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  // داخل خلاص؟
  useEffect(() => {
    (async () => {
      const token = safeStorage.get('madmona_token')
      if (token) {
        const { data, error } = await supabase.rpc('madmona_resolve', { p_token: token })
        if (data?.authenticated) { router.push(await resolveLanding(nextPath())); return }
        // نمسح التوكن فقط لو الـresolve أكّد إنه باطل — فشل الاتصال المؤقت مايمسحش توكن صالح.
        if (!error && data && data.authenticated === false) safeStorage.remove('madmona_token')
      }
      setChecking(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  async function doLogin() {
    if (!identifier.trim() || !secret.trim()) return
    setError(''); setSending(true)
    try {
      // 🔐 (٢٥/٨) /api/login بيفهم كل مخازن الباسورد: باسورد لوحة الأدمن
      // (وبيفتح جلسة اللوحة كمان بنفس الدخلة) + باسورد الموظفين. (٩/٩: مفيش PIN للدخول)
      // محمد: «شايف ان ليا كذا باسورد في المشروع» — أي واحد فيهم بيدخّلك هنا.
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password: secret }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok || !data?.ok) {
        setError(data?.error || t('lg.err_creds'))
        setSending(false)
        return
      }
      if (data.token) safeStorage.set('madmona_token', data.token)
      // 👤 (٩/٩/٢٠٢٦) عميل/مورد بإيميل أو رقم + باسورد → جلسة Supabase مباشرة + توكن الأقسام
      if (data.access_token && data.refresh_token) {
        try {
          const { error: sErr } = await supabaseBrowser.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
          if (sErr) console.error('[login] setSession failed:', sErr.message)
          await import('@/lib/madmonaSession').then((m) => m.syncModuleSession()).catch(() => {})
        } catch (e) { console.error('[login] setSession threw:', e) }
      }
      // 🚪🚪 (٩/٩/٢٠٢٦) الباب التاني: جلسة Supabase من نفس الدخلة (زي الواتساب)
      //    — من غيرها «شغلي» وأي شاشة RLS بتقول «سجّل دخولك» للموظف اللي داخل فعلًا.
      if (data.token_hash) {
        try {
          const { error: vErr } = await supabaseBrowser.auth.verifyOtp({ type: 'email', token_hash: data.token_hash })
          if (vErr) console.error('[login] verifyOtp failed:', vErr.status, vErr.message)
        } catch (e) { console.error('[login] verifyOtp threw:', e) }
      }
      // أدمن → لوحة الأدمن مباشرة (الكوكي اتفتحت)، موظف → /me
      // أدمن اللوحة (معاه الكوكي) → الإعلانات مباشرة؛ غيره → القرار الموحّد (موظف → شغلي · مالك → لوحته)
      router.push(data.source === 'admin' && nextPath() === LANDING_AUTO ? '/admin/listings' : await resolveLanding(nextPath(), '/home'))
    } catch {
      setError(t('lg.err_conn'))
      setSending(false)
    }
  }

  if (checking) return <div className="min-h-screen bg-[#34D399] flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#34D399] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
            <span className="text-3xl font-black text-[#059669]">م</span>
          </div>
          <h1 className="text-2xl font-black text-white">{t('tn.brand')}</h1>
          <p className="text-sm text-white/80 mt-1">{t('common.slogan')}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <h2 className="text-lg font-black text-[#1A2E26] mb-1">{t('lg.title')}</h2>
          <p className="text-sm text-[#6B7280] mb-5">{t('lg.sub')}</p>

          {/* 🔑 (٩/٩/٢٠٢٦) محمد: «اشتغل على جوجل بس وشوف حل تاني لقصة تأكيد
              رقم التليفون». القياس اللي وراها: ٢٩ كود واتساب اتطلب في ٧ أيام
              وواحد بس اتوثّق — الناس بتاخد الكود وماتخرجش من الموقع تبعته.
              جوجل ضغطة واحدة من غير ما يسيب الصفحة، والرقم بيتطلب بعدين
              **لما يلزم بس** (قرار ٢/٨ المطبّق في /auth/callback).
              الواتساب فضل تحت كبديل — مااتشالش. */}
          <GoogleSignInButton redirectTo={nextPath()} label={t('lg.google')} />
          <div className="flex items-center gap-3 my-4">
            <span className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] font-bold text-[#9CA3AF]">{t('lg.or')}</span>
            <span className="h-px flex-1 bg-gray-100" />
          </div>

          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{t('lg.identifier')}</label>
          <div className="relative mb-3">
            <Phone className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={t('lg.identifier_ph')} className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" autoComplete="username" />
          </div>

          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{t('lg.password')}</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="password" value={secret} onChange={e => setSecret(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="••••••••" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm" dir="ltr" autoComplete="current-password" />
          </div>

          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <div className="flex items-center justify-between mt-2">
            <Link href="/auth/forgot-password" className="text-[11px] font-bold text-[#059669]">نسيت الباسورد؟</Link>
            <Link href="/auth/signup" className="text-[11px] font-bold text-[#059669]">معندكش حساب؟ اعمل حساب</Link>
          </div>
          <button onClick={doLogin} disabled={sending || !identifier.trim() || !secret.trim()} className="w-full mt-4 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('lg.logging_in')}</> : <><CheckCircle2 className="w-4 h-4" /> {t('lg.login')}</>}
          </button>

          {/* الواتساب فضل موجود كبديل للعملاء اللي مالهمش باسورد — مش شاشة منفصلة */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            {showWa ? (
              <>
                <p className="text-xs font-bold text-[#1A2E26] mb-2 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-[#059669]" /> {t('lg.wa_hint')}
                </p>
                <WhatsAppLogin onDone={async () => { router.push(await resolveLanding(nextPath())); router.refresh() }} />
              </>
            ) : (
              <button onClick={() => setShowWa(true)} className="w-full py-2.5 rounded-xl border border-[#059669]/25 text-[#059669] font-bold text-[13px] flex items-center justify-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> {t('lg.wa_btn')}
              </button>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#6B7280] leading-relaxed">
              {t('lg.footer')}
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com</p>
      </div>
    </div>
  )
}
