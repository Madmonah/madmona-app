'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X, ArrowLeft } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

/* ============================================================
   <DailyMessageBanner />  — Phase B.10.4
   
   Floating bottom banner with the rotating daily message.
   Shows to ALL users (anonymous + customers + suppliers + B2B partners)
   except admin/operational pages.
   
   - Same message stays primary all day (rotates next day)
   - Tracks views/dismisses/clicks for authenticated users
   - Hides for the session once dismissed
   - Respects show_once_per_user setting
   ============================================================ */

type DailyMessage = {
  id: string
  title: string
  body: string
  category: string
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  deal_code: string | null
  show_once_per_user: boolean
  priority: number
  is_authenticated: boolean
}

const SESSION_KEY = 'madmona_daily_msg_dismissed'

// Routes where we DO NOT show the banner (operational/admin)
const HIDDEN_ROUTE_PREFIXES = [
  '/admin',
  '/clock',         // employee QR clock-in pages
  '/at',            // customer self-service inside a partner's branch
  '/auth',
  '/login',
  '/reserve',       // mid-checkout flow
  '/book',          // mid-booking flow
]

export default function DailyMessageBanner() {
  const pathname = usePathname()
  const [message, setMessage] = useState<DailyMessage | null>(null)
  const [show, setShow] = useState(false)

  // Hide on operational/admin pages
  const hiddenForThisRoute = HIDDEN_ROUTE_PREFIXES.some((p) => pathname?.startsWith(p))

  useEffect(() => {
    if (hiddenForThisRoute) return

    let mounted = true

    async function load() {
      try {
        // @ts-expect-error
        const { data, error } = await supabaseBrowser.rpc('get_todays_daily_message')
        if (error || !data || !mounted) return

        const msg = data as DailyMessage

        // Check session-level dismissal
        if (typeof window !== 'undefined') {
          const dismissed = sessionStorage.getItem(SESSION_KEY)
          if (dismissed === msg.id) return
        }

        setMessage(msg)
        // Fade-in delay (better UX, doesn't compete with page load)
        setTimeout(() => mounted && setShow(true), 800)

        if (msg.is_authenticated) {
          // @ts-expect-error
          await supabaseBrowser.rpc('mark_daily_message_action', {
            p_message_id: msg.id,
            p_action: 'view',
          })
        }
      } catch {
        // Silent — non-critical
      }
    }

    load()
    return () => { mounted = false }
  }, [hiddenForThisRoute, pathname])

  async function dismiss() {
    if (!message) return
    setShow(false)
    setTimeout(() => setMessage(null), 250)

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, message.id)
    }

    if (message.is_authenticated) {
      try {
        // @ts-expect-error
        await supabaseBrowser.rpc('mark_daily_message_action', {
          p_message_id: message.id,
          p_action: 'dismiss',
        })
      } catch {}
    }
  }

  async function onCtaClick() {
    if (!message) return
    if (message.is_authenticated) {
      try {
        // @ts-expect-error
        await supabaseBrowser.rpc('mark_daily_message_action', {
          p_message_id: message.id,
          p_action: 'click',
        })
      } catch {}
    }
  }

  if (hiddenForThisRoute || !message) return null

  const categoryIcon: Record<string, string> = {
    greeting: '👋',
    announcement: '📢',
    tip: '💡',
    deal: '🎁',
  }
  const icon = categoryIcon[message.category] || '💌'

  return (
    <div
      className={`fixed bottom-4 right-4 left-4 md:left-auto md:max-w-sm z-40
        transition-all duration-500 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      dir="rtl"
    >
      <div className="relative overflow-hidden bg-gradient-to-l from-[#1F6F5F] to-[#185547] text-white rounded-2xl p-4 shadow-xl border border-white/10">
        {/* Background flourish */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        {/* Dismiss button */}
        <button
          onClick={dismiss}
          aria-label="إخفاء"
          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors backdrop-blur-sm"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="relative flex items-start gap-3 pr-1">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-xl flex-shrink-0">
            {icon}
          </div>

          <div className="flex-1 min-w-0 pl-6">
            <h3 className="text-sm font-black mb-1 leading-tight">{message.title}</h3>
            <p className="text-xs text-white/90 leading-relaxed line-clamp-3">{message.body}</p>

            {message.deal_code && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1">
                <span className="text-[10px] font-bold opacity-80">كود:</span>
                <span className="text-xs font-black font-mono">{message.deal_code}</span>
              </div>
            )}

            {message.cta_label && message.cta_url && (
              <Link
                href={message.cta_url}
                onClick={onCtaClick}
                className="mt-2.5 inline-flex items-center gap-1.5 bg-white text-[#1F6F5F] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white/90 transition-colors"
              >
                {message.cta_label}
                <ArrowLeft className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
