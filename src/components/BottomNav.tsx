'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Plus, User } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import type { MouseEvent } from 'react'

// ============================================================
// BottomNav — mobile-only bottom navigation (design 2a)
// 5 columns + raised center "ضيف" FAB:
//   الرئيسية · السوق · [ضيف FAB] · الشات · حسابي
// FAB → /add-listing (passes ?track= if the user is standing on a vertical).
// ============================================================

export default function BottomNav() {
  const { t, lang, dir } = useT()
  const pathname = usePathname() || '/'
  const en = lang === 'en'

  const addListing = (e: MouseEvent) => {
    try {
      const tr = new URLSearchParams(window.location.search).get('track')
      if (tr) {
        e.preventDefault()
        window.location.assign(`/add-listing?track=${encodeURIComponent(tr)}`)
      }
    } catch { /* fall through to plain link */ }
  }

  const homeActive = pathname === '/'
  // 🏗️ (29 Jul 2026) بورصة مشاريع المطوّرين جزء من عالم «السوق» — التبويب بينوّر عليها
  const marketActive = pathname.startsWith('/marketplace') || pathname.startsWith('/real-estate')
  const chatActive = pathname.startsWith('/chat')
  const accountActive = pathname === '/account' || (pathname.startsWith('/account') && !pathname.startsWith('/account/favorites'))

  return (
    <nav
      dir={dir}
      className="fixed bottom-0 inset-x-0 z-40 md:hidden glass border-t border-black/[0.06] shadow-luxe"
    >
      <div className="grid grid-cols-5 max-w-md mx-auto items-end px-1 pt-2.5 pb-[calc(12px+env(safe-area-inset-bottom))]">
        {/* الرئيسية */}
        <Link href="/" className={`flex flex-col items-center gap-1 no-underline ${homeActive ? 'text-[#1F6F5F]' : 'text-[#6B7280]'}`}>
          <Home className="w-5 h-5" strokeWidth={homeActive ? 2.5 : 2} fill={homeActive ? 'rgba(31,111,95,.1)' : 'none'} />
          <span className={`text-[10px] ${homeActive ? 'font-extrabold' : 'font-medium'}`}>{t('nav.home')}</span>
        </Link>

        {/* السوق */}
        <Link href="/marketplace" className={`flex flex-col items-center gap-1 no-underline ${marketActive ? 'text-[#1F6F5F]' : 'text-[#6B7280]'}`}>
          <Compass className="w-5 h-5" strokeWidth={marketActive ? 2.5 : 2} fill={marketActive ? 'rgba(31,111,95,.1)' : 'none'} />
          <span className={`text-[10px] ${marketActive ? 'font-extrabold' : 'font-medium'}`}>{t('nav.marketplace')}</span>
        </Link>

        {/* ضيف — FAB */}
        <Link href="/add-listing" onClick={addListing} className="flex flex-col items-center -mt-[26px] no-underline">
          <span className="w-[52px] h-[52px] rounded-[18px] bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] border-[3px] border-white flex items-center justify-center shadow-[0_10px_24px_-6px_rgba(31,111,95,.5)]">
            <Plus className="w-6 h-6 text-white" strokeWidth={3} />
          </span>
          <span className="text-[10px] font-extrabold text-[#1F6F5F] mt-[3px]">{en ? 'List' : 'ضيف'}</span>
        </Link>

        {/* الشات */}
        <Link href="/chat" className={`flex flex-col items-center gap-1 no-underline ${chatActive ? 'text-[#1F6F5F]' : 'text-[#6B7280]'}`}>
          <span className={`text-[20px] leading-none ${chatActive ? '' : 'grayscale opacity-75'}`}>🧞</span>
          <span className={`text-[10px] ${chatActive ? 'font-extrabold' : 'font-medium'}`}>{en ? 'Chat' : 'الشات'}</span>
        </Link>

        {/* حسابي */}
        <Link href="/account" className={`flex flex-col items-center gap-1 no-underline ${accountActive ? 'text-[#1F6F5F]' : 'text-[#6B7280]'}`}>
          <User className="w-5 h-5" strokeWidth={accountActive ? 2.5 : 2} />
          <span className={`text-[10px] ${accountActive ? 'font-extrabold' : 'font-medium'}`}>{t('nav.account')}</span>
        </Link>
      </div>
    </nav>
  )
}
