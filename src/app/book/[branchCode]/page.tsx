'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, Calendar as CalendarIcon, Clock, User,
  CheckCircle2, MapPin, Phone, Scissors, Sparkles, ArrowLeft,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CATEGORY_LABELS: Record<string, string> = {
  hair_cut: 'قص شعر', hair_color: 'صبغة', hair_treatment: 'علاج شعر',
  styling: 'سشوار / تسريحة', makeup: 'مكياج', nails: 'أظافر', skin: 'بشرة',
  package: 'باقة', general: 'عام',
}

type Step = 'service' | 'datetime' | 'stylist' | 'info' | 'confirm' | 'done'

export default function PublicBookingPage({ params }: { params: { branchCode: string } }) {
  const { branchCode } = params
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedStylist, setSelectedStylist] = useState<any>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: result } = await supabase.rpc('public_get_branch_info', { p_branch_code: branchCode })
    setData(result)
    setLoading(false)
  }

  async function loadSlots(date: Date) {
    setLoadingSlots(true)
    // @ts-expect-error
    const { data: result } = await supabase.rpc('public_get_available_slots', {
      p_branch_code: branchCode,
      p_date: date.toISOString().slice(0, 10),
      p_stylist_id: selectedStylist?.id || null,
    })
    setSlots(result?.slots || [])
    setLoadingSlots(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [branchCode])
  useEffect(() => { if (selectedDate) loadSlots(selectedDate) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedDate, selectedStylist])

  async function submitBooking() {
    if (!selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone) return
    setSubmitting(true)
    const scheduled = new Date(selectedDate)
    const [h, m] = selectedTime.split(':')
    scheduled.setHours(parseInt(h), parseInt(m), 0, 0)
    // @ts-expect-error
    const { data: result, error } = await supabase.rpc('public_create_booking', {
      p_branch_code: branchCode, p_service_id: selectedService.id,
      p_customer_name: customerName, p_customer_phone: customerPhone,
      p_scheduled_at: scheduled.toISOString(),
      p_stylist_id: selectedStylist?.id || null, p_notes: notes || null,
    })
    if (error || !result?.success) alert('خطأ: ' + (error?.message || result?.error || 'فشل الحجز'))
    else { setBookingResult(result); setStep('done') }
    setSubmitting(false)
  }

  if (loading) return <Loader />
  if (!data?.branch) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="text-center"><MapPin className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-[#1A2E26] font-bold">فرع غير موجود</p></div>
    </div>
  )

  const services = data.services || []
  const stylists = data.stylists || []
  const supplier = data.supplier
  const branch = data.branch
  const servicesByCategory: Record<string, any[]> = {}
  services.forEach((s: any) => {
    const cat = s.category || 'general'
    if (!servicesByCategory[cat]) servicesByCategory[cat] = []
    servicesByCategory[cat].push(s)
  })
  const dateOptions: Date[] = []
  for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() + i); dateOptions.push(d) }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-[#1F6F5F] text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/80 mb-1">ONLINE BOOKING</p>
          <h1 className="text-2xl md:text-3xl font-black">{supplier?.business_name}</h1>
          <p className="text-sm text-white/90 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {branch?.name}</p>
          {step !== 'done' && (
            <div className="mt-4 flex gap-2 text-[10px] font-bold tracking-wider uppercase flex-wrap">
              <StepBadge label="الخدمة" active={step === 'service'} done={['datetime','stylist','info','confirm'].includes(step)} />
              <StepBadge label="الموعد" active={step === 'datetime'} done={['stylist','info','confirm'].includes(step)} />
              <StepBadge label="الستايليست" active={step === 'stylist'} done={['info','confirm'].includes(step)} />
              <StepBadge label="بياناتك" active={step === 'info'} done={step === 'confirm'} />
              <StepBadge label="تأكيد" active={step === 'confirm'} done={false} />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {step === 'service' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-[#1A2E26]">اختاري الخدمة</h2>
            {services.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <Scissors className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">مفيش خدمات متاحة</p>
              </div>
            ) : Object.entries(servicesByCategory).map(([cat, items]) => (
              <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-2 bg-[#FAFAF7] border-b border-gray-100">
                  <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280]">{CATEGORY_LABELS[cat] || cat}</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((svc: any) => (
                    <button key={svc.id} onClick={() => { setSelectedService(svc); setStep('datetime') }} className="w-full text-right px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#FAFAF7]/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1A2E26]">{svc.name_ar}</p>
                        {svc.description && <p className="text-[10px] text-[#6B7280] mt-0.5">{svc.description}</p>}
                        <p className="text-[10px] text-[#6B7280] mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {svc.duration_minutes} دقيقة</p>
                      </div>
                      <div className="text-left"><p className="font-black font-mono text-[#1F6F5F]">{Number(svc.price_egp).toLocaleString()} ج</p></div>
                      <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 'datetime' && (
          <div className="space-y-4">
            <BackBtn onClick={() => setStep('service')} />
            <h2 className="text-lg font-black text-[#1A2E26]">اختاري التاريخ والوقت</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dateOptions.map(d => {
                const isSelected = selectedDate?.toDateString() === d.toDateString()
                const isToday = new Date().toDateString() === d.toDateString()
                return (
                  <button key={d.toISOString()} onClick={() => { setSelectedDate(d); setSelectedTime(null) }} className={`flex-shrink-0 px-3 py-2 rounded-xl text-center min-w-[60px] transition-all ${isSelected ? 'bg-[#1F6F5F] text-white' : 'bg-white text-[#1A2E26] border border-gray-100 hover:border-[#1F6F5F]'}`}>
                    <p className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-[#6B7280]'}`}>{isToday ? 'النهاردة' : d.toLocaleDateString('ar-EG', { weekday: 'short' })}</p>
                    <p className="text-lg font-black font-mono">{d.getDate()}</p>
                    <p className="text-[10px]">{d.toLocaleDateString('ar-EG', { month: 'short' })}</p>
                  </button>
                )
              })}
            </div>
            {selectedDate && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3">المواعيد المتاحة</p>
                {loadingSlots ? <div className="py-6 text-center"><Loader2 className="w-5 h-5 text-[#1F6F5F] animate-spin inline" /></div> : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {slots.map((slot: any) => (
                      <button key={slot.time} disabled={!slot.available} onClick={() => { setSelectedTime(slot.time); setStep('stylist') }} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${!slot.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : selectedTime === slot.time ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-[#1F6F5F]/10'}`}>{slot.time.slice(0, 5)}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'stylist' && (
          <div className="space-y-4">
            <BackBtn onClick={() => setStep('datetime')} />
            <h2 className="text-lg font-black text-[#1A2E26]">اختاري الستايليست (اختياري)</h2>
            <button onClick={() => { setSelectedStylist(null); setStep('info') }} className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:border-[#1F6F5F] text-right transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center"><Sparkles className="w-5 h-5" /></div>
              <div className="flex-1"><p className="text-sm font-black text-[#1A2E26]">أي ستايليست متاحة</p><p className="text-[10px] text-[#6B7280] mt-0.5">الفرع هـ يختار أفضل ستايليست متاح</p></div>
              <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
            </button>
            <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mt-4">أو اختاري ستايليست محدد:</p>
            <div className="space-y-2">
              {stylists.map((s: any) => (
                <button key={s.id} onClick={() => { setSelectedStylist(s); setStep('info') }} className="w-full bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-3 hover:border-[#1F6F5F] text-right transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 text-[#1F6F5F] grid place-items-center font-black">{s.avatar_initial || s.full_name.charAt(0)}</div>
                  <div className="flex-1"><p className="text-sm font-bold text-[#1A2E26]">{s.full_name}</p><p className="text-[10px] text-[#6B7280] mt-0.5">{s.role_ar}</p></div>
                  <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'info' && (
          <div className="space-y-4">
            <BackBtn onClick={() => setStep('stylist')} />
            <h2 className="text-lg font-black text-[#1A2E26]">بياناتك للتواصل</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <Field label="الاسم *"><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسمك الكامل" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
              <Field label="رقم الموبايل (واتساب) *"><input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" /></Field>
              <Field label="ملاحظات (اختياري)"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="مثل: تركيبة صبغة، طلبات خاصة..." className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
            </div>
            <button onClick={() => setStep('confirm')} disabled={!customerName || !customerPhone} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black disabled:opacity-40 flex items-center justify-center gap-2">متابعة <ChevronLeft className="w-4 h-4" /></button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <BackBtn onClick={() => setStep('info')} />
            <h2 className="text-lg font-black text-[#1A2E26]">تأكيد الحجز</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <SummaryRow icon={<Scissors />} label="الخدمة" value={selectedService?.name_ar} sub={`${selectedService?.duration_minutes} دقيقة`} />
              <SummaryRow icon={<CalendarIcon />} label="التاريخ" value={selectedDate?.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <SummaryRow icon={<Clock />} label="الوقت" value={selectedTime?.slice(0, 5)} />
              <SummaryRow icon={<User />} label="الستايليست" value={selectedStylist?.full_name || 'أي متاحة'} />
              <SummaryRow icon={<Phone />} label="بياناتك" value={customerName} sub={customerPhone} />
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-bold text-[#1A2E26]">السعر الإجمالي</span>
                <span className="font-mono font-black text-2xl text-[#1F6F5F]">{Number(selectedService?.price_egp || 0).toLocaleString()} ج</span>
              </div>
            </div>
            <button onClick={submitBooking} disabled={submitting} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التأكيد...</> : <><CheckCircle2 className="w-4 h-4" /> أكدي الحجز</>}
            </button>
            <p className="text-[10px] text-center text-[#6B7280]">بالتأكيد أنتي بتوافقي على شروط الخدمة وسياسة الخصوصية</p>
          </div>
        )}

        {step === 'done' && bookingResult && (
          <div className="space-y-4 text-center py-8">
            <div className="w-20 h-20 rounded-full bg-[#1F6F5F] grid place-items-center mx-auto"><CheckCircle2 className="w-10 h-10 text-white" /></div>
            <h2 className="text-2xl font-black text-[#1A2E26]">تم تأكيد حجزك! 🎉</h2>
            <p className="text-sm text-[#6B7280]">هنبعتلك رسالة واتساب بتفاصيل الحجز قريب</p>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 text-right">
              <SummaryRow icon={<Scissors />} label="الخدمة" value={bookingResult.service_name} />
              <SummaryRow icon={<CalendarIcon />} label="التاريخ والوقت" value={selectedDate?.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })} sub={selectedTime?.slice(0, 5)} />
              <SummaryRow icon={<MapPin />} label="الفرع" value={branch?.name} />
              <div className="pt-3 border-t border-gray-100 flex justify-between">
                <span className="text-sm font-bold">السعر</span>
                <span className="font-mono font-black text-[#1F6F5F]">{Number(bookingResult.price).toLocaleString()} ج</span>
              </div>
            </div>
            <a href={`https://wa.me/${supplier?.contact_phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`السلام عليكم، أنا ${customerName}، حجزت ${bookingResult.service_name} ${selectedDate?.toLocaleDateString('ar-EG')} الساعة ${selectedTime?.slice(0, 5)}`)}`} target="_blank" rel="noopener" className="block w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black">تواصل واتساب مع الفرع</a>
          </div>
        )}
      </main>
    </div>
  )
}

function StepBadge({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return <span className={`px-2 py-0.5 rounded ${active ? 'bg-white text-[#1F6F5F]' : done ? 'bg-white/30 text-white' : 'bg-white/10 text-white/60'}`}>{label}</span>
}
function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> ارجع</button>
}
function SummaryRow({ icon, label, value, sub }: any) {
  return <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[#FAFAF7] grid place-items-center text-[#1F6F5F]"><div className="w-4 h-4">{icon}</div></div><div className="flex-1 min-w-0"><p className="text-[10px] font-bold uppercase text-[#6B7280]">{label}</p><p className="text-sm font-bold text-[#1A2E26]">{value}</p>{sub && <p className="text-[10px] text-[#6B7280] mt-0.5">{sub}</p>}</div></div>
}
function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div> }
