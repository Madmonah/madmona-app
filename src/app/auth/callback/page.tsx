'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, AlertCircle } from 'lucide-react'

// A real Egyptian number looks like +20XXXXXXXXXX. Anything else
// (empty, or the 'oauth:<uuid>' placeholder set for social signups)
// means we still need to capture + verify a phone via WhatsApp OTP.
function hasRealPhone(phone: string | null | undefined): boolean {
  return /^\+20\d{10}$/.test(phone || '')
}

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/account'
  const [error, setError] = useState<string | null>(null)
  const handled = useRef(false)

  useEffect(() => {
    const route = async (user: { id: string; user_metadata?: Record<string, unknown> | null }) => {
      if (handled.current) return
      handled.current = true
      try {
        // اللي وثّق واتساب بالوارد (حتى برقم مخفي/LID) بيتعلّم wa_verified في
        // الـmetadata — عشان مايفضلش يترجّع لصفحة التوثيق كل مرة (loop).
        const waVerified = user.user_metadata?.wa_verified === true
        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle()
        // @ts-expect-error loose profile typing
        if (hasRealPhone(profile?.phone) || waVerified) {
          router.replace(redirectTo)
        } else {
          // حساب جوجل من غير رقم موثّق → لازم يوثّق رقمه بالوارد (ابعت كود للمارد)
          router.replace(`/auth/complete-phone?redirect=${encodeURIComponent(redirectTo)}`)
        }
        router.refresh()
      } catch (e) {
        console.error('[auth/callback] routing error:', e)
        // If the phone check fails for any reason, be safe and ask for phone.
        router.replace(`/auth/complete-phone?redirect=${encodeURIComponent(redirectTo)}`)
      }
    }

    // 1) Session may already be available (detectSessionInUrl parses the hash).
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session?.user) route(data.session.user)
    })

    // 2) Otherwise wait for the SIGNED_IN event once the URL is processed.
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session?.user) route(session.user)
    })

    // 3) Fallback: if nothing happened in 6s, the OAuth likely failed.
    const timer = setTimeout(() => {
      if (!handled.current) {
        setError('مقدرناش نكمّل الدخول بـ Google. حاول تاني.')
      }
    }, 6000)

    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [router, redirectTo])

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-luxe p-10 text-center">
        {error ? (
          <>
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-sm text-gray-700 mb-6">{error}</p>
            <button
              onClick={() => router.replace('/auth/login')}
              className="bg-[#1F6F5F] text-white px-6 py-3 rounded-2xl font-bold shadow-elevated hover:-translate-y-0.5 transition-all"
            >
              ارجع لتسجيل الدخول
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-7 h-7 text-[#1F6F5F] animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">ثانية واحدة، بنكمّل دخولك…</p>
          </>
        )}
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
