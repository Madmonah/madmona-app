'use client'

import { useEffect, useState, useMemo, type ChangeEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowRight,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  Banknote,
  Smartphone,
  Upload,
  CheckCircle,
  Copy,
  AlertCircle,
  MapPin,
  Users,
  Package,
  Sun,
  CalendarRange,
  Building2,
} from 'lucide-react'

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const WHATSAPP_PHONE = '201002229982'
const INSTAPAY_HANDLE = process.env.NEXT_PUBLIC_INSTAPAY_HANDLE || '01002229982'

type PlanId = 'hourly' | 'daily' | 'package_10' | 'monthly'

interface Supplier {
  id: string
  business_name: string
  district: string | null
  address: string | null
  description_ar: string | null
}

interface Unit {
  id: string
  name_ar: string
  description_ar: string | null
  photo_urls: string[]
  capacity: number
  category_slug: string
  price_hourly: number | null
  price_daily: number | null
  price_package_10: number | null
  price_monthly: number | null
  operating_start_hour: number
  operating_end_hour: number
  supplier: Supplier
}

type HourSlot = { hour: number; available: boolean }
const DURATIONS = [1, 2, 3, 4] as const

function buildDateChips(daysAhead: number) {
  const out: Array<{ iso: string; dayName: string; dayNum: string; monthName: string }> = []
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ]
  const today = new Date()
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    out.push({
      iso: `${yyyy}-${mm}-${dd}`,
      dayName: i === 0 ? 'النهاردة' : i === 1 ? 'بكرا' : dayNames[d.getDay()],
      dayNum: String(d.getDate()),
      monthName: monthNames[d.getMonth()],
    })
  }
  return out
}

function hourLabel(h: number): string {
  if (h === 0) return '١٢ ص'
  if (h < 12) return `${h} ص`
  if (h === 12) return '١٢ م'
  return `${h - 12} م`
}

function formatPrice(egp: number): string {
  return `${egp.toLocaleString('ar-EG')} جنيه`
}

