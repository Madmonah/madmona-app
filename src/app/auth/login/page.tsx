'use client'
// 🔑 /auth/login → /login (٩/٩/٢٠٢٦)
// محمد: «شوف قصة إنشاء الحساب وتسجيل الدخول وحاول الموضوع مايلخبطش الناس».
// كان فيه **شاشتين دخول** مختلفتين: /login (الموحّدة من ٥/٩) و/auth/login
// (الأقدم) — و٢٥ لينك في الموقع (التوب ناف · الهوم · صفحات الإعلانات · الحجز)
// كانوا بيودّوا على القديمة، فالمستخدم بيشوف شكلين حسب المكان اللي داس منه.
// دلوقتي شاشة واحدة بس (/login: جوجل → باسورد → واتساب). الكود القديم
// محفوظ في LegacyAuthLogin.tsx.
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function AuthLoginRedirectInner() {
  const router = useRouter()
  const sp = useSearchParams()
  useEffect(() => {
    const redirect = sp?.get('redirect') || sp?.get('next') || ''
    const q = new URLSearchParams()
    if (redirect.startsWith('/') && !redirect.startsWith('//')) q.set('next', redirect)
    const phone = sp?.get('phone') || ''
    if (phone) q.set('phone', phone)
    const qs = q.toString()
    router.replace('/login' + (qs ? `?${qs}` : ''))
  }, [router, sp])
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>
}

// useSearchParams لازم يبقى جوّه Suspense وإلا next build بيرفض الـprerender
export default function AuthLoginRedirect() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>}>
      <AuthLoginRedirectInner />
    </Suspense>
  )
}
