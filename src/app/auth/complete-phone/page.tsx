'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ShieldCheck, AlertCircle, Loader2, CheckCircle, MessageCircle, Send, RefreshCw,
} from 'lucide-react'
import VerifyPhoneByCall from '@/components/VerifyPhoneByCall'

// =====================================================================
// 🔗 توثيق الرقم — طريقتين
// -----------------------------------------------------------------
// ١) 📞 **الاتصال** (الأساسية): العميل بيرن علينا رنة من رقمه، وإحنا بنقرا
//    رقم المتصل ونقفل قبل ما نرد. إثبات أقوى (بيثبت إنه ماسك التليفون
//    دلوقتي)، ومالوش علاقة بميتا ولا بجلسات الواتساب اللي بتقع.
//
// ٢) 💬 **الواتساب**: يبعت كود MADxxxxx للمارد. الرقم بيتأكّد من *مصدر
//    الرسالة* (محدش يبعت برقم غيره). فضل موجود لأنه شغّال وناس متعوّدة عليه.
//    ⚠️ بيفشل مع الأرقام المخفية (@lid) — وساعتها الاتصال هو البديل.
//
// ⚠️ الصفحة دي مابقتش إجبارية بعد الدخول (٢ أغسطس ٢٠٢٦) — العميل بيدخل على
//    طول والرقم بيتطلب لما يلزم بس (مطالبة بأصل · أوردر).
//
// نفس الجذر اللي اتصلّح في WhatsAppLogin: نفتح نافذة الواتساب *فورًا* جوّه
// ضغطة المستخدم (قبل أي await) عشان مانتبلوكش بالـpopup-blocker، وكمان زرار
// <a> مباشر + عرض الكود لو الفتح فشل. بعد ما الكود يتأكّد → نربط الرقم
// بالحساب الحالي عبر /api/auth/complete-phone (مش سيشن جديدة — هو داخل أصلًا).
// =====================================================================
function CompletePhoneContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/account'

  const [checkingSession, setCheckingSession] = useState(true)
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'finishing' | 'done'>('idle')
  const [err, setErr] = useState('')
  const [waUrl, setWaUrl] = useState('')
  const [code, setCode] = useState('')
  const codeRef = useRef<string>('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // لازم يكون داخل (بجوجل) عشان يبقى هنا
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session?.user) { router.replace('/auth/login'); return }
      setCheckingSession(false)
    })
  }, [router])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // الربط: الكود اتأكّد → نربط الرقم المُثبت بالحساب الحالي
  async function linkPhone(): Promise<void> {
    setPhase('finishing')
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) { router.replace('/auth/login'); return }
      const res = await fetch('/api/auth/complete-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: codeRef.current, next: redirectTo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setPhase('idle')
        setErr(data.message || 'حصلت مشكلة، جرّب تاني')
        return
      }
      setPhase('done')
      setTimeout(() => { router.replace(redirectTo); router.refresh() }, 1200)
    } catch (e) {
      console.error('[complete-phone] link error:', e)
      setPhase('idle')
      setErr('حصلت مشكلة، جرّب تاني')
    }
  }

  // polling: بنسأل كل ثانيتين لحد ما رسالة الكود توصل وتتأكد
  function startPolling() {
    if (timerRef.current) clearInterval(timerRef.current)
    const startedAt = Date.now()
    timerRef.current = setInterval(async () => {
      if (Date.now() - startedAt > 5 * 60 * 1000) {
        clearInterval(timerRef.current!)
        setPhase('idle'); setErr('الوقت خلص — جرّب تاني')
        return
      }
      try {
        const s = await fetch(`/api/auth/wa?code=${codeRef.current}`).then((r) => r.json())
        if (s.verified) {
          clearInterval(timerRef.current!)
          await linkPhone()
        }
      } catch { /* poll بيكمل */ }
    }, 2000)
  }

  async function begin() {
    setErr('')
    // 🔑 الجذر: نفتح نافذة *فورًا* جوّه الضغطة — قبل أي await — عشان مانتبلوكش.
    let win: Window | null = null
    try { win = window.open('', '_blank') } catch { win = null }
    try {
      const res = await fetch('/api/auth/wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      const j = await res.json()
      if (!res.ok || !j.code) { try { win?.close() } catch { /* */ } setErr('حصلت مشكلة — جرّب تاني'); return }
      codeRef.current = j.code
      setCode(j.code)
      setWaUrl(j.wa_url)
      setPhase('waiting')
      if (win) { try { win.location.href = j.wa_url } catch { /* الزرار البديل موجود */ } }
      startPolling()
    } catch {
      try { win?.close() } catch { /* */ }
      setErr('حصلت مشكلة في الاتصال — جرّب تاني')
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-luxe p-10 text-center animate-scale-in">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black mb-2">تمام! 🎉</h1>
          <p className="text-sm text-gray-600">تم تأكيد رقمك، بنكمّلك دلوقتي…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-mesh flex flex-col relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1F6F5F]/5 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#2FA084]/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur rounded-full mb-4 shadow-soft">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2FA084]" />
              <span className="text-xs font-bold text-gray-700">خطوة أخيرة</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight">
              وثّق <span className="gradient-text-green">رقمك</span>
            </h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              عشان نأمّن حسابك ونقدر نتواصل معاك. مضمونة مابتبعتش أكواد —
              إنت اللي بتبعت أو بترن. 🧞
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-luxe p-7 md:p-9">
            {phase === 'idle' && (
              <>
                {/* 📞 (٢ أغسطس ٢٠٢٦) الاتصال بقى الطريقة الأولى:
                    - إثبات أقوى — بيثبت إنه ماسك التليفون دلوقتي
                    - مالوش علاقة بميتا ولا بجلسات الواتساب اللي بتقع
                    - العميل مايكتبش أي كود
                    الواتساب فضل تحته لأنه شغّال وناس متعوّدة عليه، وميزته
                    إن الرقم بيتأكد من مصدر الرسالة نفسها. */}
                <VerifyPhoneByCall
                  onDone={() => { setPhase('done'); setTimeout(() => router.replace(redirectTo), 900) }}
                />

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px bg-gray-100 flex-1" />
                  <span className="text-[11px] text-gray-400 font-bold">أو</span>
                  <div className="h-px bg-gray-100 flex-1" />
                </div>

                <button
                  type="button"
                  onClick={begin}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  وثّق بالواتساب
                </button>
              </>
            )}

            {(phase === 'waiting' || phase === 'finishing') && (
              <div className="bg-[#F0F7F4] border border-[#2FA084]/30 rounded-2xl p-4 text-center">
                {phase === 'waiting' ? (
                  <>
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
                      جرّب تاني
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-[#1F6F5F] font-bold text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ثواني — بنوثّق رقمك…
                  </div>
                )}
              </div>
            )}

            {err && (
              <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800 mt-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{err}</span>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-4">
            رقمك بيتأكّد من رسالتك نفسها — أأمن من أي كود، ومفيش رسايل بتتبعتلك.
          </p>
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'

export default function CompletePhonePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" />
      </div>
    }>
      <CompletePhoneContent />
    </Suspense>
  )
}