export default function UnitDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const unitId = params?.id

  const [unit, setUnit] = useState<Unit | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form state
  const dateChips = useMemo(() => buildDateChips(14), [])
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(dateChips[0].iso)
  const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(1)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_arrival' | 'instapay' | null>(null)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingResult, setBookingResult] = useState<
    { booking_code: string; total_price_egp: number } | null
  >(null)

  const [hours, setHours] = useState<HourSlot[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  const isHourly = selectedPlan === 'hourly'

  // Fetch unit details on mount
  useEffect(() => {
    if (!unitId) return
    setLoading(true)
    fetch(`/api/units/${unitId}`)
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true)
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (data?.unit) setUnit(data.unit)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [unitId])

  // Fetch availability for hourly plan
  useEffect(() => {
    if (!unitId || !isHourly) return
    let cancelled = false
    setLoadingAvailability(true)
    setSelectedStartHour(null)
    fetch(`/api/units/${unitId}/availability?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.hours) setHours(data.hours)
      })
      .catch(() => {
        if (!cancelled) setHours([])
      })
      .finally(() => !cancelled && setLoadingAvailability(false))
    return () => { cancelled = true }
  }, [selectedDate, isHourly, unitId])

  // ---- Pricing ----
  const planRows = useMemo(() => {
    if (!unit) return []
    const rows: Array<{ id: PlanId; label: string; price: number; description: string; icon: typeof Clock }> = []
    if (unit.price_hourly !== null) rows.push({ id: 'hourly', label: 'ساعة', price: unit.price_hourly, description: 'اختار وقتك بدقة', icon: Clock })
    if (unit.price_daily !== null) rows.push({ id: 'daily', label: 'يوم كامل', price: unit.price_daily, description: 'يوم كامل', icon: Sun })
    if (unit.price_package_10 !== null) rows.push({ id: 'package_10', label: 'باكدج ١٠ أيام', price: unit.price_package_10, description: '١٠ أيام في أي وقت', icon: Package })
    if (unit.price_monthly !== null) rows.push({ id: 'monthly', label: 'اشتراك شهري', price: unit.price_monthly, description: 'دخول غير محدود ٣٠ يوم', icon: CalendarRange })
    return rows
  }, [unit])

  const planRow = planRows.find((p) => p.id === selectedPlan)
  const totalPrice = useMemo(() => {
    if (!planRow) return 0
    if (isHourly) return planRow.price * selectedDuration
    return planRow.price
  }, [planRow, isHourly, selectedDuration])

  const spanAvailable = useMemo(() => {
    if (!isHourly) return true
    if (selectedStartHour === null) return false
    for (let h = selectedStartHour; h < selectedStartHour + selectedDuration; h++) {
      const slot = hours.find((s) => s.hour === h)
      if (!slot || !slot.available) return false
    }
    return true
  }, [hours, selectedStartHour, selectedDuration, isHourly])

  const availableDurations = useMemo(() => {
    if (!isHourly || selectedStartHour === null) return DURATIONS
    return DURATIONS.filter((d) => {
      for (let h = selectedStartHour; h < selectedStartHour + d; h++) {
        const slot = hours.find((s) => s.hour === h)
        if (!slot || !slot.available) return false
      }
      return true
    })
  }, [hours, selectedStartHour, isHourly])

  // ---- File upload ----
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('الصورة أكبر من ١٠ ميجا')
      return
    }
    setError(null)
    setUploading(true)
    setPaymentProofUrl(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`
      const { error: uploadErr } = await supabasePublic.storage
        .from('payment-proofs')
        .upload(filename, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw uploadErr
      const { data: pub } = supabasePublic.storage.from('payment-proofs').getPublicUrl(filename)
      setPaymentProofUrl(pub.publicUrl)
    } catch (err) {
      console.error(err)
      setError('حصل خطأ أثناء رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  const canSubmit = useMemo(() => {
    if (!selectedPlan) return false
    if (isHourly && (selectedStartHour === null || !spanAvailable)) return false
    if (customerName.trim().length === 0 || customerPhone.trim().length === 0) return false
    if (paymentMethod === null) return false
    if (paymentMethod === 'instapay' && !paymentProofUrl) return false
    return !submitting && !uploading
  }, [selectedPlan, isHourly, selectedStartHour, spanAvailable, customerName, customerPhone, paymentMethod, paymentProofUrl, submitting, uploading])

  const handleSubmit = async () => {
    if (!canSubmit || !unit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/unit-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.id,
          pricingPlan: selectedPlan,
          bookingDate: selectedDate,
          startHour: isHourly ? selectedStartHour : undefined,
          endHour: isHourly ? selectedStartHour! + selectedDuration : undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim() || null,
          paymentMethod,
          paymentProofUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'حصل خطأ')
        setSubmitting(false)
        return
      }
      setBookingResult({ booking_code: data.booking_code, total_price_egp: data.total_price_egp })
      setSubmitting(false)
    } catch {
      setError('فيه مشكلة في الاتصال')
      setSubmitting(false)
    }
  }

  // ============ Loading / NotFound ============
  if (loading) {
    return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><p className="text-gray-500">جاري التحميل...</p></div>
  }
  if (notFound || !unit) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6" dir="rtl">
        <div className="text-center">
          <p className="text-gray-700 mb-4">المساحة دي مش موجودة</p>
          <Link href="/browse" className="text-[#1F5F3F] underline">عرض كل المساحات</Link>
        </div>
      </div>
    )
  }

  // ============ Success Screen ============
  if (bookingResult) {
    const dateChip = dateChips.find((c) => c.iso === selectedDate)
    const dateLabel = dateChip ? `${dateChip.dayName} ${dateChip.dayNum} ${dateChip.monthName}` : selectedDate
    const timeLine = isHourly && selectedStartHour !== null
      ? `${hourLabel(selectedStartHour)} → ${hourLabel(selectedStartHour + selectedDuration)}`
      : ''

    const waMessage =
      `أهلاً يا مضمونة 👋\n\nحجزت ${unit.name_ar}:\n` +
      `• كود الحجز: ${bookingResult.booking_code}\n` +
      `• المزود: ${unit.supplier?.business_name}\n` +
      `• ${planRow?.label}\n` +
      `• ${dateLabel}\n` +
      (timeLine ? `• ${timeLine}\n` : '') +
      `• ${formatPrice(bookingResult.total_price_egp)}\n` +
      `• ${paymentMethod === 'instapay' ? 'دفع: InstaPay' : 'دفع: عند الوصول'}\n\n` +
      `بياناتي:\n• ${customerName}\n• ${customerPhone}`
    const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(waMessage)}`

    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6 py-8" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-14 h-14 bg-[#1F5F3F]/10 rounded-full mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-[#1F5F3F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">تم تسجيل حجزك</h1>
          <p className="text-sm text-gray-500 text-center mb-6">هنراجع طلبك ونتواصل معاك للتأكيد</p>

          <div className="bg-[#FAFAF7] rounded-xl p-4 mb-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">كود الحجز</span>
              <button onClick={() => navigator.clipboard?.writeText(bookingResult.booking_code)} className="text-xs text-[#1F5F3F] flex items-center gap-1 hover:underline">
                <Copy className="w-3 h-3" /> نسخ
              </button>
            </div>
            <div className="font-mono text-lg font-bold text-gray-900 tracking-wider">{bookingResult.booking_code}</div>
          </div>

          <dl className="space-y-2.5 mb-6 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">المساحة</dt><dd className="text-gray-900 font-medium">{unit.name_ar}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">الخطة</dt><dd className="text-gray-900 font-medium">{planRow?.label}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">التاريخ</dt><dd className="text-gray-900 font-medium">{dateLabel}</dd></div>
            {timeLine && <div className="flex justify-between"><dt className="text-gray-500">الوقت</dt><dd className="text-gray-900 font-medium">{timeLine}</dd></div>}
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <dt className="text-gray-500">الإجمالي</dt>
              <dd className="text-[#1F5F3F] font-bold">{formatPrice(bookingResult.total_price_egp)}</dd>
            </div>
          </dl>

          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-[#25D366]/90 no-underline mb-3">
            <span>ابعت تأكيد على واتساب</span>
          </a>
          <Link href="/browse" className="block text-center text-sm text-gray-500 hover:text-[#1F5F3F]">المساحات التانية</Link>
        </div>
      </div>
    )
  }

  // ============ Booking Form ============
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-[#FAFAF7] border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-full" type="button" aria-label="رجوع">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate px-2">{unit.name_ar}</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 pb-32">
        {/* Hero photo */}
        {unit.photo_urls && unit.photo_urls.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={unit.photo_urls[0]} alt={unit.name_ar} className="w-full h-56 object-cover rounded-2xl mb-5" />
        ) : (
          <div className="w-full h-44 bg-gradient-to-br from-[#1F5F3F]/10 via-[#B8860B]/10 to-[#1F5F3F]/5 rounded-2xl flex items-center justify-center mb-5">
            <span className="text-5xl font-bold text-[#1F5F3F]/30">{unit.name_ar.charAt(0)}</span>
          </div>
        )}

        {/* Title + supplier */}
        <section className="mb-5">
          <h2 className="text-xl font-bold text-gray-900 mb-1">{unit.name_ar}</h2>
          {unit.description_ar && <p className="text-sm text-gray-600 leading-relaxed mb-3">{unit.description_ar}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600 mb-3">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              {unit.supplier?.business_name}
            </span>
            {unit.supplier?.district && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {unit.supplier.district}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              حتى {unit.capacity}
            </span>
          </div>
        </section>

        {/* Plan picker */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">اختار الخطة</h3>
          <div className="space-y-2">
            {planRows.map((p) => {
              const Icon = p.icon
              const selected = selectedPlan === p.id
              return (
                <button key={p.id} type="button" onClick={() => { setSelectedPlan(p.id); setSelectedStartHour(null) }} className={`w-full flex items-center gap-3 p-4 rounded-xl border text-right transition-all ${selected ? 'border-[#1F5F3F] bg-[#1F5F3F]/5 ring-2 ring-[#1F5F3F]/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${selected ? 'bg-[#1F5F3F] text-white' : 'bg-[#1F5F3F]/10 text-[#1F5F3F]'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{p.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
                  </div>
                  <div className="text-sm font-bold text-[#B8860B] whitespace-nowrap">
                    {formatPrice(p.price)}{p.id === 'hourly' ? '/ساعة' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Date */}
        {selectedPlan && (
          <section className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" /> التاريخ
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {dateChips.map((c) => {
                const selected = selectedDate === c.iso
                return (
                  <button key={c.iso} type="button" onClick={() => setSelectedDate(c.iso)} className={`flex-shrink-0 px-3 py-2.5 rounded-xl border min-w-[70px] text-center ${selected ? 'border-[#1F5F3F] bg-[#1F5F3F] text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
                    <div className={`text-xs ${selected ? 'opacity-90' : 'text-gray-500'}`}>{c.dayName}</div>
                    <div className="font-bold text-base">{c.dayNum}</div>
                    <div className={`text-[10px] ${selected ? 'opacity-80' : 'text-gray-400'}`}>{c.monthName}</div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Time slots (hourly only) */}
        {selectedPlan && isHourly && (
          <section className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" /> الوقت
            </h3>
            {loadingAvailability ? (
              <div className="text-sm text-gray-500 py-6 text-center">جاري تحميل الساعات...</div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {hours.map((slot) => {
                  const isStart = selectedStartHour === slot.hour
                  const isInSpan = selectedStartHour !== null && slot.hour > selectedStartHour && slot.hour < selectedStartHour + selectedDuration
                  const showSelected = isStart || isInSpan
                  return (
                    <button key={slot.hour} type="button" disabled={!slot.available} onClick={() => {
                      setSelectedStartHour(slot.hour)
                      const slotsAfter = hours.filter((s) => s.hour >= slot.hour && s.available)
                      let consecutive = 0
                      for (let i = 0; i < slotsAfter.length; i++) {
                        if (slotsAfter[i].hour === slot.hour + i) consecutive++
                        else break
                      }
                      if (selectedDuration > consecutive) setSelectedDuration(Math.max(1, consecutive))
                    }} className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${!slot.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' : showSelected ? 'bg-[#1F5F3F] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                      {hourLabel(slot.hour)}
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* Duration */}
        {selectedPlan && isHourly && selectedStartHour !== null && (
          <section className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">المدة</h3>
            <div className="flex gap-2">
              {DURATIONS.map((d) => {
                const enabled = availableDurations.includes(d)
                const selected = selectedDuration === d
                return (
                  <button key={d} type="button" disabled={!enabled} onClick={() => setSelectedDuration(d)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${!enabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : selected ? 'bg-[#1F5F3F] text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                    {d === 1 ? 'ساعة' : `${d} ساعات`}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Customer info */}
        {selectedPlan && (
          <section className="mb-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" /> الاسم
              </label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="اسمك بالكامل" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-right" autoComplete="name" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" /> رقم الموبايل
              </label>
              <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 14))} placeholder="01xxxxxxxxx" className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]" dir="ltr" style={{ textAlign: 'right' }} autoComplete="tel" inputMode="tel" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" /> ملاحظات <span className="text-xs text-gray-400 font-normal">(اختياري)</span>
              </label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي تفاصيل إضافية" rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] text-right resize-none" />
            </div>
          </section>
        )}

        {/* Payment */}
        {selectedPlan && (
          <section className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">طريقة الدفع</h3>
            <div className="space-y-2">
              <button type="button" onClick={() => setPaymentMethod('cash_on_arrival')} className={`w-full flex items-center gap-3 p-4 rounded-xl border text-right ${paymentMethod === 'cash_on_arrival' ? 'border-[#1F5F3F] bg-[#1F5F3F]/5 ring-2 ring-[#1F5F3F]/20' : 'border-gray-200 bg-white'}`}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1F5F3F]/10 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-[#1F5F3F]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">الدفع عند الوصول</div>
                  <div className="text-xs text-gray-500 mt-0.5">كاش لما تيجي</div>
                </div>
              </button>
              <button type="button" onClick={() => setPaymentMethod('instapay')} className={`w-full flex items-center gap-3 p-4 rounded-xl border text-right ${paymentMethod === 'instapay' ? 'border-[#1F5F3F] bg-[#1F5F3F]/5 ring-2 ring-[#1F5F3F]/20' : 'border-gray-200 bg-white'}`}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#B8860B]/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-[#B8860B]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">InstaPay</div>
                  <div className="text-xs text-gray-500 mt-0.5">حوّل وارفع صورة</div>
                </div>
              </button>
            </div>
          </section>
        )}

        {paymentMethod === 'instapay' && (
          <section className="mb-6 bg-[#B8860B]/5 border border-[#B8860B]/20 rounded-xl p-4">
            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
              حوّل <span className="font-bold text-[#1F5F3F]">{formatPrice(totalPrice)}</span> على InstaPay لـ:
            </p>
            <div className="bg-white rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="font-mono font-semibold text-gray-900" dir="ltr">{INSTAPAY_HANDLE}</span>
              <button onClick={() => navigator.clipboard?.writeText(INSTAPAY_HANDLE)} className="text-xs text-[#1F5F3F] flex items-center gap-1">
                <Copy className="w-3 h-3" /> نسخ
              </button>
            </div>
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-500" /> صورة التحويل
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} disabled={uploading} className="block w-full text-sm text-gray-500 file:ml-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1F5F3F]/10 file:text-[#1F5F3F] disabled:opacity-50" />
              {uploading && <p className="text-xs text-gray-500 mt-2">جاري رفع الصورة...</p>}
              {paymentProofUrl && !uploading && (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#1F5F3F]">
                  <CheckCircle className="w-4 h-4" /> <span>تم رفع الصورة</span>
                </div>
              )}
            </label>
          </section>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </main>

      {selectedPlan && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-40">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-500">الإجمالي</div>
              <div className="text-lg font-bold text-[#1F5F3F]">{formatPrice(totalPrice)}</div>
            </div>
            <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="flex-1 bg-[#1F5F3F] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
