'use client'

import { safeStorage } from '@/lib/safe-storage'

// =====================================================================
// /login — دخول العملاء (اتوحّد 17 Jul 2026)
// التاريخ: كان فيه 3 مسارات وكلهم ميتين:
//   1. OTP بيتبعت بتمبلت واتساب → التمبلتس مبلوكة من ميتا (131042)
//   2. «ابعت كودي» المعكوس القديم (madmona_wa_login) → عمره ما كان له
//      معالج في الويبهوك — الأكواد بتفضل pending للأبد!
//   3. الباسورد — محدش فاكره
// دلوقتي: WhatsAppLogin الموحّد (نفس /auth/login بالظبط) — بيطلع
// جلسة Supabase + madmona_token مع بعض. + دخول الموظفين بالـPIN زي ما هو.
// =====================================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Phone, CheckCircle2, ArrowLeft, ShieldCheck, KeyRound, Briefcase } from 'lucide-react'
import WhatsAppLogin from '@/components/WhatsAppLogin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

function cleanPhone(raw: string): string { return raw.replace(/[^0-9]/g, '') }

export default function MadmonaLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'wa' | 'pin'>('wa')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  // داخل خلاص؟
  useEffect(() => {
    (async () => {
      const token = safeStorage.get('madmona_token')
      if (token) {
        // @ts-expect-error rpc typing
        const { data } = await supabase.rpc('madmona_resolve', { p_token: token })
        if (data?.authenticated) { router.push('/home'); return }
        safeStorage.remove('madmona_token')
      }
      setChecking(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  // دخول الموظفين: رقم + PIN البصمة → /me
  async function employeeLogin() {
    if (!phone || pin.length < 3) return
    setError(''); setSending(true)
    // @ts-expect-error rpc typing
    const { data, error: err } = await supabase.rpc('employee_login_phone_pin', {
      p_phone: cleanPhone(phone), p_pin: pin,
    })
    if (err || !data?.success) { setError(data?.error || err?.message || 'رقم التليفون أو الـPIN غلط'); setSending(false); return }
    safeStorage.set('madmona_token', data.token)
    router.push('/me')
  }

  if (checking) return <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
            <span className="text-3xl font-black text-[#1F6F5F]">م</span>
          </div>
          <h1 className="text-2xl font-black text-white">مضمونة</h1>
          <p className="text-sm text-white/80 mt-1">معاملاتك مضمونة</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {mode === 'pin' ? (
            <>
              <button onClick={() => { setMode('wa'); setError('') }} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> دخول عادي بواتساب</button>
              <h2 className="text-lg font-black text-[#1A2E26] mb-1 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-[#1F6F5F]" /> دخول الموظفين</h2>
              <p className="text-sm text-[#6B7280] mb-5">برقم تليفونك والـ <b>PIN</b> (نفس الأربع أرقام بتاعت البصمة)</p>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">رقم الموبايل</label>
              <div className="relative mb-3">
                <Phone className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" />
              </div>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">الـ PIN</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && employeeLogin()} placeholder="● ● ● ●" maxLength={6} className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-center text-2xl font-black tracking-[0.4em]" dir="ltr" />
              </div>

              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              <button onClick={employeeLogin} disabled={sending || !phone || pin.length < 3} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الدخول...</> : <><CheckCircle2 className="w-4 h-4" /> دخول لحسابي</>}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-black text-[#1A2E26] mb-1">دخول / تسجيل</h2>
              <p className="text-sm text-[#6B7280] mb-5">
                من غير باسورد ولا كود بيتبعتلك — رقمك اللي بتبعت منه هو إثبات هويتك.
              </p>
              <WhatsAppLogin onDone={() => { router.push('/home'); router.refresh() }} />
              <button onClick={() => { setMode('pin'); setError('') }} className="w-full mt-3 py-2.5 rounded-xl border border-[#1F6F5F]/25 text-[#1F6F5F] font-bold text-[13px] flex items-center justify-center gap-1.5">
                <Briefcase className="w-4 h-4" /> أنا موظف — دخول بالـPIN
              </button>
            </>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#6B7280] leading-relaxed">
              {mode === 'pin'
                ? 'دخول الموظفين بالـPIN بتاع البصمة. لو نسيت الـPIN كلّم إدارة الفرع. حساب واحد على مضمونة يخدمك كعميل، موظف، أو لعرض وتأجير أي حاجة.'
                : 'دخول آمن من واتساب — من غير باسورد. حساب واحد على مضمونة يخدمك كعميل، موظف، أو لعرض وتأجير أي حاجة.'}
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com</p>
      </div>
    </div>
  )
}
