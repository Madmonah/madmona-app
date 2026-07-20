'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Sparkles, X, ArrowLeft } from 'lucide-react'
import { safeStorage } from '@/lib/safe-storage'

// ============================================================================
// LaunchBanner — DOUBLE OFFER promotional banner
//
// Customer offer: 50 EGP cashback on first booking
// Supplier offer: 0% commission for first 30 days
//
// - Appears below the TopNav + FinancialTicker
// - Animates with subtle pulse to grab attention
// - Dismissible (saves to localStorage)
// - Links to /launch page
// - Auto-rotates between two messages every 4 seconds
// - Auto-hides after launch period
// ============================================================================

const LAUNCH_END = new Date('2026-06-15T23:59:59')
const STORAGE_KEY = 'madmona_launch_banner_dismissed_v2'
const ROTATION_MS = 4500

const MESSAGES = [
  {
    badge: 'لـ أجر مننا',
    text: 'كاش باك ٥٠ ج على أول حجز',
    sublabel: 'ساري لأول ١٠٠ من أجر مننا',
    color: 'from-[#1F6F5F] via-[#2d7a52] to-[#1F6F5F]',
    cta: 'احجز دلوقتي',
  },
  {
    badge: 'لـ ضيف المنتج',
    text: '٠٪ عمولة لأول ٣٠ يوم',
    sublabel: 'سجّل منتجك مجاناً',
    color: 'from-[#2FA084] via-[#D4A12A] to-[#2FA084]',
    cta: 'ضيف منتجك',
  },
]

export default function LaunchBanner() {
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && safeStorage.get(STORAGE_KEY)) return
    if (Date.now() > LAUNCH_END.getTime()) return
    const t = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Auto-rotate between offers
  useEffect(() => {
    if (!visible) return
    const t = setInterval(() => {
      setIndex(i => (i + 1) % MESSAGES.length)
    }, ROTATION_MS)
    return () => clearInterval(t)
  }, [visible])

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof window !== 'undefined') {
      safeStorage.set(STORAGE_KEY, '1')
    }
    setVisible(false)
  }

  if (!visible) return null

  const current = MESSAGES[index]

  return (
    <Link
      href="/launch"
      className={`block bg-gradient-to-l ${current.color} text-white py-2.5 px-4 no-underline group hover:brightness-110 transition-all relative overflow-hidden`}
      dir="rtl"
    >
      {/* Animated shine effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shine_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>

          <Sparkles className="w-4 h-4 flex-shrink-0 hidden md:block" />

          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <span className="inline-block bg-white/25 backdrop-blur px-2 py-0.5 rounded text-[10px] md:text-xs font-black flex-shrink-0">
              {current.badge}
            </span>
            <p className="text-xs md:text-sm font-bold leading-tight truncate transition-all duration-500" key={index}>
              <span className="font-black">{current.text}</span>
              <span className="hidden sm:inline opacity-80 mr-2">· {current.sublabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden md:inline-flex items-center gap-1 text-xs font-bold group-hover:gap-2 transition-all">
            {current.cta}
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="إخفاء"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dot indicators showing the 2 offers */}
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1">
        {MESSAGES.map((_, i) => (
          <span
            key={i}
            className={`h-0.5 rounded-full transition-all duration-500 ${
              i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(200%); }
        }
      `}</style>
    </Link>
  )
}
