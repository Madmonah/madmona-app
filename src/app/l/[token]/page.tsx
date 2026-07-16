'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, Sparkles } from 'lucide-react'

// =====================================================================
// /l/[token] — لينك المارد الممغنط 🧞
// أي لينك المارد بيبعته على الواتساب بيتغلف بالشكل ده. لما العميل يفتحه:
// بيتسجّل دخوله تلقائي (إحنا عارفين رقم الواتساب بتاعه) وبيتوجه لوجهته.
// الصرف بيتم بـPOST من الجافاسكريبت — فبوت البريفيو بتاع واتساب
// (اللي بيعمل GET بس) مش بيحرق التوكن.
// السبب: أوردرات كانت بتتلغى عشان الناس مش عارفة تسجل دخول.
// =====================================================================

export default function MagicLinkPage() {
  const params = useParams()
  const router = useRouter()
  const token = String((params as Record<string, string>)?.token || '')
  const ran = useRef(false)
  const [state, setState] = useState<'working' | 'error'>('working')
  const [next, setNext] = useState('/')

  useEffect(() => {
    if (!token || ran.current) return
    ran.current = true
    ;(async () => {
      try {
        // لو داخل أصلاً بنفس الحساب — روح على طول من غير صرف استخدام
        const res = await fetch('/api/auth/wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'magic', token }),
        })
        const j = await res.json()
        const dest = j.next || '/'
        setNext(dest)

        if (!res.ok) {
          // اللينك خلص/انتهى؟ لو فيه سيشن قديمة سيبها توصله، وإلا وجّهه عادي من غير دخول
          router.replace(dest)
          return
        }

        const { error } = await supabaseBrowser.auth.verifyOtp({
          type: 'email', token_hash: j.token_hash,
        })
        if (error) {
          console.error('[magic-link] verifyOtp:', error)
          router.replace(dest) // برضه وصّله — أسوأ حاجة يكون مش مسجل
          return
        }
        router.replace(dest)
        router.refresh()
      } catch (e) {
        console.error('[magic-link] error:', e)
        setState('error')
      }
    })()
  }, [token, router])

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-luxe p-8 text-center max-w-sm w-full">
        {state === 'working' ? (
          <>
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#1F6F5F]/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#1F6F5F]" />
            </div>
            <p className="font-black text-gray-900 mb-1.5">ثانية واحدة…</p>
            <p className="text-sm text-gray-500 mb-4">بنجهّزلك حسابك وندخّلك على طول 🧞</p>
            <Loader2 className="w-5 h-5 text-[#1F6F5F] animate-spin mx-auto" />
          </>
        ) : (
          <>
            <p className="font-black text-gray-900 mb-1.5">اللينك مش شغال</p>
            <p className="text-sm text-gray-500 mb-4">جرب تاني أو ادخل بنفسك — ثانية واحدة برضه.</p>
            <a
              href={`/auth/login?redirect=${encodeURIComponent(next)}`}
              className="inline-block bg-[#1F6F5F] text-white font-bold px-6 py-3 rounded-2xl"
            >
              تسجيل الدخول
            </a>
          </>
        )}
      </div>
    </div>
  )
}
