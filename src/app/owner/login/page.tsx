'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, ShieldCheck } from 'lucide-react'
import { safeStorage } from '@/lib/safe-storage'
import WhatsAppLogin, { WaLoginResult } from '@/components/WhatsAppLogin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function OwnerLoginPage() {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  // لو داخل أصلاً بتوكن محفوظ — وجّهه على طول
  useEffect(() => {
    (async () => {
      const token = safeStorage.get('madmona_owner_token')
      if (token) {
        // @ts-expect-error rpc typing
        const { data } = await supabase.rpc('owner_resolve_by_token', { p_token: token })
        const access = data?.access || []
        if (access.length === 1) { router.push(`/owner/${access[0].supplier_id}`); return }
        if (access.length > 1) { router.push('/owner/select'); return }
      }
      setChecking(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  // التوثيق بالوارد (Task 25): الأونر يبعت كود للمارد (WhatsAppLogin) → جلسة Supabase
  // برقم موثّق → owner_mint_session_from_auth() بتطلّع توكن الأونر من الجلسة نفسها (آمن).
  // بنستخدم supabaseBrowser (نفس كلاينت WhatsAppLogin) عشان الجلسة تكون متوفّرة للـRPC.
  async function handleVerified(_r: WaLoginResult) {
    setError(''); setSending(true)
    try {
      // @ts-expect-error rpc typing
      const { data, error: e } = await supabaseBrowser.rpc('owner_mint_session_from_auth')
      const ok = !e && data?.success
      if (!ok) {
        const code = (data as { error?: string } | null)?.error
        setError(
          code === 'no_access' ? 'رقمك مش مربوط بأي شركة. تواصل مع إدارة مضمونة.'
          : code === 'no_phone' ? 'مقدرناش نجيب رقمك الموثّق — جرب تاني.'
          : 'مقدرناش نكمّل الدخول — جرب تاني.'
        )
        setSending(false); return
      }
      const token = (data as { token: string }).token
      safeStorage.set('madmona_owner_token', token)
      // @ts-expect-error rpc typing
      const { data: acc } = await supabase.rpc('owner_resolve_by_token', { p_token: token })
      const access = acc?.access || []
      if (access.length === 1) router.push(`/owner/${access[0].supplier_id}`)
      else if (access.length > 1) router.push('/owner/select')
      else { setError('رقمك مش مربوط بأي شركة. تواصل مع إدارة مضمونة.'); setSending(false) }
    } catch {
      setError('حصل خطأ في الاتصال — جرب تاني.'); setSending(false)
    }
  }

  if (checking) return <div className="min-h-screen bg-[#2B4521] flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#2B4521] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
            <span className="text-3xl font-black text-[#2B4521]">م</span>
          </div>
          <h1 className="text-2xl font-black text-white">بوابة الشركاء</h1>
          <p className="text-sm text-white/80 mt-1">مضمونة · دخول أصحاب الأعمال</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <h2 className="text-lg font-black text-[#1A2E26] mb-1">تسجيل الدخول</h2>
          <p className="text-sm text-[#6B7280] mb-5">
            ادخل بالواتساب — تبعت كود للمارد ونأكّد رقمك على طول، من غير باسورد.
          </p>

          {sending ? (
            <div className="flex items-center justify-center gap-2 py-4 text-[#2B4521] font-bold">
              <Loader2 className="w-5 h-5 animate-spin" /> ثواني — بندخّلك…
            </div>
          ) : (
            <WhatsAppLogin label="ادخل بالواتساب 🧞" onDone={handleVerified} />
          )}

          {error && <p className="text-xs text-red-600 mt-3 text-center">{error}</p>}

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2B4521] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#6B7280] leading-relaxed">دخول آمن بالواتساب من غير باسورد. محتاج رقمك يكون مفعّل من إدارة مضمونة.</p>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com · بوابة الشركاء</p>
      </div>
    </div>
  )
}
