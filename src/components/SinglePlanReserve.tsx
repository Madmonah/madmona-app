'use client'

import { useMemo, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowRight,
  Calendar,
  User,
  Phone,
  FileText,
  Banknote,
  Smartphone,
  Upload,
  CheckCircle,
  Copy,
  AlertCircle,
} from 'lucide-react'

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const WHATSAPP_PHONE = '201002229982'
const INSTAPAY_HANDLE = process.env.NEXT_PUBLIC_INSTAPAY_HANDLE || '01002229982'

// ============================================================
// Generic single-plan booking flow.
// Used for spaces with one fixed-rate option:
//   - outdoor-garden (daily, 65 EGP)
//   - private-office (monthly, 12000 EGP)
// Customer just picks a date and pays — no time slots needed.
// ============================================================

export interface SinglePlanReserveProps {
  spaceSlug: string
  spaceName: string
  pricingPlan: 'daily' | 'monthly'
  price: number
  unitLabel: string         // e.g. "يوم", "شهر"
  description: string       // Subtitle shown under the heading
  dateLabel: string         // e.g. "تاريخ الحضور" or "تاريخ بداية الاشتراك"
}

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

function formatPrice(egp: number): string {
  return `${egp.toLocaleString('ar-EG')} جنيه`
}

export default function SinglePlanReserve(props: SinglePlanReserveProps) {
  const router = useRouter()
  const dateChips = useMemo(() => buildDateChips(30), [])

  const [selectedDate, setSelectedDate] = useState<string>(dateChips[0].iso)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] =
    useState<'cash_on_arrival' | 'instapay' | null>(null)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingResult, setBookingResult] = useState<
    { booking_code: string; total_price_egp: number } | null
  >(null)

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('الصورة أكبر من ١٠ ميجا، اختار صورة أصغر')
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
      const { data: pub } = supabasePublic.storage
        .from('payment-proofs')
        .getPublicUrl(filename)
      setPaymentProofUrl(pub.publicUrl)
    } catch (err) {
      console.error('upload error', err)
      const msg = err instanceof Error ? err.message
        : (err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message)
        : 'حصل خطأ أثناء رفع الصورة، حاول تاني'
      setError(`فشل رفع الصورة: ${msg}`)
    } finally {
      setUploading(false)
    }
  }

  const canSubmit =
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    paymentMethod !== null &&
    (paymentMethod === 'cash_on_arrival' || paymentProofUrl !== null) &&
    !submitting &&
    !uploading

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceSlug: props.spaceSlug,
          pricingPlan: props.pricingPlan,
          bookingDate: selectedDate,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim() || null,
          paymentMethod,
          paymentProofUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'حصل خطأ، حاول تاني')
        setSubmitting(false)
        return
      }
      setBookingResult({
        booking_code: data.booking_code,
        total_price_egp: data.total_price_egp,
      })
      setSubmitting(false)
    } catch (err) {
      console.error('submit error', err)
      const msg = err instanceof Error ? err.message
        : (err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message)
        : 'فيه مشكلة في الاتصال، حاول تاني'
      setError(`فشل الاتصال: ${msg}`)
      setSubmitting(false)
    }
  }

  if (bookingResult) {
    const dateChip = dateChips.find((c) => c.iso === selectedDate)
    const dateLbl = dateChip
      ? `${dateChip.dayName} ${dateChip.dayNum} ${dateChip.monthName}`
      : selectedDate

    const waMessage =
      `أهلاً يا مضمونة 👋\n\n` +
      `حجزت ${props.spaceName}:\n` +
      `• كود الحجز: ${bookingResult.booking_code}\n` +
      `• ${props.unitLabel}\n` +
      `• ${dateLbl}\n` +
      `• ${formatPrice(bookingResult.total_price_egp)}\n` +
      `• ${paymentMethod === 'instapay' ? 'دفع: InstaPay (مرفوع)' : 'دفع: عند الوصول'}\n\n` +
      `بياناتي:\n` +
      `• ${customerName}\n` +
      `• ${customerPhone}`
    const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(waMessage)}`

    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6 py-8" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-14 h-14 bg-[#1F6F5F]/10 rounded-full mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-[#1F6F5F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">تم تسجيل حجزك</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            هنراجع طلبك ونتواصل معاك للتأكيد على واتساب
          </p>
          <div className="bg-[#FAFAF7] rounded-xl p-4 mb-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">كود الحجز</span>
              <button
                onClick={() => navigator.clipboard?.writeText(bookingResult.booking_code)}
                className="text-xs text-[#1F6F5F] flex items-center gap-1 hover:underline"
              >
                <Copy className="w-3 h-3" />
                نسخ
              </button>
            </div>
            <div className="font-mono text-lg font-bold text-gray-900 tracking-wider">
              {bookingResult.booking_code}
            </div>
          </div>
          <dl className="space-y-2.5 mb-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">المساحة</dt>
              <dd className="text-gray-900 font-medium">{props.spaceName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{props.dateLabel}</dt>
              <dd className="text-gray-900 font-medium">{dateLbl}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <dt className="text-gray-500">الإجمالي</dt>
              <dd className="text-[#1F6F5F] font-bold">
                {formatPrice(bookingResult.total_price_egp)}
              </dd>
            </div>
          </dl>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-[#25D366]/90 no-underline mb-3"
          >
            <span>ابعت تأكيد على واتساب</span>
          </a>
          <Link href="/" className="block text-center text-sm text-gray-500 hover:text-[#1F6F5F]">
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-[#FAFAF7] border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors"
            aria-label="رجوع"
            type="button"
          >
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">احجز {props.spaceName}</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 pb-32">
        {/* Plan card (single, fixed) */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <p className="text-xs text-gray-500 mb-1">{props.spaceName}</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{formatPrice(props.price)}</h2>
          <p className="text-sm text-gray-600">{props.description}</p>
        </section>

        {/* Date */}
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            {props.dateLabel}
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scroll-smooth">
            {dateChips.map((c) => {
              const selected = selectedDate === c.iso
              return (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => setSelectedDate(c.iso)}
                  className={`flex-shrink-0 px-3 py-2.5 rounded-xl border min-w-[70px] text-center transition-colors ${
                    selected
                      ? 'border-[#1F6F5F] bg-[#1F6F5F] text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <div className={`text-xs ${selected ? 'opacity-90' : 'text-gray-500'}`}>
                    {c.dayName}
                  </div>
                  <div className="font-bold text-base">{c.dayNum}</div>
                  <div className={`text-[10px] ${selected ? 'opacity-80' : 'text-gray-400'}`}>
                    {c.monthName}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Customer info */}
        <section className="mb-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              الاسم
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="اسمك بالكامل"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30 focus:border-[#1F6F5F] text-right"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              رقم الموبايل
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) =>
                setCustomerPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 14))
              }
              placeholder="01xxxxxxxxx"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30 focus:border-[#1F6F5F]"
              dir="ltr"
              style={{ textAlign: 'right' }}
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              ملاحظات <span className="text-xs text-gray-400 font-normal">(اختياري)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية"
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6F5F]/30 focus:border-[#1F6F5F] text-right resize-none"
            />
          </div>
        </section>

        {/* Payment */}
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">طريقة الدفع</h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash_on_arrival')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-right transition-colors ${
                paymentMethod === 'cash_on_arrival'
                  ? 'border-[#1F6F5F] bg-[#1F6F5F]/5 ring-2 ring-[#1F6F5F]/20'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1F6F5F]/10 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-[#1F6F5F]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">الدفع عند الوصول</div>
                <div className="text-xs text-gray-500 mt-0.5">كاش لما تيجي</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('instapay')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-right transition-colors ${
                paymentMethod === 'instapay'
                  ? 'border-[#1F6F5F] bg-[#1F6F5F]/5 ring-2 ring-[#1F6F5F]/20'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#2FA084]/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#2FA084]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">InstaPay</div>
                <div className="text-xs text-gray-500 mt-0.5">حوّل وارفع صورة</div>
              </div>
            </button>
          </div>
        </section>

        {paymentMethod === 'instapay' && (
          <section className="mb-6 bg-[#2FA084]/5 border border-[#2FA084]/20 rounded-xl p-4">
            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
              حوّل <span className="font-bold text-[#1F6F5F]">{formatPrice(props.price)}</span>{' '}
              على InstaPay لـ:
            </p>
            <div className="bg-white rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="font-mono font-semibold text-gray-900" dir="ltr">
                {INSTAPAY_HANDLE}
              </span>
              <button
                onClick={() => navigator.clipboard?.writeText(INSTAPAY_HANDLE)}
                className="text-xs text-[#1F6F5F] flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                نسخ
              </button>
            </div>
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-500" />
                صورة التحويل
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:ml-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1F6F5F]/10 file:text-[#1F6F5F] disabled:opacity-50"
              />
              {uploading && <p className="text-xs text-gray-500 mt-2">جاري رفع الصورة...</p>}
              {paymentProofUrl && !uploading && (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#1F6F5F]">
                  <CheckCircle className="w-4 h-4" />
                  <span>تم رفع الصورة</span>
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

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-40">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500">الإجمالي</div>
            <div className="text-lg font-bold text-[#1F6F5F]">{formatPrice(props.price)}</div>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 bg-[#1F6F5F] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#1F6F5F]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
          </button>
        </div>
      </div>
    </div>
  )
}
