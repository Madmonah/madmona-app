'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, X, ArrowLeft, ShieldCheck, Clock, TrendingUp } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'

// ============================================================================
// WelcomeSupplierBanner
//
// Big, dismissible welcome card on /account that explains:
//   - Dual role: same account works as both customer AND supplier
//   - 0% commission for 30 days hook
//   - One-click CTA to /supplier/register
//
// Shows ONLY when:
//   - User has no supplier record (i.e., they haven't registered as supplier)
//   - User hasn't dismissed it yet (localStorage)
// ============================================================================

const STORAGE_KEY = 'madmona_welcome_supplier_banner_dismissed_v1'

interface Props {
  // The user's full name (to personalize the greeting)
  userName?: string | null
}

export default function WelcomeSupplierBanner({ userName }: Props) {
  const { t } = useT()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY)) return
    // Small delay so it animates in nicely after the rest of the page
    const t = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setVisible(false)
  }

  if (!visible) return null

  // First name only for personal greeting
  const firstName = userName?.split(' ')[0] || ''

  return (
    <div className="relative bg-gradient-to-br from-[#1F6F5F] via-[#2d7a52] to-[#1F6F5F] text-white rounded-3xl p-6 md:p-7 shadow-luxe overflow-hidden animate-slide-up">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-[#2FA084]/30 rounded-full blur-3xl pointer-events-none -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none translate-y-1/3 translate-x-1/3" />

      {/* Animated shine */}
      <div className="absolute inset-0 -translate-x-full animate-[shine_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 left-3 w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors z-20"
        aria-label={t('comp.wsb.dismiss')}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="relative z-10">
        {/* Header with icon + greeting */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#2FA084]/30 backdrop-blur rounded-full text-[10px] font-black tracking-widest uppercase mb-2">
              <Clock className="w-2.5 h-2.5" />
              {t('comp.wsb.launch_offer')}
            </div>
            <h2 className="text-xl md:text-2xl font-black leading-tight">
              {firstName ? t('comp.wsb.hi_name', { name: firstName }) : t('comp.wsb.hi')} 🟢
            </h2>
          </div>
        </div>

        {/* Main message */}
        <p className="text-sm md:text-base text-white/95 leading-relaxed mb-4">
          {t('comp.wsb.msg_pre')} <span className="font-black bg-white/15 px-1.5 py-0.5 rounded">{t('account.section_customer')}</span>
          {' '}<span className="opacity-80">{t('comp.wsb.and')}</span>{' '}
          <span className="font-black bg-[#2FA084]/30 px-1.5 py-0.5 rounded">{t('comp.wsb.add_listing_word')}</span> {t('comp.wsb.msg_post')}
        </p>

        {/* Two columns: customer + supplier */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white/10 backdrop-blur rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-90">{t('comp.wsb.as_customer')}</p>
            </div>
            <p className="text-xs text-white/90 leading-snug">
              {t('comp.wsb.customer_perk')}
            </p>
          </div>

          <div className="bg-[#2FA084]/25 backdrop-blur rounded-xl p-3 border border-[#2FA084]/40">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <p className="text-[10px] font-black uppercase tracking-widest">{t('comp.wsb.add_listing_word')}</p>
            </div>
            <p className="text-xs text-white/95 leading-snug font-semibold">
              {t('comp.wsb.supplier_perk')}
            </p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/add-listing"
          className="group flex items-center justify-between gap-2 bg-white text-[#1F6F5F] px-4 py-3 rounded-2xl font-black text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2FA084]" />
            {t('comp.wsb.cta')}
          </span>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </Link>

        <p className="text-[11px] text-white/70 text-center mt-3">
          {t('comp.wsb.footer')}
        </p>
      </div>

      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}
