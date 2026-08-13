'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, User, MessageCircle, Building2, BadgeCheck, Briefcase } from 'lucide-react'
import WhatsAppLogin, { WaLoginResult } from '@/components/WhatsAppLogin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Step = 'form' | 'joining' | 'done'

export default function JoinPage({ params }: { params: { code: string } }) {
  const { code } = params
  const [info, setInfo] = useState<any>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [step, setStep] = useState<Step>('form')

  const [name, setName] = useState('')
  const [branchId, setBranchId] = useState('')
  const [job, setJob] = useState('')
  const [error, setError] = useState('')
  const [doneMsg, setDoneMsg] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('madmona_join_info', { p_slug: code })
      if (data?.ok) { setInfo(data); if (data.branches?.length === 1) setBranchId(data.branches[0].id) }
      setLoadingInfo(false)
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  // التوثيق بالوارد (Task 25): الموظف يبعت كود للمارد على واتساب (WhatsAppLogin)،
  // ونستلم madmona_token من الرقم الموثّق نفسه، وبيه نقدّم طلب الانضمام.
  // مفيش OTP بنبعته — بديل مسار /api/auth/otp البارد اللي بيفشل.
  async function handleVerified(r: WaLoginResult) {
    setError('')
    const token = r.madmona_token
    if (!token) { setError('حصلت مشكلة في تأكيد رقمك — جرب تاني'); return }
    setStep('joining')
    const { data: j, error: je } = await supabase.rpc('madmona_submit_employee_join', {
      p_token: token, p_supplier_id: info.supplier_id, p_branch_id: branchId, p_job_title: job || null,
    })
    if (je || !j?.ok) { setError(j?.error || je?.message || 'حصل خطأ'); setStep('form'); return }
    setDoneMsg(j.message || 'تم استلام طلبك!')
    setStep('done')
  }

  const canVerify = name.trim().length > 1 && !!branchId

  if (loadingInfo) return <div className="min-h-screen bg-[#FA8125] flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>

  if (!info) return (
    <div className="min-h-screen bg-[#FA8125] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 max-w-md text-center">
        <h2 className="text-xl font-black text-[#1A2E26]">اللينك مش صحيح</h2>
        <p className="text-sm text-[#6B7280] mt-2">تأكد من اللينك أو تواصل مع إدارتك.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FA8125] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white grid place-items-center mx-auto mb-4">
            <span className="text-3xl font-black text-[#FA8125]">م</span>
          </div>
          <h1 className="text-2xl font-black text-white">تسجيل موظف</h1>
          <p className="text-sm text-white/80 mt-1 flex items-center justify-center gap-1.5"><Building2 className="w-4 h-4" /> {info.business_name}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {step === 'form' && (
            <>
              <p className="text-sm text-[#6B7280] mb-5 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-[#FA8125]" /> سجّل بياناتك، وبعدين أكّد رقمك على واتساب بضغطة
              </p>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">الاسم بالكامل</label>
              <div className="relative mb-3">
                <User className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="زي ما هو في الشركة" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm" />
              </div>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">الفرع</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full px-3 py-3 rounded-xl bg-[#FAFAF7] text-sm mb-3">
                <option value="">اختار فرعك</option>
                {info.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">وظيفتك <span className="font-normal lowercase">(اختياري)</span></label>
              <div className="relative mb-4">
                <Briefcase className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
                <input value={job} onChange={e => setJob(e.target.value)} placeholder="مثلاً: مصفّف شعر، مكياج، استقبال" className="w-full pr-9 pl-3 py-3 rounded-xl bg-[#FAFAF7] text-sm" />
              </div>

              {canVerify ? (
                <WhatsAppLogin label="أكّد رقمك على واتساب وسجّل 🧞" getFullName={() => name} onDone={handleVerified} />
              ) : (
                <p className="text-center text-xs text-[#6B7280] bg-[#FAFAF7] rounded-xl py-3 flex items-center justify-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#FA8125]" /> املا اسمك واختار الفرع الأول
                </p>
              )}

              {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}
            </>
          )}

          {step === 'joining' && (
            <div className="text-center py-8 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
              <p className="text-sm font-bold text-[#1A2E26]">ثواني — بنسجّل طلبك…</p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#FA8125]/10 grid place-items-center mx-auto mb-4"><BadgeCheck className="w-8 h-8 text-[#FA8125]" /></div>
              <h2 className="text-xl font-black text-[#1A2E26] mb-2">تمام! 🎉</h2>
              <p className="text-sm text-[#6B7280] leading-relaxed">{doneMsg}</p>
              <a href="/home" className="inline-block mt-5 px-6 py-2.5 rounded-xl bg-[#FA8125] text-white text-sm font-bold">روح لحسابي على مضمونة</a>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-white/60 mt-6">madmonacairo.com · معاملاتك مضمونة</p>
      </div>
    </div>
  )
}
