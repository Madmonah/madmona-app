'use client'

/* Shared Madmona customer account gate (phone + WhatsApp OTP).
   Used by the visit hub (/v) and the booking page (/book) so that
   EVERY customer — whether booking from home or on-site — has a
   Madmona account. */

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, MessageCircle, User, Phone, Check, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'

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
          setChecking(false)
          return
        } else if (typeof window !== 'undefined') {
          localStorage.removeItem('madmona_token')
        }
      }
      // Admin bypass: a logged-in Madmona admin (Supabase Auth) skips the customer gate
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (session?.user) {
          // @ts-expect-error rpc typing
          const { data: ok } = await supabaseBrowser.rpc('is_admin')
          if (ok === true) {
            // @ts-expect-error rpc typing
            const { data: prof } = await supabaseBrowser.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
            setAuthed(true)
            setProfile({ name: prof?.full_name || 'مضمونة', phone: session.user.phone ? '0' + String(session.user.phone).slice(-10) : undefined })
            setChecking(false)
            return
          }
        }
      } catch { /* ignore */ }
      setChecking(false)
    })()
  }, [])

  return { checking, authed, profile, setAuthed, setProfile }
}

export function AccountGate({
  onAuthed,
  title,
  subtitle,
}: {
  onAuthed: (p: MadmonaProfile) => void
  title?: string
  subtitle?: string
}) {
  const { t } = useT()
  const titleText = title ?? t('gate.title_default')
  const subText = subtitle ?? t('gate.subtitle_default')
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
      if (!d?.success) setErr(d?.error || t('gate.err_send'))
      else { setKnownName(d?.known_name || null); setStep('verify') }
    } catch { setErr(t('gate.err_conn')) }
    setBusy(false)
  }

  async function verify() {
    setBusy(true); setErr('')
    // @ts-expect-error rpc typing
    const { data, error } = await supabase.rpc('madmona_verify_otp', { p_phone: clean(phone), p_code: otp, p_full_name: name || null })
    if (error || !data?.success) { setErr(data?.error || error?.message || t('gate.err_otp')); setBusy(false); return }
    localStorage.setItem('madmona_token', data.token)
    onAuthed({ name: knownName || name, phone: '0' + clean(phone).slice(-10) })
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_10px_40px_-12px_rgba(31,111,95,0.25)]">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#1F6F5F]/10 grid place-items-center mx-auto mb-3"><MessageCircle className="w-7 h-7 text-[#1F6F5F]" /></div>
        <h2 className="text-xl font-black text-[#1A2E26]">{titleText}</h2>
        <p className="text-[13px] text-[#6B7280] mt-1.5 leading-relaxed max-w-xs mx-auto">{subText}</p>
      </div>

      {step === 'enter' ? (
        <>
          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{t('gate.mobile_label')}</label>
          <div className="relative mb-3">
            <Phone className="w-4 h-4 text-[#6B7280] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full pr-10 pl-3 py-3.5 rounded-2xl bg-[#FAFAF7] border border-transparent text-sm font-mono outline-none focus:border-[#1F6F5F]/40 focus:bg-white transition-colors" dir="ltr" />
          </div>
          <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{t('gate.name_label')}</label>
          <div className="relative">
            <User className="w-4 h-4 text-[#6B7280] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={t('gate.name_ph')} className="w-full pr-10 pl-3 py-3.5 rounded-2xl bg-[#FAFAF7] border border-transparent text-sm outline-none focus:border-[#1F6F5F]/40 focus:bg-white transition-colors" />
          </div>
          {err && <p className="text-xs text-red-600 mt-2.5">{err}</p>}
          <button onClick={send} disabled={busy || !phone} className="w-full mt-5 py-4 rounded-2xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#1F6F5F]/25 active:scale-[0.99] transition-all">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('gate.sending')}</> : <><MessageCircle className="w-4 h-4" /> {t('gate.send_code')}</>}
          </button>
        </>
      ) : (
        <>
          <button onClick={() => { setStep('enter'); setOtp(''); setErr('') }} className="text-xs font-bold text-[#6B7280] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t('gate.change_number')}</button>
          {knownName && <p className="text-sm text-[#1F6F5F] font-bold mb-1">{t('gate.hi_known', { name: knownName })}</p>}
          <p className="text-[13px] text-[#6B7280] mb-3">{t('gate.sent_to')} <span className="font-bold text-[#1A2E26]" dir="ltr">{phone}</span></p>
          <input type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && verify()} placeholder="● ● ● ● ● ●" maxLength={6} className="w-full px-3 py-3.5 rounded-2xl bg-[#FAFAF7] text-center text-2xl font-black tracking-[0.4em] outline-none focus:bg-white border border-transparent focus:border-[#1F6F5F]/40 transition-colors" dir="ltr" />
          {err && <p className="text-xs text-red-600 mt-2.5">{err}</p>}
          <button onClick={verify} disabled={busy || otp.length < 6} className="w-full mt-5 py-4 rounded-2xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#1F6F5F]/25 active:scale-[0.99] transition-all">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('gate.verifying')}</> : <><Check className="w-4 h-4" /> {t('gate.confirm_enter')}</>}
          </button>
          <button onClick={send} disabled={busy} className="w-full mt-2.5 text-xs font-bold text-[#1F6F5F]">{t('gate.resend')}</button>
        </>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#6B7280] leading-relaxed">{t('gate.secure_note')}</p>
      </div>
    </div>
  )
}
