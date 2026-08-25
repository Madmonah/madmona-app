'use client'

import { safeStorage } from '@/lib/safe-storage'

// =====================================================================
// /login — شاشة دخول واحدة موحّدة (٢٥/٨/٢٠٢٦)
// محمد: «فاتح من الديسكتوب وبيطلب تسجيل بالواتساب او كود مع اننا قلنا
//        يوزرنيم وباسورد ومفيش شاشة انا موظف دي تاني علي مستوي المشروع».
// قبل كده: الافتراضي كان واتساب + زرار «أنا موظف» بيفتح شاشة تانية بالـPIN.
// دلوقتي: فورم واحد للكل — (رقم موبايل أو إيميل) + (باسورد أو PIN) —
// بينادي login_with_password اللي بيقبل الاتنين، والواتساب فضل موجود
// كبديل تحت لدخول العملاء، من غير أي شاشة منفصلة.
// =====================================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Phone, CheckCircle2, ShieldCheck, KeyRound, MessageCircle } from 'lucide-react'
import WhatsAppLogin from '@/components/WhatsAppLogin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// (30 Jul 2026) دعم ?next= — الشرط !// بيمنع open redirect.
function nextPath(fallback = '/home'): string {
  if (typeof window === 'undefined') return fallback
  const n = new URLSearchParams(window.location.search).get('next') || ''
  return n.startsWith('/') && !n.startsWith('//') ? n : fallback
}

export default function MadmonaLoginPage() {
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
        if (data?.authenticated) { router.push(nextPath()); return }
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
    const { data, error: err } = await supabase.rpc('login_with_password', {
      p_identifier: identifier.trim(), p_secret: secret,
    })
    if (err || !data?.success) {
      setError(data?.error || err?.message || 'البيانات غلط — جرّب تاني')
      setSending(false)
      return
    }
    safeStorage.set('madmona_token', data.token)
    router.push(nextPath('/me'))
  }

  if (checking) return <div className="min-h-screen bg-[#34D399] flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#34D399] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
            <span className="text-3xl font-black text-[#059669]">م</span>
          </div>
          <h1 className="text-2xl font-black text-white">مضمونة</h1>
          <p className="text-sm text-white/80 mt-1">معاملاتك مضمونة</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <h2 className="text-lg font-black text-[#1A2E26] mb-1">تسجيل الدخول</h2>
          <p className="text-sm text-[#6B7280] mb-5">برقم موبايلك أو إيميلك، والباسورد (أو الـPIN بتاع البصمة)</p>

          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">رقم الموبايل أو الإيميل</label>
          <div className="relative mb-3">
            <Phone className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="01XXXXXXXXX أو name@email.com" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" autoComplete="username" />
          </div>

          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">الباسورد أو الـPIN</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="password" value={secret} onChange={e => setSecret(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="••••••••" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm" dir="ltr" autoComplete="current-password" />
          </div>

          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <button onClick={doLogin} disabled={sending || !identifier.trim() || !secret.trim()} className="w-full mt-4 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الدخول...</> : <><CheckCircle2 className="w-4 h-4" /> دخول</>}
          </button>

          {/* الواتساب فضل موجود كبديل للعملاء اللي مالهمش باسورد — مش شاشة منفصلة */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            {showWa ? (
              <>
                <p className="text-xs font-bold text-[#1A2E26] mb-2 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-[#059669]" /> دخول بواتساب — من غير باسورد، رقمك هو إثبات هويتك
                </p>
                <WhatsAppLogin onDone={() => { router.push(nextPath()); router.refresh() }} />
              </>
            ) : (
              <button onClick={() => setShowWa(true)} className="w-full py-2.5 rounded-xl border border-[#059669]/25 text-[#059669] font-bold text-[13px] flex items-center justify-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> معنديش باسورد — دخول بواتساب
              </button>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#6B7280] leading-relaxed">
              حساب واحد على مضمونة يخدمك كعميل، موظف، أو لعرض وتأجير أي حاجة. لو نسيت الباسورد أو الـPIN كلّم إدارة الفرع.
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com</p>
      </div>
    </div>
  )
}
