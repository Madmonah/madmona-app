'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, Calendar as CalendarIcon, Clock, User,
  CheckCircle2, MapPin, Phone, Scissors, Sparkles, ArrowLeft,
  ShoppingBag, Plus, Minus, Check, ShieldCheck, Wrench, Tag,
} from 'lucide-react'
import { useMadmonaAuth, AccountGate } from '@/components/AccountGate'
import { getThemeKey, THEMES } from '@/lib/storefrontTheme'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CATEGORY_LABELS: Record<string, string> = {
  hair_cut: 'قص شعر', hair_color: 'صبغة', hair_treatment: 'علاج شعر',
  styling: 'سشوار / تسريحة', makeup: 'مكياج', nails: 'أظافر', skin: 'بشرة',
  package: 'باقة', general: 'عام',
}

const STEP_ORDER = ['service', 'stylist', 'datetime', 'extras', 'info', 'confirm']
const STEP_LABELS: Record<string, string> = {
  service: 'الخدمة', stylist: 'الستايليست', datetime: 'الموعد', extras: 'إضافات', info: 'بياناتك', confirm: 'تأكيد',
}

type Step = 'service' | 'stylist' | 'datetime' | 'extras' | 'info' | 'confirm' | 'done' | 'waitlist' | 'waitlist_done'

