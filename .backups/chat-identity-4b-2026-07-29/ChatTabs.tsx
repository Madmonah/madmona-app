'use client'

import Link from 'next/link'

// تابات فوق بشكل واتساب: المحادثة | فريق العمل — بتوحّد /chat و /team
export default function ChatTabs({ active }: { active: 'chat' | 'team' }) {
  const tabs = [
    { key: 'chat', href: '/chat', label: 'المحادثة', icon: '💬' },
    { key: 'team', href: '/team', label: 'فريق العمل', icon: '👥' },
  ] as const
  return (
    <div dir="rtl" style={{ display: 'flex', background: '#075E54' }}>
      {tabs.map((todo) => {
        const on = todo.key === active
        return (
          <Link
            key={todo.key}
            href={todo.href}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '11px 6px',
              color: on ? '#fff' : 'rgba(255,255,255,.6)',
              fontWeight: on ? 800 : 600,
              fontSize: 14,
              textDecoration: 'none',
              borderBottom: on ? '3px solid #25D366' : '3px solid transparent',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {todo.icon} {todo.label}
          </Link>
        )
      })}
    </div>
  )
}
