'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Heart, User } from 'lucide-react'

// ============================================================
// BottomNav — mobile-only bottom navigation
// Shows on home, marketplace, favorites, account pages.
// Adds bottom padding via parent page (use pb-24 or similar).
// ============================================================

export default function BottomNav() {
  const pathname = usePathname() || '/'

  const tabs = [
    { href: '/', label: 'الرئيسية', icon: Home, match: (p: string) => p === '/' },
    { href: '/marketplace', label: 'Marketplace', icon: Compass, match: (p: string) => p.startsWith('/marketplace') },
    { href: '/account/favorites', label: 'المفضلة', icon: Heart, match: (p: string) => p.startsWith('/account/favorites') },
    { href: '/account', label: 'حسابي', icon: User, match: (p: string) => p === '/account' || (p.startsWith('/account') && !p.startsWith('/account/favorites')) },
  ]

  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden glass border-t border-white/40 shadow-luxe"
    >
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 py-3 no-underline transition-all ${
                active ? 'text-[#1F5F3F]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className={`relative ${active ? 'scale-110' : ''} transition-transform`}>
                <Icon className={`w-5 h-5 ${active ? 'fill-[#1F5F3F]/10' : ''}`} strokeWidth={active ? 2.5 : 2} />
                {active && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
                )}
              </div>
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
      {/* Safe area padding for iOS notch */}
      <div className="pb-[env(safe-area-inset-bottom)] bg-transparent" />
    </nav>
  )
}
