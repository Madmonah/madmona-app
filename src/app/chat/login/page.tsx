// src/app/chat/login/page.tsx
// Chat-scoped login screen. When شات مضمونة needs the user to log in,
// route here INSTEAD of redirecting to the main app. Same behaviour, no context loss.

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import WhatsAppLogin from '@/components/WhatsAppLogin'
import { getMadmonaSession } from '@/lib/madmonaSession'

// (31 Jul 2026) اتبدّل MadmonaInlineLogin بـ WhatsAppLogin.
// السبب بالأرقام: MadmonaInlineLogin كان بيمشي على madmona_otp_codes -
// 135 محاولة في 90 يوم، 53% منها ما اكتملتش، وآخر محاولة 26 يوليو (يوم
// التحوّل لـ Reverse OTP). يعني مهجور تماماً من ساعتها.
// المسار الحيّ هو wa_inbound_verifications: 73 محاولة في 30 يوم.
// ومكسب أهم: WhatsAppLogin بيطلّع جلسة Supabase + madmona_token مع بعض،
// بينما القديم كان بيطلّع madmona_token بس - وده كان بيكسر أي صفحة جوّه
// /chat محتاجة auth.uid() (زي قبول دعوة الأصحاب).

// صفحة دخول تعتمد على useSearchParams + الجلسة — لازم dynamic عشان ماتوقعش الـ prerender وقت البناء
export const dynamic = 'force-dynamic'

function ChatLoginInner() {
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
      <div style={{ padding: '28px 20px', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: 21, fontWeight: 900, color: '#14231E', marginBottom: 6 }}>دخول شات مضمونة</h1>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#5A6660', lineHeight: 1.8, marginBottom: 20 }}>
          ابعتلنا كود من واتساب وهتدخل على طول — من غير أي كلمة سر.
        </p>
        <WhatsAppLogin
          redirect={searchParams.get('next') || '/chat'}
          onDone={() => {
            const next = searchParams.get('next') || '/chat'
            router.replace(next.startsWith('/') ? next : '/chat')
          }}
        />
      </div>
    </div>
  )
}

export default function ChatLoginPage() {
  return (
    <Suspense fallback={null}>
      <ChatLoginInner />
    </Suspense>
  )
}
