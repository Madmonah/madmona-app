'use client'

import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, MessageCircle, CheckCircle, RefreshCw, Send, Briefcase } from 'lucide-react'
import { safeStorage } from '@/lib/safe-storage'

// 📱 (٢٣ أغسطس ٢٠٢٦) لينك بيفتح **تطبيق واتساب بعينه** على أندرويد.
//    العادي = com.whatsapp · البيزنس = com.whatsapp.w4b — التطبيقين
//    بيتسجّلوا على نفس الـscheme (whatsapp://) فلينك wa.me العادي بيفتح
//    أي واحد فيهم. صيغة intent:// بـpackage صريح هي الوحيدة اللي بتحدد.
//    S.browser_fallback_url: لو التطبيق ده مش متسطّب، كروم بيرجع لـwa.me
//    بدل ما يقف على صفحة خطأ.
function appIntent(number: string, code: string, pkg: string, fallback: string) {
  return `intent://send?phone=${encodeURIComponent(number)}&text=${encodeURIComponent(code)}`
    + `#Intent;scheme=whatsapp;package=${pkg}`
    + `;S.browser_fallback_url=${encodeURIComponent(fallback)};end`
}

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
  /** الوجهة اللي المستخدم رايحها — بتترجّع في رد ترحيب الدخول على واتساب */
  redirect?: string
}) {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'finishing' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  const [waUrl, setWaUrl] = useState('')
  const [waNumber, setWaNumber] = useState('')
  const [code, setCode] = useState('')
  // 📱 (٢٣ أغسطس ٢٠٢٦ — محمد: «خلي الواتساب في تسجيل الدخول يخيرني بين
  //    الواتساب البيزنس والعادي») على أندرويد التطبيقين متسطّبين مع بعض
  //    وبياخدوا نفس الـscheme، فلينك wa.me بيفتح واحد فيهم على كيفه — ولو
  //    فتح الغلط، الكود بيتبعت من رقم تاني والدخول بيوديك لحساب تاني.
  //    نستخدم intent:// بـpackage صريح — ده الشكل الوحيد اللي بيحدد تطبيق
  //    بعينه على أندرويد. على iOS مفيش scheme منفصل لواتساب بيزنس، فبنعرض
  //    الزرار العادي هناك بدل ما نحط زرارين بيعملوا نفس الحاجة.
  const [isAndroid, setIsAndroid] = useState(false)
  useEffect(() => { setIsAndroid(/Android/i.test(navigator.userAgent)) }, [])
  const codeRef = useRef<string>('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 🔒 (٢٣ أغسطس ٢٠٢٦) قفل: تيك واحد بس شغال في أي لحظة — تحت.
  const busyRef = useRef(false)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // polling: بنسأل كل ثانيتين لحد ما الرسالة توصل وتتأكد، وبعدين نكمّل الدخول
  function startPolling() {
    if (timerRef.current) clearInterval(timerRef.current)
    busyRef.current = false
    const startedAt = Date.now()
    timerRef.current = setInterval(async () => {
      // 🐞 (٢٣ أغسطس ٢٠٢٦ — الجذر بتاع «نورا وعبير مش عارفين يدخلوا»)
      //
      //    التايمر بيضرب كل ثانيتين. لو نداء الـpoll خد أكتر من ثانيتين (نت
      //    موبايل — وده الحال في المكتب)، التيك التاني بيبدأ **قبل** ما الأول
      //    يوصل لـclearInterval، فالاتنين بيشوفوا verified وبينده finish مرتين.
      //    والسيرفر ساعتها بيعمل generateLink تاني، واللي بيبطّل التوكن الأول
      //    (اتأكدنا منها بالتجربة على البرودكشن: 403 Email link is invalid).
      //    النتيجة: الدخول بينجح على السيرفر وبيتضيّع في المتصفح.
      //
      //    القفل ده بيمنع أي تداخل. وصلّحنا السيرفر كمان (إعادة صك التوكن)
      //    عشان الاتنين يبقوا محصّنين مش واحد.
      if (busyRef.current) return
      busyRef.current = true
      try {
      if (Date.now() - startedAt > 5 * 60 * 1000) {
        clearInterval(timerRef.current!)
        setPhase('idle'); setErr('الوقت خلص — جرب تاني')
        return
      }
      try {
        const r = await fetch(`/api/auth/wa?code=${codeRef.current}`)
        if (r.status === 429) {
          // 🔊 مانبلعش الـ429 — المستخدم كان بيشوف «حصلت مشكلة» من غير ما يعرف
          //    إن المطلوب منه يستنى بس.
          clearInterval(timerRef.current!)
          setPhase('idle'); setErr('الضغط عالي دلوقتي — استنى دقيقة وجرب تاني')
          return
        }
        const s = await r.json()
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
            setPhase('idle')
            // رقم واتساب مخفي (LID) مش قادرين نتأكد منه → نوجّه لجوجل بدل فشل صامت
            if (fj?.error === 'lid_no_phone') {
              setErr('رقم واتسابك مخفي فمقدرناش نتأكد منه — سجّل دخول بـ Google من تحت 👇')
            } else if (f.status === 429 || fj?.error === 'rate_limited') {
              setErr('الضغط عالي دلوقتي — استنى دقيقة وجرب تاني')
            } else if (fj?.error === 'expired') {
              setErr('الكود خلصت مدته — دوس «جرب تاني»')
            } else {
              // 🔊 بنطبع السبب الحقيقي في الكونسول. «حصلت مشكلة» لوحدها
              //    خلّتنا نلف يومين ورا سبب دخول نورا من غير أي دليل.
              console.error('[wa-login] finish failed:', f.status, fj)
              setErr('حصلت مشكلة — جرب تاني')
            }
            return
          }
          const { error } = await supabaseBrowser.auth.verifyOtp({
            type: 'email', token_hash: fj.token_hash,
          })
          if (error) {
            console.error('[wa-login] verifyOtp failed:', error.status, error.message)
            setPhase('idle'); setErr('حصلت مشكلة في الدخول — جرب تاني'); return
          }
          // 🔗 حساب واحد (8 Aug 2026): بعد ما جلسة Supabase اتثبتت، جدّد توكن
          //    أقسام مضمونة (المارد/الإدارة) في الخلفية عشان كله يعرفك فورًا
          import('@/lib/madmonaSession').then((m) => m.syncModuleSession()).catch(() => {})
          // 🔗 توحيد 100%: نفس الدخلة بتفتح كمان جلسات /me و/my-projects والحجوزات
          if (fj.madmona_token) { try { safeStorage.set('madmona_token', fj.madmona_token) } catch { /* */ } }
          setPhase('done')
          onDone({ phone: fj.phone || null, full_name: fj.full_name || null, madmona_token: fj.madmona_token || null })
        }
      } catch { /* poll بيكمل */ }
      } finally { busyRef.current = false }
    }, 2000)
  }

  async function begin() {
    setErr('')
    // ⚠️⚠️ ماترجّعش `window.open('', '_blank')` تاني هنا مهما حصل.
    //
    // إصلاح ٢٣ يوليو فتح تاب فاضي جوّه الضغطة عشان يهرب من الـpopup-blocker،
    // وبعدين يوجّهه للواتساب. النتيجة: **التاب الفاضي بيفضل مفتوح**، ولما
    // العميل يرجع من الواتساب بيلاقي نفسه عليه — مش على صفحة الدخول.
    // دي «الصفحة البيضا» اللي محمد بيشتكي منها (شافها بنفسه، والسبب باين في
    // الكود). وزيادة: التاب الأصلي بيروح الخلفية والموبايل بيخنق المؤقتات
    // فيها، فالـpolling نفسه بيقف.
    //
    // الحل: مفيش تاب جديد خالص. العميل بيدوس <a> اللي تحت — ضغطة حقيقية
    // مبتتبلوكش أبدًا — وصفحة الدخول بتفضل مكانها شغالة والـpolling عايش.
    //
    // ملاحظة: `wa_login_tokens` **مش** بتخدم المسار ده — دي لينكات المارد
    // العادية (شوف SKIP في api/whatsapp/baileys اللي بيستثني /auth/).
    try {
      const res = await fetch('/api/auth/wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      const j = await res.json()
      if (!res.ok || !j.code) {
        if (res.status === 429 || j?.error === 'rate_limited') {
          setErr('الضغط عالي دلوقتي — استنى دقيقة وجرب تاني')
        } else {
          console.error('[wa-login] start failed:', res.status, j)
          setErr('حصلت مشكلة — جرب تاني')
        }
        return
      }
      codeRef.current = j.code
      setCode(j.code)
      setWaUrl(j.wa_url)
      setWaNumber(String(j.wa_number || ''))
      setPhase('waiting')
      startPolling()
    } catch {
      setErr('حصلت مشكلة في الاتصال — جرب تاني')
    }
  }

  if (phase === 'done') {
    return (
      <div className="w-full flex items-center justify-center gap-2 bg-[#34D399]/10 text-[#059669] py-4 rounded-2xl font-bold">
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
              {isAndroid && waNumber ? (
                <>
                  <p className="text-xs font-bold text-gray-700 mb-2">تبعت الكود من أنهي واتساب؟</p>
                  <div className="flex gap-2 mb-3">
                    <a
                      href={appIntent(waNumber, code, 'com.whatsapp', waUrl)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] text-white py-3.5 rounded-2xl font-bold text-sm shadow-elevated hover:-translate-y-0.5 transition-all"
                    >
                      <Send className="w-4 h-4" />
                      العادي
                    </a>
                    <a
                      href={appIntent(waNumber, code, 'com.whatsapp.w4b', waUrl)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#0B7A5C] text-white py-3.5 rounded-2xl font-bold text-sm shadow-elevated hover:-translate-y-0.5 transition-all"
                    >
                      <Briefcase className="w-4 h-4" />
                      بيزنس
                    </a>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed mb-2">
                    هيفتح التطبيق اللي اخترته برسالة جاهزة — <b>دوس إرسال بس</b> وارجع هنا.
                    <br />
                    <b className="text-[#B45309]">مهم:</b> هتدخل على الحساب بتاع <b>الرقم اللي بعت الكود</b>،
                    فاختار التطبيق اللي فيه رقمك الصح.
                    <br />لو مفتحش، ابعت الكود ده يدوي لـ«المارد» على واتساب:
                  </p>
                </>
              ) : (
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
                </>
              )}
              <div className="inline-block bg-white border border-[#2FA084]/40 rounded-xl px-5 py-2 font-black text-xl tracking-[0.3em] text-[#059669] mb-3 select-all">
                {code}
              </div>
              <div className="flex items-center justify-center gap-2 text-[#059669] font-bold text-sm mb-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                مستنيين رسالتك…
              </div>
              <button
                type="button"
                onClick={begin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:underline mt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                جرب تاني
              </button>
            </>
          )}
          {phase === 'finishing' && (
            <div className="flex items-center justify-center gap-2 text-[#059669] font-bold text-sm">
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
