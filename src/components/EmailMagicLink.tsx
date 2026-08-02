'use client'

// ============================================================================
// EmailMagicLink — دخول بلينك على الإيميل، من غير باسورد ومن غير واتساب.
//
// ليه: دخول الواتساب نسبة نجاحه 9.5% بس (571 لينك اتبعت / 54 اتفتح في 7 أيام)،
// وجوجل مش عند كل الناس. ده الطريق التالت اللي مالوش علاقة بميتا خالص.
//
// ⚠️ مهم: ده مش هيشتغل في الإنتاج غير لما Supabase يتظبط يبعت عبر Resend.
//    الافتراضي عند Supabase محدود بحوالي رسالتين في الساعة (للتطوير بس).
//    التظبيط: Dashboard → Authentication → Emails → SMTP Settings.
// ============================================================================

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Mail, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

export default function EmailMagicLink({ redirect = '/account' }: { redirect?: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { error: err } = await supabaseBrowser.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // بيرجع على /auth/callback اللي بيكمّل الجلسة ويوجّه
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      // رسالة Supabase الافتراضية عن الحد الأقصى مش مفهومة للمستخدم العادي
      setError(
        /rate|limit|too many/i.test(msg)
          ? 'حاولت كتير في وقت قصير — استنى شوية وجرّب تاني'
          : 'مقدرناش نبعت اللينك. اتأكد إن الإيميل مكتوب صح.'
      )
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="mt-3 flex items-start gap-2.5 p-4 bg-[#1F6F5F]/5 border border-[#1F6F5F]/20 rounded-2xl animate-scale-in">
        <CheckCircle className="w-5 h-5 text-[#1F6F5F] flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-gray-900">بعتنالك لينك الدخول</p>
          <p className="text-gray-600 mt-0.5 leading-relaxed">
            افتح إيميلك <span className="font-semibold" dir="ltr">{email}</span> ودوس على اللينك.
            لو ملقتهوش، بص في الـSpam.
          </p>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-200 rounded-2xl font-bold text-sm text-gray-700 hover:border-[#1F6F5F]/40 hover:bg-[#FAFAF7] transition-all"
      >
        <Mail className="w-4 h-4 text-[#1F6F5F]" />
        ابعتلي لينك على الإيميل
      </button>
    )
  }

  return (
    <form onSubmit={send} className="mt-3 space-y-2.5 animate-scale-in">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        dir="ltr"
        autoComplete="email"
        autoFocus
        required
        className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#1F6F5F]/40 focus:ring-4 focus:ring-[#1F6F5F]/10 transition-all"
      />

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !email}
        className="w-full bg-[#1F6F5F] text-white py-3.5 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            بنبعت…
          </>
        ) : (
          <>
            ابعت اللينك
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  )
}
