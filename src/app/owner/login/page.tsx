'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Phone, CheckCircle2, LogIn, ShieldCheck, ArrowLeft, MessageCircle } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Step = 'enter' | 'verify'

// Normalize Egyptian phone to digits (for display) — backend normalizes too
function cleanPhone(raw: string): string { return raw.replace(/[^0-9]/g, '') }

export default function OwnerLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('enter')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  // Already logged in? (token in localStorage)
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('madmona_owner_token')
      if (token) {
        // @ts-expect-error
        const { data } = await supabase.rpc('owner_resolve_by_token', { p_token: token })
        const access = data?.access || []
        if (access.length === 1) { router.push(`/owner/${access[0].supplier_id}`); return }
        if (access.length > 1) { router.push('/owner/select'); return }
      }
      setChecking(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  async function sendOtp() {
    if (!phone) return
    setError(''); setSending(true)
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone: cleanPhone(phone) }),
      })
      const data = await res.json()
      if (!data?.success) setError(data?.error || 'فشل إرسال الكود')
      else setStep('verify')
    } catch (e) {
      setError('حصل خطأ في الاتصال. حاول تاني.')
    }
    setSending(false)
  }

  async function verifyOtp() {
    setError(''); setSending(true)
    // @ts-expect-error
    const { data, error: err } = await supabase.rpc('owner_verify_otp', {
      p_phone: cleanPhone(phone), p_code: otp,
    })
    if (err || !data?.success) { setError(data?.error || err?.message || 'الكود غلط'); setSending(false); return }

    localStorage.setItem('madmona_owner_token', data.token)
    // @ts-expect-error
    const { data: acc } = await supabase.rpc('owner_resolve_by_token', { p_token: data.token })
    const access = acc?.access || []
    if (access.length === 1) router.push(`/owner/${access[0].supplier_id}`)
    else if (access.length > 1) router.push('/owner/select')
    else setError('رقمك مش مربوط بأي شركة. تواصل مع إدارة مضمونة.')
    setSending(false)
  }

  if (checking) return <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
            <span className="text-3xl font-black text-[#1F6F5F]">م</span>
          </div>
          <h1 className="text-2xl font-black text-white">بوابة الشركاء</h1>
          <p className="text-sm text-white/80 mt-1">مضمونة · دخول أصحاب الأعمال</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {step === 'enter' ? (
            <>
              <h2 className="text-lg font-black text-[#1A2E26] mb-1">تسجيل الدخول</h2>
              <p className="text-sm text-[#6B7280] mb-5 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-[#1F6F5F]" />
                هنبعتلك كود تأكيد على <b>واتساب</b>
              </p>
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">رقم الموبايل</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendOtp()} placeholder="01XXXXXXXXX" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" />
              </div>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              <button onClick={sendOtp} disabled={sending || !phone} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><MessageCircle className="w-4 h-4" /> ابعتلي الكود على واتساب</>}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setStep('enter'); setOtp(''); setError('') }} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> غيّر الرقم</button>
              <h2 className="text-lg font-black text-[#1A2E26] mb-1">اكتب الكود</h2>
              <p className="text-sm text-[#6B7280] mb-5">بعتنا كود على واتساب الرقم <span className="font-bold text-[#1A2E26]" dir="ltr">{phone}</span></p>
              <input type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && verifyOtp()} placeholder="● ● ● ● ● ●" maxLength={6} className="w-full px-3 py-3 rounded-xl bg-[#FAFAF7] text-center text-2xl font-black tracking-[0.4em]" dir="ltr" />
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              <button onClick={verifyOtp} disabled={sending || otp.length < 6} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التأكيد...</> : <><CheckCircle2 className="w-4 h-4" /> دخول</>}
              </button>
              <button onClick={sendOtp} disabled={sending} className="w-full mt-2 text-xs font-bold text-[#1F6F5F]">ابعت الكود تاني</button>
            </>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#6B7280] leading-relaxed">دخول آمن بكود لمرة واحدة على واتساب — من غير باسورد. محتاج رقمك يكون مفعّل من إدارة مضمونة.</p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com · بوابة الشركاء</p>
      </div>
    </div>
  )
}
