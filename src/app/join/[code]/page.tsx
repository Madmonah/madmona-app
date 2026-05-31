'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Phone, User, MessageCircle, CheckCircle2, ArrowLeft, Building2, BadgeCheck, Briefcase } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
function cleanPhone(raw: string): string { return raw.replace(/[^0-9]/g, '') }

type Step = 'form' | 'verify' | 'done'

export default function JoinPage({ params }: { params: { code: string } }) {
  const { code } = params
  const [info, setInfo] = useState<any>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [step, setStep] = useState<Step>('form')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [branchId, setBranchId] = useState('')
  const [job, setJob] = useState('')
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [doneMsg, setDoneMsg] = useState('')

  useEffect(() => {
    (async () => {
      // @ts-expect-error rpc typing
      const { data } = await supabase.rpc('madmona_join_info', { p_slug: code })
      if (data?.ok) { setInfo(data); if (data.branches?.length === 1) setBranchId(data.branches[0].id) }
      setLoadingInfo(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  async function sendOtp() {
    if (!name || !phone || !branchId) { setError('املا كل الخانات'); return }
    setError(''); setSending(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/madmona-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ phone: cleanPhone(phone), full_name: name }),
      })
      const data = await res.json()
      if (!data?.success) setError(data?.error || 'فشل إرسال الكود')
      else setStep('verify')
    } catch { setError('حصل خطأ في الاتصال. حاول تاني.') }
    setSending(false)
  }

  async function verifyAndJoin() {
    setError(''); setSending(true)
    // 1) verify OTP -> get token
    // @ts-expect-error rpc typing
    const { data: v, error: ve } = await supabase.rpc('madmona_verify_otp', {
      p_phone: cleanPhone(phone), p_code: otp, p_full_name: name,
    })
    if (ve || !v?.success) { setError(v?.error || 'الكود غلط'); setSending(false); return }
    localStorage.setItem('madmona_token', v.token)

    // 2) submit employee join request
    // @ts-expect-error rpc typing
    const { data: j, error: je } = await supabase.rpc('madmona_submit_employee_join', {
      p_token: v.token, p_supplier_id: info.supplier_id, p_branch_id: branchId, p_job_title: job || null,
    })
    if (je || !j?.ok) { setError(j?.error || je?.message || 'حصل خطأ'); setSending(false); return }
    setDoneMsg(j.message || 'تم استلام طلبك!')
    setStep('done')
    setSending(false)
  }

  if (loadingInfo) return <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>

  if (!info) return (
    <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 max-w-md text-center">
        <h2 className="text-xl font-black text-[#1A2E26]">اللينك مش صحيح</h2>
        <p className="text-sm text-[#6B7280] mt-2">تأكد من اللينك أو تواصل مع إدارتك.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1F6F5F] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
            <span className="text-3xl font-black text-[#1F6F5F]">م</span>
          </div>
          <h1 className="text-2xl font-black text-white">تسجيل موظف</h1>
          <p className="text-sm text-white/80 mt-1 flex items-center justify-center gap-1.5"><Building2 className="w-4 h-4" /> {info.business_name}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {step === 'form' && (
            <>
              <p className="text-sm text-[#6B7280] mb-5 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-[#1F6F5F]" /> سجّل بياناتك وهنبعتلك كود تأكيد على واتساب
              </p>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">الاسم بالكامل</label>
              <div className="relative mb-3">
                <User className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="زي ما هو في الشركة" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm" />
              </div>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">رقم الموبايل (واتساب)</label>
              <div className="relative mb-3">
                <Phone className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" />
              </div>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">الفرع</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-[#FAFAF7] text-sm mb-3">
                <option value="">اختار فرعك</option>
                {info.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">وظيفتك <span className="font-normal lowercase">(اختياري)</span></label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input value={job} onChange={e => setJob(e.target.value)} placeholder="مثلاً: مصفّف شعر، مكياج، استقبال" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm" />
              </div>

              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              <button onClick={sendOtp} disabled={sending} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><MessageCircle className="w-4 h-4" /> ابعتلي كود التأكيد</>}
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <button onClick={() => { setStep('form'); setOtp(''); setError('') }} className="text-xs font-bold text-[#6B7280] flex items-center gap-1 mb-3"><ArrowLeft className="w-3.5 h-3.5" /> رجوع</button>
              <h2 className="text-lg font-black text-[#1A2E26] mb-1">اكتب الكود</h2>
              <p className="text-sm text-[#6B7280] mb-5">بعتنا كود على واتساب الرقم <span className="font-bold text-[#1A2E26]" dir="ltr">{phone}</span></p>
              <input type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && verifyAndJoin()} placeholder="● ● ● ● ● ●" maxLength={6} className="w-full px-3 py-3 rounded-xl bg-[#FAFAF7] text-center text-2xl font-black tracking-[0.4em]" dir="ltr" />
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
              <button onClick={verifyAndJoin} disabled={sending || otp.length < 6} className="w-full mt-4 py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التسجيل...</> : <><CheckCircle2 className="w-4 h-4" /> سجّلني</>}
              </button>
              <button onClick={sendOtp} disabled={sending} className="w-full mt-2 text-xs font-bold text-[#1F6F5F]">ابعت الكود تاني</button>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#1F6F5F]/10 grid place-items-center mx-auto mb-4"><BadgeCheck className="w-8 h-8 text-[#1F6F5F]" /></div>
              <h2 className="text-xl font-black text-[#1A2E26] mb-2">تمام! 🎉</h2>
              <p className="text-sm text-[#6B7280] leading-relaxed">{doneMsg}</p>
              <a href="/home" className="inline-block mt-5 px-6 py-2.5 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold">روح لحسابي على مضمونة</a>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com · معاملاتك مضمونة</p>
      </div>
    </div>
  )
}
