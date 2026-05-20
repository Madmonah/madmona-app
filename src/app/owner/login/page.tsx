'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Mail, CheckCircle2, LogIn, ShieldCheck } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function OwnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  // If already logged in, resolve access and redirect
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // @ts-expect-error
        const { data } = await supabase.rpc('owner_resolve_access')
        const access = data?.access || []
        if (access.length === 1) {
          router.push(`/owner/${access[0].supplier_id}`)
          return
        } else if (access.length > 1) {
          router.push('/owner/select')
          return
        }
      }
      setChecking(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  async function sendMagicLink() {
    if (!email) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/owner/login` },
    })
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
    setSending(false)
  }

  if (checking) {
    return <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
            <span className="text-3xl font-black text-[#1F6F5F]">م</span>
          </div>
          <h1 className="text-2xl font-black text-white">بوابة الشركاء</h1>
          <p className="text-sm text-white/80 mt-1">مضمونة · دخول أصحاب الأعمال</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {sent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#1F6F5F]/10 grid place-items-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#1F6F5F]" />
              </div>
              <h2 className="text-lg font-black text-[#1A2E26]">بعتنا لك رابط الدخول! 📧</h2>
              <p className="text-sm text-[#6B7280] mt-2">
                افتح إيميلك <span className="font-bold text-[#1A2E26]">{email}</span> واضغط على رابط الدخول.
              </p>
              <p className="text-xs text-[#6B7280] mt-3">الرابط صالح لمدة ساعة. لو ملقتش الإيميل، شوف الـ Spam.</p>
              <button onClick={() => { setSent(false); setEmail('') }} className="mt-4 text-xs font-bold text-[#1F6F5F]">
                استخدم إيميل تاني
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black text-[#1A2E26] mb-1">تسجيل الدخول</h2>
              <p className="text-sm text-[#6B7280] mb-5">هندخّلك برابط آمن على إيميلك — من غير باسورد.</p>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">الإيميل</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
                  placeholder="owner@elite.com"
                  className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm"
                  dir="ltr"
                />
              </div>

              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

              <button
                onClick={sendMagicLink}
                disabled={sending || !email}
                className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><LogIn className="w-4 h-4" /> ابعتلي رابط الدخول</>}
              </button>

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#6B7280] leading-relaxed">
                  الدخول آمن بـ رابط لمرة واحدة (Magic Link). محتاج حسابك يكون مفعّل من إدارة مضمونة الأول.
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com · بوابة الشركاء</p>
      </div>
    </div>
  )
}
