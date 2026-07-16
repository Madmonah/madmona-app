'use client'

import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, MessageCircle, CheckCircle, RefreshCw } from 'lucide-react'

// =====================================================================
// 🧞 الدخول بالواتساب — «ابعت الكود للمارد» (المسار الأساسي للدخول)
// بديل الـOTP: بدل ما نبعت كود (التمبلتس مبلوكة)، العميل بيبعت كود
// لواتساب المارد، والويبهوك بيأكد رقمه من مصدر الرسالة نفسها.
// الفلو: زرار → يفتح واتساب برسالة جاهزة → يدوس إرسال → يرجع
// والصفحة بتكون سجلته لوحدها (polling).
// =====================================================================

export default function WhatsAppLogin({
  onDone, label = 'ادخل بالواتساب — أسرع طريقة 🧞',
}: {
  onDone: () => void
  label?: string
}) {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'finishing' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  const codeRef = useRef<string>('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  async function begin() {
    setErr('')
    try {
      const res = await fetch('/api/auth/wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      const j = await res.json()
      if (!res.ok || !j.code) { setErr('حصلت مشكلة — جرب تاني'); return }
      codeRef.current = j.code
      setPhase('waiting')
      // افتح واتساب برسالة جاهزة (الكود بس — يدوس إرسال وخلاص)
      window.open(j.wa_url, '_blank')
      // Poll كل ثانيتين لحد ما الويبهوك يأكد
      if (timerRef.current) clearInterval(timerRef.current)
      const startedAt = Date.now()
      timerRef.current = setInterval(async () => {
        if (Date.now() - startedAt > 5 * 60 * 1000) {
          clearInterval(timerRef.current!)
          setPhase('idle'); setErr('الوقت خلص — جرب تاني')
          return
        }
        try {
          const s = await fetch(`/api/auth/wa?code=${codeRef.current}`).then((r) => r.json())
          if (s.verified) {
            clearInterval(timerRef.current!)
            setPhase('finishing')
            const f = await fetch('/api/auth/wa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'finish', code: codeRef.current }),
            })
            const fj = await f.json()
            if (!f.ok || !fj.token_hash) { setPhase('idle'); setErr('حصلت مشكلة — جرب تاني'); return }
            const { error } = await supabaseBrowser.auth.verifyOtp({
              type: 'email', token_hash: fj.token_hash,
            })
            if (error) { setPhase('idle'); setErr('حصلت مشكلة في الدخول — جرب تاني'); return }
            setPhase('done')
            onDone()
          }
        } catch { /* poll بيكمل */ }
      }, 2000)
    } catch {
      setErr('حصلت مشكلة في الاتصال — جرب تاني')
    }
  }

  if (phase === 'done') {
    return (
      <div className="w-full flex items-center justify-center gap-2 bg-[#1F6F5F]/10 text-[#1F6F5F] py-4 rounded-2xl font-bold">
        <CheckCircle className="w-5 h-5" /> تم — بندخّلك…
      </div>
    )
  }

  return (
    <div>
      {phase === 'idle' && (
        <button
          type="button"
          onClick={begin}
          className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all"
        >
          <MessageCircle className="w-5 h-5" />
          {label}
        </button>
      )}

      {(phase === 'waiting' || phase === 'finishing') && (
        <div className="bg-[#F0F7F4] border border-[#2FA084]/30 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-[#1F6F5F] font-bold text-sm mb-1.5">
            <Loader2 className="w-4 h-4 animate-spin" />
            {phase === 'finishing' ? 'ثواني — بنسجّلك…' : 'مستنيين رسالتك…'}
          </div>
          {phase === 'waiting' && (
            <>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">
                فتحنالك واتساب برسالة جاهزة — <b>دوس إرسال بس</b> وارجع هنا.
                <br />أول ما الرسالة توصل هتلاقي نفسك داخل تلقائي.
              </p>
              <button
                type="button"
                onClick={begin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F6F5F] hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                الواتساب مفتحش؟ جرب تاني
              </button>
            </>
          )}
        </div>
      )}

      {err && <p className="text-xs text-red-600 font-bold mt-2 text-center">{err}</p>}
    </div>
  )
}
