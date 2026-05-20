'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Mail, Phone, CheckCircle2, LogIn, ShieldCheck, ArrowLeft } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Method = 'phone' | 'email'
type PhoneStep = 'enter' | 'verify'

// Normalize Egyptian phone to E.164 (+20...)
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '')
  if (/^01[0-9]{9}$/.test(digits)) return '+20' + digits.slice(1)
  if (/^201[0-9]{9}$/.test(digits)) return '+' + digits
  if (raw.trim().startsWith('+')) return '+' + digits
  return '+' + digits
}

export default function OwnerLoginPage() {
  const router = useRouter()
  const [method, setMethod] = useState<Method>('phone')
  const [checking, setChecking] = useState(true)

  // phone state
  const [phone, setPhone] = useState('')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter')
  const [otp, setOtp] = useState('')
  const [sentPhone, setSentPhone] = useState('')

  // email state
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // @ts-expect-error
        const { data } = await supabase.rpc('owner_resolve_access')
        const access = data?.access || []
        if (access.length === 1) { router.push(`/owner/${access[0].supplier_id}`); return }
        if (access.length > 1) { router.push('/owner/select'); return }
      }
      setChecking(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  async function sendPhoneOtp() {
    setError(''); setSending(true)
    const e164 = normalizePhone(phone)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 })
    if (err) setError(err.message)
    else { setSentPhone(e164); setPhoneStep('verify') }
    setSending(false)
  }

  async function verifyPhoneOtp() {
    setError(''); setSending(true)
    const { error: err } = await supabase.auth.verifyOtp({ phone: sentPhone, token: otp, type: 'sms' })
    if (err) { setError(err.message); setSending(false); return }
    // @ts-expect-error
    const { data } = await supabase.rpc('owner_resolve_access')
    const access = data?.access || []
    if (access.length === 1) router.push(`/owner/${access[0].supplier_id}`)
    else if (access.length > 1) router.push('/owner/select')
    else setError('رقمك مش مربوط بأي شركة. تواصل مع إدارة مضمونة.')
    setSending(false)
  }

  async function sendEmailLink() {
    if (!email) return
    setError(''); setSending(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${window.location.origin}/owner/login` },
    })
    if (err) setError(err.message)
    else setEmailSent(true)
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
          {/* Method toggle */}
          {!(emailSent || phoneStep === 'verify') && (
            <div className="flex gap-2 mb-5 p-1 bg-[#FAFAF7] rounded-xl">
              <button onClick={() => { setMethod('phone'); setError('') }} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${method === 'phone' ? 'bg-[#1F6F5F] text-white' : 'text-[#6B7280]'}`}>
                <Phone className="w-3.5 h-3.5" /> رقم الموبايل
              </button>
              <button onClick={() => { setMethod('email'); setError('') }} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${method === 'email' ? 'bg-[#1F6F5F] text-white' : 'text-[#6B7280]'}`}>
                <Mail className="w-3.5 h-3.5" /> الإيميل
              </button>
            </div>
          )}

          {/* PHONE — enter number */}
          {method === 'phone' && phoneStep === 'enter' && (
            <>
              <h2 className="text-lg font-black text-[#1A2E26] mb-1">تسجيل الدخول</h2>
              <p className="text-sm text-[#6B7280] mb-5">هنبعتلك كود تأكيد على رقمك في رسالة SMS.</p>
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">رقم الموبايل</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendPhoneOtp()} placeholder="01XXXXXXXXX" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" />
              </div>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              <button onClick={sendPhoneOtp} disabled={sending || !phone} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><LogIn className="w-4 h-4" /> ابعتلي كود التأكيد</>}
              </button>
            </>
          )}

          {/* PHONE — verify OTP */}
          {method === 'phone' && phoneStep === 'verify' && (
            <>
              <button onClick={() => { setPhoneStep('enter'); setOtp(''); setError('') }} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> غيّر الرقم</button>
              <h2 className="text-lg font-black text-[#1A2E26] mb-1">اكتب الكود</h2>
              <p className="text-sm text-[#6B7280] mb-5">بعتنا كود لـ <span className="font-bold text-[#1A2E26]" dir="ltr">{sentPhone}</span></p>
              <input type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && verifyPhoneOtp()} placeholder="● ● ● ● ● ●" maxLength={6} className="w-full px-3 py-3 rounded-xl bg-[#FAFAF7] text-center text-2xl font-black tracking-[0.4em]" dir="ltr" />
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              <button onClick={verifyPhoneOtp} disabled={sending || otp.length < 4} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التأكيد...</> : <><CheckCircle2 className="w-4 h-4" /> دخول</>}
              </button>
              <button onClick={sendPhoneOtp} disabled={sending} className="w-full mt-2 text-xs font-bold text-[#1F6F5F]">ابعت الكود تاني</button>
            </>
          )}

          {/* EMAIL */}
          {method === 'email' && !emailSent && (
            <>
              <h2 className="text-lg font-black text-[#1A2E26] mb-1">تسجيل الدخول</h2>
              <p className="text-sm text-[#6B7280] mb-5">هندخّلك برابط آمن على إيميلك — من غير باسورد.</p>
              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">الإيميل</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendEmailLink()} placeholder="owner@elite.com" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm" dir="ltr" />
              </div>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              <button onClick={sendEmailLink} disabled={sending || !email} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><LogIn className="w-4 h-4" /> ابعتلي رابط الدخول</>}
              </button>
            </>
          )}

          {/* EMAIL sent confirmation */}
          {method === 'email' && emailSent && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#1F6F5F]/10 grid place-items-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-[#1F6F5F]" /></div>
              <h2 className="text-lg font-black text-[#1A2E26]">بعتنا لك رابط الدخول! 📧</h2>
              <p className="text-sm text-[#6B7280] mt-2">افتح إيميلك <span className="font-bold text-[#1A2E26]">{email}</span> واضغط على رابط الدخول.</p>
              <button onClick={() => { setEmailSent(false); setEmail('') }} className="mt-4 text-xs font-bold text-[#1F6F5F]">استخدم إيميل تاني</button>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#6B7280] leading-relaxed">دخول آمن بكود لمرة واحدة — من غير باسورد. محتاج حسابك يكون مفعّل من إدارة مضمونة.</p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com · بوابة الشركاء</p>
      </div>
    </div>
  )
}
