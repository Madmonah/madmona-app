'use client'

import { safeStorage } from '@/lib/safe-storage'

/* Shared Madmona customer account gate (phone + WhatsApp OTP).
   Used by the visit hub (/v) and the booking page (/book) so that
   EVERY customer — whether booking from home or on-site — has a
   Madmona account. */

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { MessageCircle, User, ShieldCheck } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import WhatsAppLogin from '@/components/WhatsAppLogin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, ANON)

export type MadmonaProfile = { name: string; phone?: string }

export function useMadmonaAuth() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [profile, setProfile] = useState<MadmonaProfile | null>(null)

  useEffect(() => {
    (async () => {
      const t = typeof window !== 'undefined' ? safeStorage.get('madmona_token') : null
      if (t) {
        // @ts-expect-error rpc typing
        const { data } = await supabase.rpc('madmona_resolve', { p_token: t })
        if (data?.authenticated) {
          setAuthed(true)
          setProfile({ name: data.full_name || data.name || '', phone: data.phone ? '0' + String(data.phone).slice(-10) : undefined })
          setChecking(false)
          return
        } else if (typeof window !== 'undefined') {
          safeStorage.remove('madmona_token')
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

// 🔑 (17 Jul 2026) اتوحّد الدخول: الفورم القديم (رقم + OTP بيتبعت بتمبلت)
// كان ميت — التمبلتس مبلوكة من ميتا فالأكواد مبتوصلش والحجوزات بتقع هنا.
// دلوقتي: «ابعت الكود للمارد» (معكوس) — نفس فلو /auth/login بالظبط،
// والرقم بيتأكد من مصدر الرسالة نفسها. WhatsAppLogin بيطلع madmona_token
// (متوافق مع كل الفلوهات القديمة) + جلسة Supabase.
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
  const [name, setName] = useState('')

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_10px_40px_-12px_rgba(31,111,95,0.25)]">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#1F6F5F]/10 grid place-items-center mx-auto mb-3"><MessageCircle className="w-7 h-7 text-[#1F6F5F]" /></div>
        <h2 className="text-xl font-black text-[#1A2E26]">{titleText}</h2>
        <p className="text-[13px] text-[#6B7280] mt-1.5 leading-relaxed max-w-xs mx-auto">{subText}</p>
      </div>

      <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{t('gate.name_label')}</label>
      <div className="relative mb-4">
        <User className="w-4 h-4 text-[#6B7280] absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('gate.name_ph')} className="w-full pr-10 pl-3 py-3.5 rounded-2xl bg-[#FAFAF7] border border-transparent text-sm outline-none focus:border-[#1F6F5F]/40 focus:bg-white transition-colors" />
      </div>

      <WhatsAppLogin
        label="أكّد رقمك بالواتساب — ثانية واحدة 🧞"
        getFullName={() => name.trim()}
        onDone={(r) => onAuthed({ name: r.full_name || name.trim() || '', phone: r.phone || undefined })}
      />

      <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#6B7280] leading-relaxed">{t('gate.secure_note')}</p>
      </div>
    </div>
  )
}
