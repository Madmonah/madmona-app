'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Sparkles, X, ArrowLeft, Gift } from 'lucide-react'

// ============================================================================
// LaunchBanner — promotional banner for launch week
//
// - Appears below the TopNav + FinancialTicker
// - Animates with subtle pulse to grab attention
// - Dismissible (saves to localStorage)
// - Links to /launch page
// - Auto-hides after launch week (May 15, 2026)
// ============================================================================

const LAUNCH_END = new Date('2026-05-15T23:59:59') // adjust as needed
const STORAGE_KEY = 'madmona_launch_banner_dismissed_v1'

export default function LaunchBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show if dismissed
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) {
      return
    }
    // Don't show after launch period
    if (Date.now() > LAUNCH_END.getTime()) {
      return
    }
    // Slight delay so it doesn't flash on load
    const t = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Link
      href="/launch"
      className="block bg-gradient-to-l from-[#B8860B] via-[#D4A12A] to-[#B8860B] text-white py-2.5 px-4 no-underline group hover:brightness-110 transition-all relative overflow-hidden"
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

          <p className="text-xs md:text-sm font-bold leading-tight truncate">
            <span className="inline-block bg-white/20 backdrop-blur px-2 py-0.5 rounded text-[10px] md:text-xs ml-2">
              LAUNCH WEEK
            </span>
            <span className="hidden sm:inline">🎁 خصم </span>
            <span className="font-black">15%</span> أول حجز ·
            <span className="hidden sm:inline"> كود </span>
            <span className="font-black bg-white/30 px-1.5 py-0.5 rounded text-[11px] md:text-xs mx-1">
              LAUNCH15
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden md:inline-flex items-center gap-1 text-xs font-bold group-hover:gap-2 transition-all">
            سجّل دلوقتي
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

      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(200%); }
        }
      `}</style>
    </Link>
  )
}
