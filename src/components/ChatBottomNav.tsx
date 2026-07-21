'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// التبويب السفلي الثابت لشاشات الشات — زي واتساب
const TABS: { href: string; label: string; icon: string; match: (p: string) => boolean }[] = [
  { href: '/chat/marid', label: 'المارد', icon: '🧞', match: (p) => p.startsWith('/chat/marid') },
  { href: '/chat', label: 'محادثات', icon: '💬', match: (p) => p === '/chat' },
  { href: '/team', label: 'فريق', icon: '👥', match: (p) => p.startsWith('/team') },
  { href: '/chat/offers', label: 'عروض', icon: '🏷️', match: (p) => p.startsWith('/chat/offers') },
  { href: '/chat/settings', label: 'إعدادات', icon: '⚙️', match: (p) => p.startsWith('/chat/settings') },
]

export default function ChatBottomNav() {
  const pathname = usePathname() || ''
  return (
    <nav dir="rtl" style={{ display: 'flex', background: '#fff', borderTop: '1px solid #e2e2e2', flexShrink: 0 }}>
      {TABS.map((t) => {
        const active = t.match(pathname)
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{ flex: 1, textAlign: 'center', padding: '8px 0 10px', textDecoration: 'none', color: active ? '#075E54' : '#8a8a8a' }}
          >
            <div style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</div>
            <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, marginTop: 3 }}>{t.label}</div>
          </Link>
        )
      })}
    </nav>
  )
}