export default function PublicBookingPage({ params }: { params: { branchCode: string } }) {
  const { branchCode } = params
  const { checking, authed, setAuthed, setProfile } = useMadmonaAuth()
  const [data, setData] = useState<any>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedStylist, setSelectedStylist] = useState<any>(null)
  const [addons, setAddons] = useState<any[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<any[]>([])
  const [bookingEnabled, setBookingEnabled] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)
  const [waitlistResult, setWaitlistResult] = useState<any>(null)
  const [preferredTimeText, setPreferredTimeText] = useState('أي وقت')

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: result } = await supabase.rpc('public_get_branch_info', { p_branch_code: branchCode })
    setData(result)
    if (result?.supplier?.id) {
      // @ts-expect-error
      const { data: br } = await supabase.rpc('public_get_supplier_branding', { p_supplier_id: result.supplier.id })
      if (br?.logo_url) setLogo(br.logo_url)
    }
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
    setBookingEnabled(result?.booking_enabled !== false)
    setLoadingSlots(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [branchCode])

  // Pre-fill name + phone from the logged-in Madmona account (if any)
  useEffect(() => {
    (async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null
      if (!token) return
      // @ts-expect-error rpc typing
      const { data } = await supabase.rpc('madmona_resolve', { p_token: token })
      if (data?.authenticated) {
        if (data.full_name) setCustomerName((prev) => prev || data.full_name)
        if (data.phone) setCustomerPhone((prev) => prev || ('0' + String(data.phone).slice(-10)))
      }
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  // Preselect a service if arriving from the visit hub (?service=ID)
  useEffect(() => {
    if (!data?.services?.length || selectedService) return
    const sid = new URLSearchParams(window.location.search).get('service')
    if (sid) {
      const svc = data.services.find((s: any) => s.id === sid)
      if (svc) { setSelectedService(svc); setStep((data.stylists?.length || 0) > 0 ? 'stylist' : 'datetime') }
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [data])

  useEffect(() => { if (selectedDate) loadSlots(selectedDate) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedDate, selectedStylist])

  async function submitBooking() {
    if (!selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone) return
    setSubmitting(true)
    const scheduled = new Date(selectedDate)
    const [h, m] = selectedTime.split(':')
    scheduled.setHours(parseInt(h), parseInt(m), 0, 0)
    const _products = (data?.products || []).filter((p: any) => (cart[p.id] || 0) > 0).map((p: any) => ({ product_id: p.id, qty: cart[p.id] }))
    // @ts-expect-error
    const { data: result, error } = await supabase.rpc('public_create_booking', {
      p_branch_code: branchCode, p_service_id: selectedService.id,
      p_customer_name: customerName, p_customer_phone: customerPhone,
      p_scheduled_at: scheduled.toISOString(),
      p_stylist_id: selectedStylist?.id || null, p_notes: notes || null,
      p_addon_service_ids: addons.map((a: any) => a.id),
      p_products: _products,
    })
    if (error || !result?.success) alert('خطأ: ' + (error?.message || result?.error || 'فشل الحجز'))
    else { setBookingResult(result); setStep('done') }
    setSubmitting(false)
  }

  async function joinWaitlist() {
    if (!selectedService || !customerName || !customerPhone) return
    setSubmitting(true)
    // @ts-expect-error
    const { data: result, error } = await supabase.rpc('public_join_waitlist', {
      p_branch_code: branchCode, p_service_id: selectedService.id,
      p_customer_name: customerName, p_customer_phone: customerPhone,
      p_preferred_date: selectedDate ? selectedDate.toISOString().slice(0, 10) : null,
      p_preferred_time_text: preferredTimeText,
    })
    if (error || !result?.success) alert('خطأ: ' + (error?.message || result?.error || 'فشل'))
    else { setWaitlistResult(result); setStep('waitlist_done') }
    setSubmitting(false)
  }

  if (loading || checking) return <Loader />

  // ===== per-merchant theme (sa3dawy = dark/red, others = default) =====
  const themeKey = getThemeKey({ supplierId: data?.supplier?.id, industry: data?.supplier?.industry })
  const t = THEMES[themeKey]
  const themeVars = {
    '--accent': t.accent,
    '--accent-soft': t.accentSoft,
    '--accent-line': t.accentLine,
    '--g-cta': t.gCta,
    '--g-hero': t.gHero,
    '--step-active': t.stepActive,
  } as CSSProperties

  if (!data?.branch) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl" style={themeVars}>
      <div className="text-center"><MapPin className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-[#1A2E26] font-bold">فرع غير موجود</p></div>
    </div>
  )

  if (!authed) return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl" style={themeVars}>
      <header className="text-white" style={{ backgroundImage: 'var(--g-hero)' }}>
        <div className="max-w-md mx-auto px-4 py-8 text-center">
          <p className="text-[10px] font-bold tracking-[0.35em] uppercase text-white/70 mb-1">MADMONA · ONLINE BOOKING</p>
          {logo ? (
            <div className="mx-auto my-2 rounded-2xl overflow-hidden ring-1 ring-white/25 bg-black/25 backdrop-blur-sm" style={{ width: 'min(64%, 220px)' }}>
              <img src={logo} alt={data.supplier?.business_name} className="w-full block" />
            </div>
          ) : (
            <h1 className="text-xl font-black">{data.supplier?.business_name}</h1>
          )}
          <p className="text-xs text-white/90 mt-1 flex items-center justify-center gap-1"><MapPin className="w-3.5 h-3.5" /> {data.branch?.name}</p>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-6">
        <AccountGate
          onAuthed={(p) => { setAuthed(true); setProfile(p); if (p.name) setCustomerName((v) => v || p.name); if (p.phone) { const ph = p.phone; setCustomerPhone((v) => v || ph) } }}
          subtitle={data.supplier?.industry === 'beauty_salon' ? "عشان نأكد حجزك ونتابع مواعيدك ونبعتلك تذكير — اعملي حسابك في ثانية على مضمونة بكود واتساب." : "عشان نأكد حجزك ونتابع مواعيدك ونبعتلك تذكير — اعمل حسابك في ثانية على مضمونة بكود واتساب."}
        />
      </main>
    </div>
  )

  const services = data.services || []
  const stylists = data.stylists || []
  const products = data.products || []
  const supplier = data.supplier
  // Vertical-aware tone: only beauty salons get feminine copy + scissors.
  // Everything else (vehicle agency / clinic / restaurant / default) stays neutral & business-appropriate.
  const fem = supplier?.industry === 'beauty_salon'
  const ServiceIcon = supplier?.industry === 'beauty_salon' ? Scissors
    : supplier?.industry === 'vehicle_agency' ? Wrench
    : Tag
  const cartItems = products.filter((p: any) => (cart[p.id] || 0) > 0)
  const addonsTotal = addons.reduce((s: number, a: any) => s + Number(a.price_egp || 0), 0)
  const productsTotal = cartItems.reduce((s: number, p: any) => s + Number(p.selling_price_egp || 0) * cart[p.id], 0)
  const servicesTotal = Number(selectedService?.price_egp || 0) + addonsTotal
  const grandTotal = servicesTotal + productsTotal
  const isClinic = supplier?.industry === 'polyclinic' || supplier?.industry === 'clinic'
  const jadeyaDeposit = isClinic ? Math.round(servicesTotal * 0.05) : 0
  const branch = data.branch
  const servicesByCategory: Record<string, any[]> = {}
  services.forEach((s: any) => {
    const cat = s.category || 'general'
    if (!servicesByCategory[cat]) servicesByCategory[cat] = []
    servicesByCategory[cat].push(s)
  })
  const dateOptions: Date[] = []
  for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() + i); dateOptions.push(d) }
  const allSlotsFull = selectedDate && bookingEnabled && !loadingSlots && slots.length > 0 && slots.every((s: any) => !s.available)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl" style={themeVars}>
      <header className="text-white" style={{ backgroundImage: 'var(--g-hero)' }}>
        <div className="max-w-3xl mx-auto px-4 py-7">
          {logo ? (
            <div className="rounded-2xl overflow-hidden ring-1 ring-white/25 bg-black/25 backdrop-blur-sm inline-block" style={{ width: 'min(58%, 220px)' }}>
              <img src={logo} alt={supplier?.business_name} className="w-full block" />
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/80 mb-1">ONLINE BOOKING</p>
              <h1 className="text-2xl md:text-3xl font-black">{supplier?.business_name}</h1>
            </>
          )}
          <p className="text-sm text-white/90 mt-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {branch?.name}</p>
          {STEP_ORDER.includes(step) && <StepBar step={step} steps={stylists.length > 0 ? STEP_ORDER : STEP_ORDER.filter(s => s !== 'stylist')} />}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {step === 'service' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-[#1A2E26]">{fem ? 'اختاري الخدمة' : 'اختار الخدمة'}</h2>
            {services.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <ServiceIcon className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">مفيش خدمات متاحة</p>
              </div>
            ) : Object.entries(servicesByCategory).map(([cat, items]) => (
              <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-[#FAFAF7] border-b border-gray-100">
                  <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280]">{CATEGORY_LABELS[cat] || cat}</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((svc: any) => (
                    <button key={svc.id} onClick={() => { setSelectedService(svc); setStep(stylists.length > 0 ? 'stylist' : 'datetime') }} className="w-full text-right px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#FAFAF7]/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1A2E26]">{svc.name_ar}</p>
                        {svc.description && <p className="text-[10px] text-[#6B7280] mt-0.5">{svc.description}</p>}
                        <p className="text-[10px] text-[#6B7280] mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {svc.duration_minutes} دقيقة</p>
                      </div>
                      <div className="text-left"><p className="font-black font-mono text-[var(--accent)]">{Number(svc.price_egp).toLocaleString()} ج</p></div>
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
            <BackBtn onClick={() => setStep(stylists.length > 0 ? 'stylist' : 'service')} />
            <h2 className="text-lg font-black text-[#1A2E26]">{fem ? 'اختاري التاريخ والوقت' : 'اختار التاريخ والوقت'}</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dateOptions.map(d => {
                const isSelected = selectedDate?.toDateString() === d.toDateString()
                const isToday = new Date().toDateString() === d.toDateString()
                return (
                  <button key={d.toISOString()} onClick={() => { setSelectedDate(d); setSelectedTime(null) }} className={`flex-shrink-0 px-3 py-2 rounded-xl text-center min-w-[60px] transition-all ${isSelected ? 'bg-[var(--accent)] text-white shadow-sm' : 'bg-white text-[#1A2E26] border border-gray-100 hover:border-[var(--accent)]'}`}>
                    <p className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-[#6B7280]'}`}>{isToday ? 'النهاردة' : d.toLocaleDateString('ar-EG', { weekday: 'short' })}</p>
                    <p className="text-lg font-black font-mono">{d.getDate()}</p>
                    <p className="text-[10px]">{d.toLocaleDateString('ar-EG', { month: 'short' })}</p>
                  </button>
                )
              })}
            </div>
            {selectedDate && !bookingEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="text-sm font-bold text-amber-800">الحجز الأونلاين مقفول حالياً</p>
                <p className="text-xs text-amber-700 mt-1">برجاء التواصل مع الفرع مباشرة</p>
              </div>
            )}
            {selectedDate && bookingEnabled && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-3">المواعيد المتاحة</p>
                {loadingSlots ? <div className="py-6 text-center"><Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin inline" /></div> : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {slots.map((slot: any) => (
                      <button key={slot.time} disabled={!slot.available} onClick={() => { setSelectedTime(slot.time); setStep('extras') }} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${!slot.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : selectedTime === slot.time ? 'bg-[var(--accent)] text-white' : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-[var(--accent-soft)]'}`}>{slot.time.slice(0, 5)}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {allSlotsFull && (
              <div className="bg-[var(--accent-soft)] border border-[var(--accent-line)] rounded-2xl p-4 text-center">
                <p className="text-sm font-bold text-[#1A2E26]">اليوم ده مليان بالكامل 😔</p>
                <p className="text-xs text-[#6B7280] mt-1">{fem ? 'سجّلي في قائمة الانتظار، ونتواصل معاكي أول ما يفضى مكان' : 'سجّل في قائمة الانتظار، ونتواصل معاك أول ما يفضى مكان'}</p>
                <button onClick={() => setStep('waitlist')} className="mt-3 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-bold">
                  {fem ? 'انضمي لقائمة الانتظار' : 'انضم لقائمة الانتظار'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'waitlist' && (
          <div className="space-y-4">
            <BackBtn onClick={() => setStep('datetime')} />
            <h2 className="text-lg font-black text-[#1A2E26]">قائمة الانتظار</h2>
            <p className="text-sm text-[#6B7280]">{fem ? 'سجّلي بياناتك،' : 'سجّل بياناتك،'} وأول ما يفضى مكان لـ <b>{selectedService?.name_ar}</b> هنكلمك.</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <Field label="الاسم *"><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسمك الكامل" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
              <Field label="رقم الموبايل (واتساب) *"><input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" /></Field>
              <Field label="الوقت المفضّل">
                <div className="grid grid-cols-3 gap-2">
                  {['صباحاً', 'بعد الظهر', 'مساءً', 'أي وقت'].map(tt => (
                    <button key={tt} onClick={() => setPreferredTimeText(tt)} className={`px-2 py-2 rounded-lg text-xs font-bold ${preferredTimeText === tt ? 'bg-[var(--accent)] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>{tt}</button>
                  ))}
                </div>
              </Field>
            </div>
            <button onClick={joinWaitlist} disabled={submitting || !customerName || !customerPhone} className="w-full py-3.5 rounded-2xl text-white font-black disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg" style={{ backgroundImage: 'var(--g-cta)' }}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التسجيل...</> : <><Clock className="w-4 h-4" /> {fem ? 'سجّليني في الانتظار' : 'سجّلني في الانتظار'}</>}
            </button>
          </div>
        )}

        {step === 'waitlist_done' && waitlistResult && (
          <div className="space-y-4 text-center py-8">
            <div className="w-20 h-20 rounded-full grid place-items-center mx-auto shadow-lg" style={{ backgroundImage: 'var(--g-cta)' }}><Clock className="w-10 h-10 text-white" /></div>
            <h2 className="text-2xl font-black text-[#1A2E26]">تم تسجيلك في الانتظار! ✋</h2>
            <p className="text-sm text-[#6B7280]">ترتيبك رقم <b className="text-[var(--accent)]">{waitlistResult.position}</b> في قائمة الانتظار. {fem ? 'هنتواصل معاكي' : 'هنتواصل معاك'} على واتساب أول ما يفضى مكان.</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 text-right">
              <SummaryRow icon={<ServiceIcon />} label="الخدمة" value={selectedService?.name_ar} />
              <SummaryRow icon={<CalendarIcon />} label="اليوم المفضّل" value={selectedDate?.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })} sub={preferredTimeText} />
              <SummaryRow icon={<MapPin />} label="الفرع" value={branch?.name} />
            </div>
          </div>
        )}

        {step === 'stylist' && (
          <div className="space-y-4">
            <BackBtn onClick={() => setStep('service')} />
            <h2 className="text-lg font-black text-[#1A2E26]">اختاري الستايليست (اختياري)</h2>
            <button onClick={() => { setSelectedStylist(null); setStep('datetime') }} className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-[var(--accent)] text-right transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] grid place-items-center"><Sparkles className="w-5 h-5" /></div>
              <div className="flex-1"><p className="text-sm font-black text-[#1A2E26]">أي ستايليست متاحة</p><p className="text-[10px] text-[#6B7280] mt-0.5">الفرع هـ يختار أفضل ستايليست متاح</p></div>
              <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
            </button>
            <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mt-4">أو اختاري ستايليست محدد:</p>
            <div className="space-y-2">
              {stylists.map((s: any) => (
                <button key={s.id} onClick={() => { setSelectedStylist(s); setStep('datetime') }} className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3 hover:border-[var(--accent)] text-right transition-colors">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.full_name} className="w-12 h-12 rounded-xl object-cover ring-1 ring-[var(--accent-line)]" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl text-white grid place-items-center font-black text-lg" style={{ backgroundImage: 'var(--g-hero)' }}>{s.avatar_initial || s.full_name.charAt(0)}</div>
                  )}
                  <div className="flex-1"><p className="text-sm font-bold text-[#1A2E26]">{s.full_name}</p><p className="text-[10px] text-[#6B7280] mt-0.5">{s.role_ar}</p></div>
                  <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'extras' && (
          <div className="space-y-4">
            <BackBtn onClick={() => setStep('datetime')} />
            <h2 className="text-lg font-black text-[#1A2E26]">{fem ? 'عايزة تضيفي حاجة؟' : 'تحب تضيف حاجة؟'} <span className="text-[#6B7280] text-sm font-normal">(اختياري)</span></h2>
            {services.filter((s: any) => s.id !== selectedService?.id).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-[#FAFAF7] border-b border-gray-100"><p className="text-xs font-bold tracking-wider uppercase text-[#6B7280]">خدمات إضافية</p></div>
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {services.filter((s: any) => s.id !== selectedService?.id).map((svc: any) => {
                    const on = addons.some((a: any) => a.id === svc.id)
                    return (
                      <button key={svc.id} onClick={() => setAddons(on ? addons.filter((a: any) => a.id !== svc.id) : [...addons, svc])} className={`w-full text-right px-4 py-3 flex items-center justify-between gap-3 transition-colors ${on ? 'bg-[var(--accent-soft)]' : 'hover:bg-[#FAFAF7]/50'}`}>
                        <div className={`w-6 h-6 rounded-md grid place-items-center flex-shrink-0 ${on ? 'bg-[var(--accent)] text-white' : 'border border-gray-300 text-transparent'}`}><Check className="w-4 h-4" /></div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-bold text-[#1A2E26]">{svc.name_ar}</p><p className="text-[10px] text-[#6B7280] mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> {svc.duration_minutes} دقيقة</p></div>
                        <p className="font-black font-mono text-[var(--accent)] text-sm">{Number(svc.price_egp).toLocaleString()} ج</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {products.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-[#FAFAF7] border-b border-gray-100"><p className="text-xs font-bold tracking-wider uppercase text-[#6B7280]">{fem ? 'منتجات تقدري تشتريها' : 'منتجات تقدر تشتريها'}</p></div>
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {products.map((p: any) => {
                    const qty = cart[p.id] || 0
                    return (
                      <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0"><p className="text-sm font-bold text-[#1A2E26]">{p.name_ar}</p><p className="font-black font-mono text-[var(--accent)] text-sm mt-0.5">{Number(p.selling_price_egp).toLocaleString()} ج</p></div>
                        {qty === 0 ? (
                          <button onClick={() => setCart({ ...cart, [p.id]: 1 })} className="px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> {fem ? 'ضيفي' : 'ضيف'}</button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => { const n = { ...cart }; if (qty <= 1) { delete n[p.id] } else { n[p.id] = qty - 1 }; setCart(n) }} className="w-7 h-7 rounded-lg bg-[#FAFAF7] grid place-items-center"><Minus className="w-3.5 h-3.5 text-[#1A2E26]" /></button>
                            <span className="w-6 text-center font-black font-mono text-[#1A2E26]">{qty}</span>
                            <button onClick={() => setCart({ ...cart, [p.id]: qty + 1 })} className="w-7 h-7 rounded-lg bg-[var(--accent)] text-white grid place-items-center"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {services.filter((s: any) => s.id !== selectedService?.id).length === 0 && products.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center"><p className="text-sm text-[#6B7280]">مفيش إضافات متاحة حالياً</p></div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <span className="text-sm font-bold text-[#1A2E26]">الإجمالي المتوقع</span>
              <span className="font-mono font-black text-xl text-[var(--accent)]">{grandTotal.toLocaleString()} ج</span>
            </div>
            <button onClick={() => setStep('info')} className="w-full py-3.5 rounded-2xl text-white font-black flex items-center justify-center gap-2 shadow-lg" style={{ backgroundImage: 'var(--g-cta)' }}>متابعة <ChevronLeft className="w-4 h-4" /></button>
          </div>
        )}

        {step === 'info' && (
          <div className="space-y-4">
            <BackBtn onClick={() => setStep('extras')} />
            <h2 className="text-lg font-black text-[#1A2E26]">بياناتك للتواصل</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <Field label="الاسم *"><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اسمك الكامل" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
              <Field label="رقم الموبايل (واتساب) *"><input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" /></Field>
              <Field label="ملاحظات (اختياري)"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="مثل: تركيبة صبغة، طلبات خاصة..." className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
            </div>
            <button onClick={() => setStep('confirm')} disabled={!customerName || !customerPhone} className="w-full py-3.5 rounded-2xl text-white font-black disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg" style={{ backgroundImage: 'var(--g-cta)' }}>متابعة <ChevronLeft className="w-4 h-4" /></button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <BackBtn onClick={() => setStep('info')} />
            <h2 className="text-lg font-black text-[#1A2E26]">تأكيد الحجز</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <SummaryRow icon={<ServiceIcon />} label="الخدمة" value={selectedService?.name_ar} sub={`${selectedService?.duration_minutes} دقيقة`} />
              {addons.map((a: any) => (
                <SummaryRow key={a.id} icon={<Sparkles />} label="خدمة إضافية" value={a.name_ar} sub={`${a.duration_minutes} دقيقة · ${Number(a.price_egp).toLocaleString()} ج`} />
              ))}
              {cartItems.map((p: any) => (
                <SummaryRow key={p.id} icon={<ShoppingBag />} label="منتج" value={`${p.name_ar} ×${cart[p.id]}`} sub={`${(Number(p.selling_price_egp) * cart[p.id]).toLocaleString()} ج`} />
              ))}
              <SummaryRow icon={<CalendarIcon />} label="التاريخ" value={selectedDate?.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <SummaryRow icon={<Clock />} label="الوقت" value={selectedTime?.slice(0, 5)} />
              {stylists.length > 0 && <SummaryRow icon={<User />} label="الستايليست" value={selectedStylist?.full_name || 'أي متاحة'} />}
              <SummaryRow icon={<Phone />} label="بياناتك" value={customerName} sub={customerPhone} />
              <div className="pt-3 border-t border-gray-100 space-y-1">
                {(addonsTotal > 0 || productsTotal > 0) && (
                  <>
                    <div className="flex justify-between text-xs text-[#6B7280]"><span>الخدمات</span><span className="font-mono">{servicesTotal.toLocaleString()} ج</span></div>
                    {productsTotal > 0 && <div className="flex justify-between text-xs text-[#6B7280]"><span>المنتجات</span><span className="font-mono">{productsTotal.toLocaleString()} ج</span></div>}
                  </>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-[#1A2E26]">السعر الإجمالي</span>
                  <span className="font-mono font-black text-2xl text-transparent bg-clip-text" style={{ backgroundImage: 'var(--g-cta)' }}>{grandTotal.toLocaleString()} ج</span>
                </div>
                {isClinic && jadeyaDeposit > 0 && (
                  <div className="mt-3 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-line)] p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#1A2E26]">عربون جدية (٥٪ غير مسترد)</span>
                      <span className="font-mono font-black text-[var(--accent)]">{jadeyaDeposit.toLocaleString()} ج</span>
                    </div>
                    <p className="text-[10px] text-[#6B7280] mt-1 leading-relaxed">
                      لتأكيد حجزك، حوّل العربون على حساب مضمونة — InstaPay: <b className="text-[#1A2E26] font-mono" dir="ltr">5220001000009207</b> (بنك مصر). غير مسترد عند عدم الحضور، ويتخصم من قيمة الكشف وقت حضورك.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-[var(--accent-soft)] border border-[var(--accent-line)] rounded-2xl p-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
              <p className="text-[11px] text-[#6B7280] leading-relaxed">حجزك <b className="text-[#1A2E26]">مضمون عن طريق مضمونة</b> — هيوصلك تأكيد على واتساب فورًا.</p>
            </div>
            <button onClick={submitBooking} disabled={submitting} className="w-full py-3.5 rounded-2xl text-white font-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg" style={{ backgroundImage: 'var(--g-cta)' }}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التأكيد...</> : <><CheckCircle2 className="w-4 h-4" /> {fem ? 'أكدي الحجز' : 'أكّد الحجز'}</>}
            </button>
            <p className="text-[10px] text-center text-[#6B7280]">{fem ? 'بالتأكيد أنتي بتوافقي على شروط الخدمة وسياسة الخصوصية' : 'بالتأكيد أنت بتوافق على شروط الخدمة وسياسة الخصوصية'}</p>
          </div>
        )}

        {step === 'done' && bookingResult && (
          <div className="space-y-4 text-center py-8">
            <div className="w-20 h-20 rounded-full grid place-items-center mx-auto shadow-lg" style={{ backgroundImage: 'var(--g-cta)' }}><CheckCircle2 className="w-10 h-10 text-white" /></div>
            <h2 className="text-2xl font-black text-[#1A2E26]">تم تأكيد حجزك! 🎉</h2>
            <p className="text-sm text-[#6B7280]">هنبعتلك رسالة واتساب بتفاصيل الحجز قريب</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 text-right">
              <SummaryRow icon={<ServiceIcon />} label="الخدمة" value={bookingResult.service_name} />
              <SummaryRow icon={<CalendarIcon />} label="التاريخ والوقت" value={selectedDate?.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })} sub={selectedTime?.slice(0, 5)} />
              <SummaryRow icon={<MapPin />} label="الفرع" value={branch?.name} />
              <div className="pt-3 border-t border-gray-100 flex justify-between">
                <span className="text-sm font-bold">السعر</span>
                <span className="font-mono font-black text-[var(--accent)]">{Number(bookingResult.price).toLocaleString()} ج</span>
              </div>
              {bookingResult.deposit_required && (
                <div className="pt-3 border-t border-gray-100 text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[#1A2E26]">عربون الجدية (٥٪)</span>
                    <span className="font-mono font-black text-[var(--accent)]">{Number(bookingResult.deposit_egp).toLocaleString()} ج</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">
                    حوّل العربون لتأكيد الحجز على حساب مضمونة — InstaPay: <b className="text-[#1A2E26] font-mono" dir="ltr">5220001000009207</b> (بنك مصر). غير مسترد عند عدم الحضور.
                  </p>
                </div>
              )}
            </div>
            <a href={`https://wa.me/${supplier?.contact_phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`السلام عليكم، أنا ${customerName}، حجزت ${bookingResult.service_name} ${selectedDate?.toLocaleDateString('ar-EG')} الساعة ${selectedTime?.slice(0, 5)}`)}`} target="_blank" rel="noopener" className="block w-full py-3.5 rounded-2xl text-white font-black shadow-lg" style={{ backgroundImage: 'var(--g-cta)' }}>تواصل واتساب مع الفرع</a>
          </div>
        )}
      </main>
    </div>
  )
}

function StepBar({ step, steps = STEP_ORDER }: { step: string; steps?: string[] }) {
  const idx = steps.indexOf(step)
  return (
    <div className="mt-4">
      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: i < idx ? '#ffffff' : i === idx ? 'var(--step-active)' : 'rgba(255,255,255,.25)' }} />
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] font-bold text-white/85">
        {steps.map((s) => <span key={s}>{STEP_LABELS[s]}</span>)}
      </div>
    </div>
  )
}
function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-xs font-bold text-[#6B7280] hover:text-[var(--accent)] flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> ارجع</button>
}
function SummaryRow({ icon, label, value, sub }: any) {
  return <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[#FAFAF7] grid place-items-center text-[var(--accent)]"><div className="w-4 h-4">{icon}</div></div><div className="flex-1 min-w-0"><p className="text-[10px] font-bold uppercase text-[#6B7280]">{label}</p><p className="text-sm font-bold text-[#1A2E26]">{value}</p>{sub && <p className="text-[10px] text-[#6B7280] mt-0.5">{sub}</p>}</div></div>
}
function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div> }
