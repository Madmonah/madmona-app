'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// التبويب السفلي الثابت لشاشات شات مضمونة — هوية 4b (29 Jul 2026):
// أبيض نضيف، التاب النشط أخضر #1F6F5F بنقطة صغيرة، والباقي رمادي #8A9690.
const TABS: { href: string; label: string; icon: string; match: (p: string) => boolean }[] = [
  { href: '/chat/marid', label: 'المارد', icon: '🧞', match: (p) => p.startsWith('/chat/marid') },
  { href: '/chat', label: 'محادثات', icon: '💬', match: (p) => p === '/chat' },
  { href: '/team', label: 'جروبات', icon: '👥', match: (p) => p.startsWith('/team') },
  { href: '/chat/tasks', label: 'مهامي', icon: '📋', match: (p) => p.startsWith('/chat/tasks') },
  { href: '/chat/offers', label: 'عروض', icon: '🏷️', match: (p) => p.startsWith('/chat/offers') },
  { href: '/chat/settings', label: 'إعدادات', icon: '⚙️', match: (p) => p.startsWith('/chat/settings') },
]

export default function ChatBottomNav() {
  const pathname = usePathname() || ''
  return (
    <nav dir="rtl" style={{ display: 'flex', background: '#fff', borderTop: '1px solid rgba(0,0,0,.06)', flexShrink: 0, boxShadow: '0 -2px 12px rgba(20,35,30,.05)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map((t) => {
        const active = t.match(pathname)
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{ flex: 1, textAlign: 'center', padding: '8px 0 9px', textDecoration: 'none', color: active ? '#1F6F5F' : '#8A9690', position: 'relative' }}
          >
            <div style={{ fontSize: 20, lineHeight: 1, filter: active ? 'none' : 'grayscale(35%)', opacity: active ? 1 : .85 }}>{t.icon}</div>
            <div style={{ fontSize: 10.5, fontWeight: active ? 900 : 600, marginTop: 3 }}>{t.label}</div>
            {active && <span style={{ position: 'absolute', top: 3, insetInlineStart: '50%', transform: 'translateX(50%)', width: 4, height: 4, borderRadius: '50%', background: '#2FA084', display: 'block' }} />}
          </Link>
        )
      })}
    </nav>
  )
}
