'use client'

/* Shared Madmona customer account gate (phone + WhatsApp OTP).
   Used by the visit hub (/v) and the booking page (/book) so that
   EVERY customer — whether booking from home or on-site — has a
   Madmona account. */

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, MessageCircle, User, Phone, Check, ArrowLeft, ShieldCheck } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, ANON)

export type MadmonaProfile = { name: string; phone?: string }
const clean = (s: string) => s.replace(/[^0-9]/g, '')

export function useMadmonaAuth() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [profile, setProfile] = useState<MadmonaProfile | null>(null)

  useEffect(() => {
    (async () => {
      const t = typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null
      if (t) {
        // @ts-expect-error rpc typing
        const { data } = await supabase.rpc('madmona_resolve', { p_token: t })
        if (data?.authenticated) {
          setAuthed(true)
          setProfile({ name: data.full_name || data.name || '', phone: data.phone ? '0' + String(data.phone).slice(-10) : undefined })
        } else if (typeof window !== 'undefined') {
          localStorage.removeItem('madmona_token')
        }
      }
      setChecking(false)
    })()
  }, [])

  return { checking, authed, profile, setAuthed, setProfile }
}

export function AccountGate({
  onAuthed,
  title = 'اعملي حسابك في ثانية',
  subtitle = 'عشان تحجزي، تتابعي مواعيدك، وتاخدي عروض — هنبعتلك كود تأكيد على واتساب.',
}: {
  onAuthed: (p: MadmonaProfile) => void
  title?: string
  subtitle?: string
}) {
  const [step, setStep] = useState<'enter' | 'verify'>('enter')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [knownName, setKnownName] = useState<string | null>(null)

  async function send() {
    if (!phone) return
    setBusy(true); setErr('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/madmona-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}` },
        body: JSON.stringify({ phone: clean(phone), full_name: name || null }),
      })
      const d = await res.json()
      if (!d?.success) setErr(d?.error || 'فشل إرسال الكود')
      else { setKnownName(d?.known_name || null); setStep('verify') }
    } catch { setErr('مشكلة في الاتصال، حاولي تاني') }
    setBusy(false)
  }

  async function verify() {
    setBusy(true); setErr('')
    // @ts-expect-error rpc typing
    const { data, error } = await supabase.rpc('madmona_verify_otp', { p_phone: clean(phone), p_code: otp, p_full_name: name || null })
    if (error || !data?.success) { setErr(data?.error || error?.message || 'الكود غلط'); setBusy(false); return }
    localStorage.setItem('madmona_token', data.token)
    onAuthed({ name: knownName || name, phone: '0' + clean(phone).slice(-10) })
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_10px_40px_-12px_rgba(31,111,95,0.25)]">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#1F6F5F]/10 grid place-items-center mx-auto mb-3"><MessageCircle className="w-7 h-7 text-[#1F6F5F]" /></div>
        <h2 className="text-xl font-black text-[#1A2E26]">{title}</h2>
        <p className="text-[13px] text-[#6B7280] mt-1.5 leading-relaxed max-w-xs mx-auto">{subtitle}</p>
      </div>

      {step === 'enter' ? (
        <>
          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">رقم الموبايل</label>
          <div className="relative mb-3">
            <Phone className="w-4 h-4 text-[#6B7280] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full pr-10 pl-3 py-3.5 rounded-2xl bg-[#FAFAF7] border border-transparent text-sm font-mono outline-none focus:border-[#1F6F5F]/40 focus:bg-white transition-colors" dir="ltr" />
          </div>
          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">اسمك</label>
          <div className="relative">
            <User className="w-4 h-4 text-[#6B7280] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="اكتبي اسمك" className="w-full pr-10 pl-3 py-3.5 rounded-2xl bg-[#FAFAF7] border border-transparent text-sm outline-none focus:border-[#1F6F5F]/40 focus:bg-white transition-colors" />
          </div>
          {err && <p className="text-xs text-red-600 mt-2.5">{err}</p>}
          <button onClick={send} disabled={busy || !phone} className="w-full mt-5 py-4 rounded-2xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#1F6F5F]/25 active:scale-[0.99] transition-all">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><MessageCircle className="w-4 h-4" /> ابعتيلي الكود على واتساب</>}
          </button>
        </>
      ) : (
        <>
          <button onClick={() => { setStep('enter'); setOtp(''); setErr('') }} className="text-xs font-bold text-[#6B7280] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> غيّري الرقم</button>
          {knownName && <p className="text-sm text-[#1F6F5F] font-bold mb-1">أهلاً {knownName} 👋</p>}
          <p className="text-[13px] text-[#6B7280] mb-3">بعتنا كود على واتساب الرقم <span className="font-bold text-[#1A2E26]" dir="ltr">{phone}</span></p>
          <input type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && verify()} placeholder="● ● ● ● ● ●" maxLength={6} className="w-full px-3 py-3.5 rounded-2xl bg-[#FAFAF7] text-center text-2xl font-black tracking-[0.4em] outline-none focus:bg-white border border-transparent focus:border-[#1F6F5F]/40 transition-colors" dir="ltr" />
          {err && <p className="text-xs text-red-600 mt-2.5">{err}</p>}
          <button onClick={verify} disabled={busy || otp.length < 6} className="w-full mt-5 py-4 rounded-2xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#1F6F5F]/25 active:scale-[0.99] transition-all">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التأكيد...</> : <><Check className="w-4 h-4" /> تأكيد ودخول</>}
          </button>
          <button onClick={send} disabled={busy} className="w-full mt-2.5 text-xs font-bold text-[#1F6F5F]">ابعتي الكود تاني</button>
        </>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#6B7280] leading-relaxed">دخول آمن بكود لمرة واحدة على واتساب — من غير باسوورد. حساب واحد على مضمونة يخدمك في أي مكان.</p>
      </div>
    </div>
  )
}
