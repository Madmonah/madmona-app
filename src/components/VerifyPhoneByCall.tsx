'use client'

// ============================================================================
// VerifyPhoneByCall — العميل بيثبت رقمه بإنه يرن علينا رنة واحدة.
//
// ليه كده: العميل مايكتبش أي كود. بيدوس زرار، شاشة الاتصال بتفتح والرقم
// جاهز، يدوس الأخضر، بترن رنة وإحنا نقفل قبل ما نرد. الصفحة بتتحدث لوحدها.
//
// ⚠️ على الكمبيوتر الـ`tel:` مبيفتحش حاجة — فبنعرض الرقم مكتوب عشان يرن
//    بإيده من موبايله. 73% من ترافيك مضمونة موبايل فده استثناء مش قاعدة.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Phone, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

type Phase = 'idle' | 'calling' | 'done' | 'error'

export default function VerifyPhoneByCall({
  onDone,
  initialPhone = '',
}: {
  onDone?: (phone: string) => void
  initialPhone?: string
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [phone, setPhone] = useState(initialPhone)
  const [callNumber, setCallNumber] = useState('')
  const [excluded, setExcluded] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [slow, setSlow] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const authHeader = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession()
    return data.session?.access_token ? `Bearer ${data.session.access_token}` : ''
  }, [])

  const poll = useCallback((id: string) => {
    if (timer.current) clearInterval(timer.current)
    const startedAt = Date.now()
    setSlow(false)
    timer.current = setInterval(async () => {
      // بعد 45 ثانية نعرض «الرقم مردّش؟» عشان يقدر يجرّب رقم تاني
      if (Date.now() - startedAt > 45_000) setSlow(true)
      if (Date.now() - startedAt > 10 * 60 * 1000) {
        clearInterval(timer.current!)
        setPhase('error'); setErr('الوقت خلص — جرّب تاني')
        return
      }
      try {
        const h = await authHeader()
        const r = await fetch(`/api/verify-call?id=${id}`, { headers: { authorization: h } })
        const j = await r.json()
        if (j.status === 'verified') {
          clearInterval(timer.current!)
          setPhase('done')
          onDone?.(j.phone || phone)
        } else if (j.status === 'expired') {
          clearInterval(timer.current!)
          setPhase('error'); setErr('الوقت خلص — جرّب تاني')
        }
      } catch { /* بنكمّل */ }
    }, 2500)
  }, [authHeader, onDone, phone])

  async function start(excludeNumberId?: string | null) {
    setErr('')
    try {
      const h = await authHeader()
      if (!h) { setErr('لازم تكون داخل بحسابك الأول'); return }
      const r = await fetch('/api/verify-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: h },
        body: JSON.stringify({ phone, exclude: excludeNumberId || null }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j.error || 'حصلت مشكلة — جرّب تاني'); return }
      setCallNumber(j.call_number)
      setExcluded(j.call_number_id)
      setPhase('calling')
      poll(j.id)
    } catch {
      setErr('حصلت مشكلة في الاتصال — جرّب تاني')
    }
  }

  if (phase === 'done') {
    return (
      <div className="flex items-center justify-center gap-2 bg-[#FA8125]/10 text-[#FA8125] py-4 rounded-2xl font-bold">
        <CheckCircle className="w-5 h-5" /> تم إثبات رقمك ✓
      </div>
    )
  }

  if (phase === 'calling') {
    return (
      <div className="bg-[#F0F7F4] border border-[#2FA084]/30 rounded-2xl p-4 text-center">
        <a
          href={`tel:${callNumber}`}
          className="w-full flex items-center justify-center gap-2 bg-[#FA8125] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:-translate-y-0.5 transition-all mb-3"
        >
          <Phone className="w-5 h-5" />
          اضغط للاتصال
        </a>

        <p className="text-xs text-gray-600 leading-relaxed mb-2">
          هتفتحلك شاشة الاتصال والرقم جاهز — <b>دوس الزرار الأخضر بس</b>.
          <br />هترن رنة واحدة وإحنا هنقفل، مش هتدفع حاجة.
          <br />لو الشاشة مفتحتش، اتصل بالرقم ده من موبايلك:
        </p>

        <div dir="ltr" className="inline-block bg-white border border-[#2FA084]/40 rounded-xl px-5 py-2 font-black text-lg tracking-wider text-[#FA8125] mb-3 select-all">
          {callNumber}
        </div>

        <div className="flex items-center justify-center gap-2 text-[#FA8125] font-bold text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          مستنيين رنتك…
        </div>

        <p className="text-[11px] text-gray-500 mt-2">
          مهم: لازم ترن من <b dir="ltr">{phone}</b> نفسه.
        </p>

        {/* لو الرقم ده واقع، العميل ياخد غيره — من غير ما نراقب حاجة */}
        {slow && (
          <button
            type="button"
            onClick={() => start(excluded)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FA8125] hover:underline mt-3"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            الرقم مردّش؟ جرّب رقم تاني
          </button>
        )}

        {err && <p className="text-xs text-red-600 font-bold mt-2">{err}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
          <Phone className="w-3.5 h-3.5 text-[#FA8125]" />
          رقم موبايلك
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          dir="ltr"
          style={{ textAlign: 'right' }}
          autoComplete="tel"
          className="w-full px-4 py-3.5 bg-[#FAFAF7] border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:bg-white focus:border-[#FA8125]/40 focus:ring-4 focus:ring-[#FA8125]/10 transition-all"
        />
        <p className="text-[11px] text-gray-500 mt-1.5">
          هنطلب منك ترن علينا رنة من الرقم ده — من غير أكواد ولا رسائل.
        </p>
      </div>

      {err && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => start(null)}
        disabled={phone.replace(/\D/g, '').length < 10}
        className="w-full bg-[#FA8125] text-white py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all"
      >
        كمّل
      </button>
    </div>
  )
}
