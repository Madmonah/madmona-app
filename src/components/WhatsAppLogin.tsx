'use client'

import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, MessageCircle, CheckCircle, RefreshCw, Send } from 'lucide-react'
import { safeStorage } from '@/lib/safe-storage'

// =====================================================================
// 🧞 الدخول بالواتساب — «ابعت الكود للمارد» (المسار الأساسي للدخول)
// بديل الـOTP: بدل ما نبعت كود (التمبلتس مبلوكة)، العميل بيبعت كود
// لواتساب المارد، والويبهوك بيأكد رقمه من مصدر الرسالة نفسها.
//
// ⚠️ الجذر اللي اتصلّح (٢٣ يوليو): كان `window.open` بيتنده *بعد await fetch*،
//    فالمتصفح بيعتبره popup مش جاي من ضغطة مستخدم ويبلوكه — الواتساب مايفتحش
//    خالص (٨٥٪ من محاولات الدخول كانت بتفشل هنا). الحل: نفتح النافذة *فورًا*
//    جوّه الضغطة قبل أي await، وكمان نعرض زرار مباشر <a> (ضغطة جديدة مبتتبلوكش)
//    + نعرض الكود عشان لو الفتح فشل يبعته المستخدم بإيده.
// =====================================================================

export type WaLoginResult = { phone: string | null; full_name: string | null; madmona_token: string | null }

export default function WhatsAppLogin({
  onDone, label = 'ادخل بالواتساب — أسرع طريقة 🧞', getFullName, redirect,
}: {
  onDone: (r: WaLoginResult) => void
  label?: string
  /** اسم اختياري (من فورم خارجي) يتسجل به الحساب الجديد */
  getFullName?: () => string
  /** الوجهة اللي المستخدم رايحها — المارد بيبعتها في رسالة تأكيد الدخول على واتساب */
  redirect?: string
}) {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'finishing' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [waUrl, setWaUrl] = useState('')
  const [code, setCode] = useState('')
  const codeRef = useRef<string>('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // polling: بنسأل كل ثانيتين لحد ما الرسالة توصل وتتأكد، وبعدين نكمّل الدخول
  function startPolling() {
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
            body: JSON.stringify({ action: 'finish', code: codeRef.current, full_name: getFullName?.() || null, next: redirect || '' }),
          })
          const fj = await f.json()
          if (!f.ok || !fj.token_hash) {
            // رقم واتساب مخفي (LID) مش قادرين نتأكد منه → نوجّه لجوجل بدل فشل صامت
            if (fj?.error === 'lid_no_phone') {
              setPhase('idle')
              setErr('رقم واتسابك مخفي فمقدرناش نتأكد منه — سجّل دخول بـ Google من تحت 👇')
            } else {
              setPhase('idle'); setErr('حصلت مشكلة — جرب تاني')
            }
            return
          }
          const { error } = await supabaseBrowser.auth.verifyOtp({
            type: 'email', token_hash: fj.token_hash,
          })
          if (error) { setPhase('idle'); setErr('حصلت مشكلة في الدخول — جرب تاني'); return }
          // 🔗 توحيد 100%: نفس الدخلة بتفتح كمان جلسات /me و/my-projects والحجوزات
          if (fj.madmona_token) { try { safeStorage.set('madmona_token', fj.madmona_token) } catch { /* */ } }
          setPhase('done')
          onDone({ phone: fj.phone || null, full_name: fj.full_name || null, madmona_token: fj.madmona_token || null })
        }
      } catch { /* poll بيكمل */ }
    }, 2000)
  }

  async function begin() {
    setErr('')
    // 🔑 الجذر: نفتح نافذة *فورًا* جوّه ضغطة المستخدم — قبل أي await — عشان
    //    مانتبلوكش بالـpopup-blocker. لو المتصفح منعها (win=null)، الزرار المباشر
    //    تحت بيفتح بضغطة جديدة (مبتتبلوكش أبدًا).
    let win: Window | null = null
    try { win = window.open('', '_blank') } catch { win = null }
    try {
      const res = await fetch('/api/auth/wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      const j = await res.json()
      if (!res.ok || !j.code) { try { win?.close() } catch { /* */ } setErr('حصلت مشكلة — جرب تاني'); return }
      codeRef.current = j.code
      setCode(j.code)
      setWaUrl(j.wa_url)
      setPhase('waiting')
      // وجّه النافذة المفتوحة للواتساب. لو اتبلوكت، الزرار المباشر تحت بديلها.
      if (win) { try { win.location.href = j.wa_url } catch { /* الزرار البديل موجود */ } }
      startPolling()
    } catch {
      try { win?.close() } catch { /* */ }
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
          {phase === 'waiting' && (
            <>
              {/* 🟢 الزرار المباشر — بيفتح واتساب بضغطة جديدة (مبتتبلوكش زي window.open) */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3.5 rounded-2xl font-bold text-base shadow-elevated hover:-translate-y-0.5 transition-all mb-3"
              >
                <Send className="w-5 h-5" />
                افتح واتساب وابعت الكود
              </a>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                هيفتحلك واتساب برسالة جاهزة فيها الكود — <b>دوس إرسال بس</b> وارجع هنا.
                <br />لو مفتحش، ابعت الكود ده يدوي لـ«المارد» على واتساب:
              </p>
              <div className="inline-block bg-white border border-[#2FA084]/40 rounded-xl px-5 py-2 font-black text-xl tracking-[0.3em] text-[#1F6F5F] mb-3 select-all">
                {code}
              </div>
              <div className="flex items-center justify-center gap-2 text-[#1F6F5F] font-bold text-sm mb-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                مستنيين رسالتك…
              </div>
              <button
                type="button"
                onClick={begin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F6F5F] hover:underline mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                جرب تاني
              </button>
            </>
          )}
          {phase === 'finishing' && (
            <div className="flex items-center justify-center gap-2 text-[#1F6F5F] font-bold text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              ثواني — بنسجّلك…
            </div>
          )}
        </div>
      )}

      {err && <p className="text-xs text-red-600 font-bold mt-2 text-center">{err}</p>}
    </div>
  )
}
