'use client'

// جسر تحويل جوه نطاق /chat.
// السبب: شات مضمونة مثبّت بنطاق /chat. لو الـservice worker فتح /team?room=..
// مباشرة والتطبيق مقفول، الرابط بره النطاق فبيفتح في براوزر مش جوه التطبيق.
// فالإشعار بيجي هنا (جوه النطاق) والتحويل يحصل client-side فيفضل جوه التطبيق.
// ملحوظة: useSearchParams لازم جوه Suspense وإلا البيلد بيفشل عند prerender.

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function Redirector() {
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    const to = sp.get('to') || '/chat'
    // أمان: مسارات داخلية بس — مفيش تحويل لدومين بره
    const safe = to.startsWith('/') && !to.startsWith('//') ? to : '/chat'
    router.replace(safe)
  }, [router, sp])

  return null
}

function Splash() {
  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F1EEE6', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🧞</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#5A6660' }}>لحظة…</div>
      </div>
    </div>
  )
}

export default function ChatGo() {
  return (
    <>
      <Splash />
      <Suspense fallback={null}>
        <Redirector />
      </Suspense>
    </>
  )
}
