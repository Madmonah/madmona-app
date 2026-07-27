// src/app/chat/login/page.tsx
// Chat-scoped login screen. When شات مضمونة needs the user to log in,
// route here INSTEAD of redirecting to the main app. Same behaviour, no context loss.

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import MadmonaInlineLogin from '@/components/MadmonaInlineLogin'
import { getMadmonaSession } from '@/lib/madmonaSession'

export default function ChatLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // If already logged in, bounce back to chat home
  useEffect(() => {
    const session = getMadmonaSession()
    if (session) {
      const next = searchParams.get('next') || '/chat'
      router.replace(next.startsWith('/') ? next : '/chat')
    }
    // Also save intended return path so /auth/magic can bring us back here
    const next = searchParams.get('next') || '/chat'
    try {
      sessionStorage.setItem('madmona_return_to', next.startsWith('/') ? next : '/chat')
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFAF7',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <MadmonaInlineLogin
        title="دخول شات مضمونة"
        subtitle="ادخل رقم واتسابك عشان تبدأ الشات مع المارد"
        onSuccess={() => {
          const next = searchParams.get('next') || '/chat'
          router.replace(next.startsWith('/') ? next : '/chat')
        }}
      />
    </div>
  )
}
