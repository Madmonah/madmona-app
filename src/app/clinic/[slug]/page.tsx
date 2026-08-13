'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, Stethoscope, Calendar as CalendarIcon, MapPin,
  ShieldCheck, ChevronLeft, ArrowLeft, CheckCircle2, Phone, BadgeCheck, MessageCircle,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const fmt = (n: any) => Number(n || 0).toLocaleString('ar-EG')
const INSTAPAY = '5220001000009207'
const WA = '201002229982'

type Step = 'doctors' | 'datetime' | 'info' | 'confirm' | 'done'

export default function ClinicLandingPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('doctors')
  const [doctor, setDoctor] = useState<any>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [bookingEnabled, setBookingEnabled] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { data: d } = await supabase.rpc('public_clinic_landing', { p_slug: slug })
      setData(d); setLoading(false)
    })()
  }, [slug])

  async function loadSlots(d: Date) {
    if (!doctor) return
    setLoadingSlots(true)
    const { data: r } = await supabase.rpc('public_get_available_slots', {
      p_branch_code: doctor.branch_code, p_date: d.toISOString().slice(0, 10), p_stylist_id: doctor.employee_id,
    })
    setSlots(r?.slots || []); setBookingEnabled(r?.booking_enabled !== false); setLoadingSlots(false)
  }
  useEffect(() => { if (date) loadSlots(date) /* eslint-disable-next-line */ }, [date])

  async function submit() {
    if (!doctor || !date || !time || !name || !phone) return
    setSubmitting(true)
    const sched = new Date(date); const [h, m] = time.split(':'); sched.setHours(parseInt(h), parseInt(m), 0, 0)
    const { data: r, error } = await supabase.rpc('public_create_booking', {
      p_branch_code: doctor.branch_code, p_service_id: doctor.consultation_service_id,
      p_customer_name: name, p_customer_phone: phone, p_scheduled_at: sched.toISOString(),
      p_stylist_id: doctor.employee_id, p_notes: notes || null,
    })
    if (error || !r?.success) alert('خطأ: ' + (error?.message || r?.error || 'فشل الحجز'))
    else { setResult(r); setStep('done') }
    setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div>
  if (!data?.ok) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center"><Stethoscope className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="font-bold text-[#1A2E26]">العيادة مش موجودة</p></div>
    </div>
  )

  const specialties = data.specialties || []
  const fee = Number(doctor?.consultation_fee_egp || 0)
  const deposit = Math.round(fee * 0.05)
  const dateOptions: Date[] = []
  for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() + i); dateOptions.push(d) }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-[#FA8125] text-white">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/15 grid place-items-center mx-auto mb-3">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70 mb-1">عيادة · حجز كشف</p>
          <h1 className="text-2xl md:text-3xl font-black mb-1">{data.business_name}</h1>
          <p className="text-sm text-white/80">{(data.branches || []).length} فروع · أطباء وأخصائيين · حجز موعد فوري</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {step === 'doctors' && (
          <div className="space-y-5">
            <div className="bg-[#FA8125]/5 border border-[#FA8125]/20 rounded-2xl p-4 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#FA8125] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#6B7280] leading-relaxed">
                احجز كشفك مع دكتور متخصص. الحجز مؤمّن عن طريق <b className="text-[#1A2E26]">مضمونة</b> — عربون جدية ٥٪ بيأكّد موعدك ويتخصم من قيمة الكشف وقت حضورك.
              </p>
            </div>
            {specialties.map((sp: any) => (
              <section key={sp.specialty}>
                <h2 className="text-sm font-black text-[#1A2E26] mb-2 flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-[#FA8125]" /> {sp.specialty}</h2>
                <div className="space-y-2">
                  {sp.doctors.map((doc: any) => (
                    <div key={doc.employee_id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center font-black text-lg flex-shrink-0">{doc.avatar_initial || 'د'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[#1A2E26]">{doc.name}</p>
                          <p className="text-[12px] text-[#FA8125] font-bold">{doc.title}</p>
                          {doc.bio && <p className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">{doc.bio}</p>}
                          <div className="flex items-center flex-wrap gap-1.5 mt-2">
                            {doc.years_experience > 0 && <span className="text-[10px] font-bold text-[#6B7280] bg-[#FAFAF7] rounded-full px-2 py-0.5">{doc.years_experience} سنة خبرة</span>}
                            <span className="text-[10px] font-bold text-[#6B7280] bg-[#FAFAF7] rounded-full px-2 py-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {doc.branch_name}</span>
                          </div>
                          {(doc.accepted_insurance || []).length > 0 && (
                            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                              <BadgeCheck className="w-3.5 h-3.5 text-[#FA8125]" />
                              {doc.accepted_insurance.map((ins: string) => (
                                <span key={ins} className="text-[10px] font-bold text-[#FA8125] bg-[#FA8125]/10 rounded-full px-2 py-0.5">{ins}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-[10px] text-[#6B7280]">سعر الكشف</p>
                          <p className="font-mono font-black text-[#FA8125] text-lg">{fmt(doc.consultation_fee_egp)} ج</p>
                        </div>
                        <button
                          onClick={() => { setDoctor(doc); setDate(null); setTime(null); setStep('datetime') }}
                          disabled={!doc.consultation_service_id}
                          className="px-5 py-2.5 rounded-xl bg-[#FA8125] text-white font-black text-sm flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <CalendarIcon className="w-4 h-4" /> احجز كشف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <p className="text-center text-[10px] text-[#6B7280]">powered by مضمونة · madmonacairo.com</p>
          </div>
        )}

        {step === 'datetime' && doctor && (
          <div className="space-y-4">
            <button onClick={() => setStep('doctors')} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> رجوع للأطباء</button>
            <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center font-black">{doctor.avatar_initial || 'د'}</div>
              <div className="flex-1 min-w-0"><p className="font-black text-[#1A2E26] text-sm">{doctor.name}</p><p className="text-[11px] text-[#FA8125]">{doctor.title} · {doctor.branch_name}</p></div>
              <p className="font-mono font-black text-[#FA8125]">{fmt(fee)} ج</p>
            </div>
            <h2 className="text-lg font-black text-[#1A2E26]">اختر يوم وموعد الكشف</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dateOptions.map(d => {
                const sel = date?.toDateString() === d.toDateString()
                const today = new Date().toDateString() === d.toDateString()
                return (
                  <button key={d.toISOString()} onClick={() => { setDate(d); setTime(null) }} className={`flex-shrink-0 px-3 py-2 rounded-xl text-center min-w-[60px] transition-all ${sel ? 'bg-[#FA8125] text-white' : 'bg-white text-[#1A2E26] border border-gray-100 hover:border-[#FA8125]'}`}>
                    <p className={`text-[10px] font-bold ${sel ? 'text-white/80' : 'text-[#6B7280]'}`}>{today ? 'النهاردة' : d.toLocaleDateString('ar-EG', { weekday: 'short' })}</p>
                    <p className="text-lg font-black font-mono">{d.getDate()}</p>
                    <p className="text-[10px]">{d.toLocaleDateString('ar-EG', { month: 'short' })}</p>
                  </button>
                )
              })}
            </div>
            {date && !bookingEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center"><p className="text-sm font-bold text-amber-800">الحجز الأونلاين مقفول حاليًا</p><p className="text-xs text-amber-700 mt-1">برجاء التواصل مع العيادة مباشرة</p></div>
            )}
            {date && bookingEnabled && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3">المواعيد المتاحة</p>
                {loadingSlots ? <div className="py-6 text-center"><Loader2 className="w-5 h-5 text-[#FA8125] animate-spin inline" /></div> : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {slots.length === 0 && <p className="col-span-full text-center text-sm text-[#6B7280] py-4">مفيش مواعيد متاحة في اليوم ده</p>}
                    {slots.map((s: any) => (
                      <button key={s.time} disabled={!s.available} onClick={() => { setTime(s.time); setStep('info') }} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${!s.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : time === s.time ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-[#FA8125]/10'}`}>{s.time.slice(0, 5)}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'info' && (
          <div className="space-y-4">
            <button onClick={() => setStep('datetime')} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> رجوع</button>
            <h2 className="text-lg font-black text-[#1A2E26]">بيانات المريض</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">اسم المريض *</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></div>
              <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">رقم الموبايل (واتساب) *</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" /></div>
              <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">شكوى أو ملاحظة (اختياري)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="مثل: متابعة، أعراض، تحاليل سابقة..." className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></div>
            </div>
            <button onClick={() => setStep('confirm')} disabled={!name || !phone} className="w-full py-3 rounded-xl bg-[#FA8125] text-white font-black disabled:opacity-40 flex items-center justify-center gap-2">متابعة <ChevronLeft className="w-4 h-4" /></button>
          </div>
        )}

        {step === 'confirm' && doctor && (
          <div className="space-y-4">
            <button onClick={() => setStep('info')} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> رجوع</button>
            <h2 className="text-lg font-black text-[#1A2E26]">تأكيد الحجز</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <Row icon={<Stethoscope className="w-4 h-4" />} label="الدكتور" value={doctor.name} sub={doctor.title} />
              <Row icon={<CalendarIcon className="w-4 h-4" />} label="اليوم" value={date?.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })} sub={time?.slice(0, 5)} />
              <Row icon={<MapPin className="w-4 h-4" />} label="الفرع" value={doctor.branch_name} />
              <Row icon={<Phone className="w-4 h-4" />} label="المريض" value={name} sub={phone} />
              <div className="pt-3 border-t border-gray-100 space-y-1">
                <div className="flex justify-between items-center"><span className="text-sm font-bold text-[#1A2E26]">سعر الكشف</span><span className="font-mono font-black text-2xl text-[#FA8125]">{fmt(fee)} ج</span></div>
                <div className="mt-3 rounded-xl bg-[#FA8125]/5 border border-[#FA8125]/20 p-3">
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-[#1A2E26]">عربون جدية (٥٪ غير مسترد)</span><span className="font-mono font-black text-[#FA8125]">{fmt(deposit)} ج</span></div>
                  <p className="text-[10px] text-[#6B7280] mt-1 leading-relaxed">لتأكيد الكشف، حوّل العربون على حساب مضمونة — InstaPay: <b className="text-[#1A2E26] font-mono" dir="ltr">{INSTAPAY}</b> (بنك مصر). بيتخصم من قيمة الكشف وقت حضورك، وغير مسترد لو ملحقتش تحضر.</p>
                </div>
              </div>
            </div>
            <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-xl bg-[#FA8125] text-white font-black disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التأكيد...</> : <><CheckCircle2 className="w-4 h-4" /> أكّد الحجز</>}
            </button>
          </div>
        )}

        {step === 'done' && result && doctor && (
          <div className="space-y-4 text-center py-8">
            <div className="w-20 h-20 rounded-full bg-[#FA8125] grid place-items-center mx-auto"><CheckCircle2 className="w-10 h-10 text-white" /></div>
            <h2 className="text-2xl font-black text-[#1A2E26]">تم تأكيد حجز كشفك! 🩺</h2>
            <p className="text-sm text-[#6B7280]">هنبعتلك تأكيد على واتساب بتفاصيل الموعد</p>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 text-right">
              <Row icon={<Stethoscope className="w-4 h-4" />} label="الدكتور" value={doctor.name} sub={doctor.title} />
              <Row icon={<CalendarIcon className="w-4 h-4" />} label="الموعد" value={date?.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })} sub={time?.slice(0, 5)} />
              <Row icon={<MapPin className="w-4 h-4" />} label="الفرع" value={doctor.branch_name} />
              <div className="pt-3 border-t border-gray-100 flex justify-between"><span className="text-sm font-bold">سعر الكشف</span><span className="font-mono font-black text-[#FA8125]">{fmt(result.price)} ج</span></div>
              {result.deposit_required && (
                <div className="pt-3 border-t border-gray-100 text-right">
                  <div className="flex justify-between items-center"><span className="text-sm font-bold text-[#1A2E26]">عربون الجدية (٥٪)</span><span className="font-mono font-black text-[#FA8125]">{fmt(result.deposit_egp)} ج</span></div>
                  <p className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">حوّل العربون لتأكيد الكشف على حساب مضمونة — InstaPay: <b className="text-[#1A2E26] font-mono" dir="ltr">{INSTAPAY}</b> (بنك مصر).</p>
                </div>
              )}
            </div>
            <a href={`https://wa.me/${WA}?text=${encodeURIComponent(`السلام عليكم، أنا ${name}، حجزت كشف مع ${doctor.name} يوم ${date?.toLocaleDateString('ar-EG')} الساعة ${time?.slice(0, 5)}`)}`} target="_blank" rel="noopener" className="block w-full py-3 rounded-xl bg-[#FA8125] text-white font-black flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" /> تواصل واتساب لتأكيد العربون</a>
          </div>
        )}
      </main>
    </div>
  )
}

function Row({ icon, label, value, sub }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#FAFAF7] grid place-items-center text-[#FA8125]">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase text-[#6B7280]">{label}</p>
        <p className="text-sm font-bold text-[#1A2E26]">{value}</p>
        {sub && <p className="text-[10px] text-[#6B7280] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
