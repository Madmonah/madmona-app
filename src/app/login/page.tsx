'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Phone, CheckCircle2, ArrowLeft, MessageCircle, ShieldCheck, User, KeyRound, Briefcase, Send } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Step = 'enter' | 'verify'
type Mode = 'wa' | 'otp' | 'pin'
type WaPhase = 'idle' | 'waiting' | 'expired'
function cleanPhone(raw: string): string { return raw.replace(/[^0-9]/g, '') }

export default function MadmonaLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('wa')
  const [step, setStep] = useState<Step>('enter')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [knownName, setKnownName] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [pin, setPin] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  // WhatsApp inbound-login (reverse-OTP) state
  const [waCode, setWaCode] = useState<string | null>(null)
  const [waHref, setWaHref] = useState('')
  const [waPhase, setWaPhase] = useState<WaPhase>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  // Already logged in?
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('madmona_token')
      if (token) {
        // @ts-expect-error rpc typing
        const { data } = await supabase.rpc('madmona_resolve', { p_token: token })
        if (data?.authenticated) { router.push('/home'); return }
        localStorage.removeItem('madmona_token')
      }
      setChecking(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  useEffect(() => () => stopPolling(), [])

  // ===== WhatsApp inbound login: user sends US a message; their number = identity =====
  async function startWaLogin() {
    setError(''); setSending(true)
    try {
      // @ts-expect-error rpc typing
      const { data, error: err } = await supabase.rpc('madmona_wa_login_start')
      if (err || !data?.success) { setError(data?.error || err?.message || 'حصل خطأ. حاول تاني.'); setSending(false); return }
      setWaCode(data.code)
      const href = `https://wa.me/${data.wa_number}?text=${encodeURIComponent(data.wa_text)}`
      setWaHref(href)
      setWaPhase('waiting')
      try { window.open(href, '_blank') } catch { /* popup blocked — link still shown */ }

      stopPolling()
      pollRef.current = setInterval(async () => {
        // @ts-expect-error rpc typing
        const { data: st } = await supabase.rpc('madmona_wa_login_status', { p_code: data.code })
        if (!st) return
        if (st.status === 'confirmed' && st.token) {
          stopPolling()
          localStorage.setItem('madmona_token', st.token)
          router.push('/home')
        } else if (st.status === 'expired' || st.status === 'not_found') {
          stopPolling(); setWaPhase('expired')
        }
      }, 2500)
    } catch {
      setError('حصل خطأ في الاتصال. حاول تاني.')
    }
    setSending(false)
  }

  async function sendOtp() {
    if (!phone) return
    setError(''); setSending(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/madmona-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone: cleanPhone(phone), full_name: name || null }),
      })
      const data = await res.json()
      if (!data?.success) { setError(data?.error || 'فشل إرسال الكود') }
      else { setKnownName(data?.known_name || null); setStep('verify') }
    } catch {
      setError('حصل خطأ في الاتصال. حاول تاني.')
    }
    setSending(false)
  }

  async function verifyOtp() {
    setError(''); setSending(true)
    // @ts-expect-error rpc typing
    const { data, error: err } = await supabase.rpc('madmona_verify_otp', {
      p_phone: cleanPhone(phone), p_code: otp, p_full_name: name || null,
    })
    if (err || !data?.success) { setError(data?.error || err?.message || 'الكود غلط'); setSending(false); return }
    localStorage.setItem('madmona_token', data.token)
    router.push('/home')
  }

  // Employee login: phone + 4-digit PIN (same PIN used for clock-in) -> /me
  async function employeeLogin() {
    if (!phone || pin.length < 3) return
    setError(''); setSending(true)
    // @ts-expect-error rpc typing
    const { data, error: err } = await supabase.rpc('employee_login_phone_pin', {
      p_phone: cleanPhone(phone), p_pin: pin,
    })
    if (err || !data?.success) { setError(data?.error || err?.message || 'رقم التليفون أو الـPIN غلط'); setSending(false); return }
    localStorage.setItem('madmona_token', data.token)
    router.push('/me')
  }

  function switchMode(m: Mode) { setMode(m); setError(''); setOtp(''); setPin(''); setStep('enter'); stopPolling(); setWaPhase('idle'); setWaCode(null) }

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
          {/* ============ EMPLOYEE: phone + PIN ============ */}
          {mode === 'pin' ? (
            <>
              <button onClick={() => switchMode('wa')} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> دخول عادي بواتساب</button>
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
          ) : mode === 'otp' ? (
            step === 'enter' ? (
              <>
                <button onClick={() => switchMode('wa')} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> رجوع</button>
                <h2 className="text-lg font-black text-[#1A2E26] mb-1">استقبل كود على واتساب</h2>
                <p className="text-sm text-[#6B7280] mb-5 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#1F6F5F]" />
                  هنبعتلك كود تأكيد على <b>واتساب</b>
                </p>

                <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">رقم الموبايل</label>
                <div className="relative mb-3">
                  <Phone className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" />
                </div>

                <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">اسمك <span className="font-normal lowercase">(لو حساب جديد)</span></label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendOtp()} placeholder="اكتب اسمك" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm" />
                </div>

                {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                <button onClick={sendOtp} disabled={sending || !phone} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><MessageCircle className="w-4 h-4" /> ابعتلي الكود على واتساب</>}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setStep('enter'); setOtp(''); setError('') }} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> غيّر الرقم</button>
                {knownName && <p className="text-sm text-[#1F6F5F] font-bold mb-1">أهلاً {knownName} 👋</p>}
                <h2 className="text-lg font-black text-[#1A2E26] mb-1">اكتب الكود</h2>
                <p className="text-sm text-[#6B7280] mb-5">بعتنا كود على واتساب الرقم <span className="font-bold text-[#1A2E26]" dir="ltr">{phone}</span></p>
                <input type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && verifyOtp()} placeholder="● ● ● ● ● ●" maxLength={6} className="w-full px-3 py-3 rounded-xl bg-[#FAFAF7] text-center text-2xl font-black tracking-[0.4em]" dir="ltr" />
                {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                <button onClick={verifyOtp} disabled={sending || otp.length < 6} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التأكيد...</> : <><CheckCircle2 className="w-4 h-4" /> دخول</>}
                </button>
                <button onClick={sendOtp} disabled={sending} className="w-full mt-2 text-xs font-bold text-[#1F6F5F]">ابعت الكود تاني</button>
              </>
            )
          ) : (
            /* ============ PRIMARY: WhatsApp inbound login (send us a message) ============ */
            waPhase === 'waiting' ? (
              <>
                <button onClick={() => switchMode('wa')} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> إلغاء</button>
                <h2 className="text-lg font-black text-[#1A2E26] mb-1">ابعتلنا الكود ده على واتساب</h2>
                <p className="text-sm text-[#6B7280] mb-3">هيفتح واتساب والرسالة جاهزة — اضغط <b>إرسال</b> بس. أول ما توصلنا، هتدخل تلقائيًا.</p>
                <div className="text-3xl font-black tracking-[0.3em] text-[#1A2E26] bg-[#FAFAF7] rounded-xl py-3 text-center my-3" dir="ltr">{waCode}</div>
                <a href={waHref} target="_blank" rel="noreferrer" className="w-full block text-center py-3 rounded-xl bg-[#25D366] text-white font-black text-sm">افتح واتساب</a>
                <p className="text-[11px] text-[#6B7280] mt-3 flex items-center justify-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> في انتظار رسالتك… الكود صالح ١٠ دقائق</p>
              </>
            ) : waPhase === 'expired' ? (
              <>
                <h2 className="text-lg font-black text-[#1A2E26] mb-1">انتهت صلاحية الكود</h2>
                <p className="text-sm text-[#6B7280] mb-4">اطلب كود جديد وابعتهولنا على واتساب.</p>
                <button onClick={startWaLogin} disabled={sending} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} كود جديد
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-black text-[#1A2E26] mb-1">دخول / تسجيل</h2>
                <p className="text-sm text-[#6B7280] mb-5 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#1F6F5F]" />
                  ابعتلنا رسالة واتساب وادخل في ثانية — من غير باسورد
                </p>
                {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
                <button onClick={startWaLogin} disabled={sending} className="w-full py-3.5 rounded-xl text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(90deg,#d4a017,#2FA084,#1F6F5F)' }}>
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> لحظة...</> : <><Send className="w-4 h-4" /> دخول عبر واتساب</>}
                </button>

                <button onClick={() => switchMode('otp')} className="w-full mt-3 py-2.5 rounded-xl border border-[#1F6F5F]/25 text-[#1F6F5F] font-bold text-[13px] flex items-center justify-center gap-1.5">
                  <MessageCircle className="w-4 h-4" /> ابعتلي كود بدل كده
                </button>
                <button onClick={() => switchMode('pin')} className="w-full mt-2 py-2.5 rounded-xl border border-[#1F6F5F]/25 text-[#1F6F5F] font-bold text-[13px] flex items-center justify-center gap-1.5">
                  <Briefcase className="w-4 h-4" /> أنا موظف — دخول بالـPIN
                </button>
              </>
            )
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#6B7280] leading-relaxed">
              {mode === 'pin'
                ? 'دخول الموظفين بالـPIN بتاع البصمة. لو نسيت الـPIN كلّم إدارة الفرع. حساب واحد على مضمونة يخدمك كعميل، موظف، أو لعرض وتأجير أي حاجة.'
                : 'دخول آمن من واتساب — من غير باسورد. رقمك اللي بتبعت منه هو إثبات هويتك. حساب واحد على مضمونة يخدمك كعميل، موظف، أو لعرض وتأجير أي حاجة.'}
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com</p>
      </div>
    </div>
  )
}
