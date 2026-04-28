'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowRight,
  MessageCircle,
  Phone,
  MapPin,
  CheckCircle,
  User,
  Calendar,
  FileText,
} from 'lucide-react'

type SpaceId = 'indoor-coworking' | 'outdoor-garden' | 'private-office' | 'meeting-room'

const SPACE_NAMES: Record<SpaceId, string> = {
  'indoor-coworking': 'المساحة المشتركة الداخلية',
  'outdoor-garden': 'الجاردن',
  'private-office': 'الأوفيس الخاص',
  'meeting-room': 'غرفة الاجتماعات',
}

const PRICING_TYPE_NAMES: Record<string, string> = {
  hourly: 'بالساعة',
  daily: 'باليوم',
  package: 'باكدج',
  monthly: 'بالشهر',
  'hourly-4': 'بالساعة (٤ أشخاص)',
  'hourly-8': 'بالساعة (٨ أشخاص)',
}

function resolvePricingLabel(type: string | undefined): string {
  if (!type) return ''
  return PRICING_TYPE_NAMES[type] || type
}

interface BookingData {
  spaceId: SpaceId
  pricingType: string
}

// Format the WhatsApp message — gracefully omits empty fields.
function buildWhatsAppMessage(opts: {
  spaceName: string
  pricingName: string
  customerName: string
  customerPhone: string
  preferredDate: string
  notes: string
}): string {
  const lines: string[] = ['أهلاً يا مضمونة', '', 'حابب أحجز:']
  lines.push(`• ${opts.spaceName}`)
  if (opts.pricingName) lines.push(`• ${opts.pricingName}`)

  const hasCustomerInfo =
    opts.customerName.trim() || opts.customerPhone.trim() || opts.preferredDate || opts.notes.trim()

  if (hasCustomerInfo) {
    lines.push('', 'بياناتي:')
    if (opts.customerName.trim()) lines.push(`• الاسم: ${opts.customerName.trim()}`)
    if (opts.customerPhone.trim()) lines.push(`• الموبايل: ${opts.customerPhone.trim()}`)
    if (opts.preferredDate) lines.push(`• التاريخ المفضل: ${opts.preferredDate}`)
    if (opts.notes.trim()) lines.push(`• ملاحظات: ${opts.notes.trim()}`)
  }

  lines.push('', 'ممكن نتواصل لتأكيد التفاصيل؟')
  return lines.join('\n')
}

const WHATSAPP_PHONE = '201002229982'

function BookingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [notes, setNotes] = useState('')

  // Parse booking context from URL
  let bookingData: BookingData | null = null
  try {
    const spaceParam = searchParams.get('space')
    if (spaceParam) {
      const parsed = JSON.parse(decodeURIComponent(spaceParam))
      if (parsed && typeof parsed === 'object' && parsed.spaceId) {
        bookingData = parsed as BookingData
      }
    }
  } catch {
    // Invalid query — fall through to default
  }

  const spaceName = bookingData ? SPACE_NAMES[bookingData.spaceId] || 'مساحة عمل' : 'مساحة عمل'
  const pricingName = bookingData ? resolvePricingLabel(bookingData.pricingType) : ''

  // Build the message text — also exposed as a hidden input on the form,
  // and as the fallback wa.me URL for the manual link below.
  const message = buildWhatsAppMessage({
    spaceName,
    pricingName,
    customerName,
    customerPhone,
    preferredDate,
    notes,
  })
  const fallbackUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`

  // The form's onSubmit fires the lead-save POST in the background. We do NOT
  // call e.preventDefault — letting the form submit naturally is the whole
  // point, because that's the most universally supported navigation mechanism
  // (HTML form action) and can't be blocked by popup blockers, JS errors,
  // navigation interceptors, or async timing issues. The browser performs
  // the navigation to wa.me itself, with no JavaScript involvement.
  const handleSubmit = () => {
    try {
      fetch('/api/booking-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          spaceSlug: bookingData?.spaceId ?? 'unknown',
          pricingLabel: pricingName,
          preferredDate: preferredDate || null,
          notes,
        }),
        keepalive: true,
      }).catch(() => {
        // Silent — never block the form submit
      })
    } catch {
      // Silent
    }
  }

  // Today's date in YYYY-MM-DD format for the date input min
  const todayIso = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
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
          <h1 className="text-lg font-semibold text-gray-900">إكمال الحجز</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 pb-8">
        {/* Booking Summary */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-[#1F5F3F]" />
            <span className="text-xs text-gray-500 font-medium">ملخص حجزك</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{spaceName}</h2>
          {pricingName && (
            <p className="text-sm text-[#B8860B] font-medium">{pricingName}</p>
          )}
        </section>

        {/* Native HTML form: submitting it navigates the browser to
            https://wa.me/{phone}?text={message}. This is the most reliable
            way to trigger navigation across every browser and every popup-
            blocker setting — no JS-driven navigation, no <a target=_blank>,
            no window.open. The hidden `text` input becomes the ?text= query
            param on submission. The lead-save POST is fired in onSubmit. */}
        <form
          action={`https://wa.me/${WHATSAPP_PHONE}`}
          method="get"
          onSubmit={handleSubmit}
          className="space-y-5 mb-6"
        >
          {/* Hidden field — becomes ?text= on the wa.me URL */}
          <input type="hidden" name="text" value={message} />

          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                الاسم
              </span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="اسمك بالكامل"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] transition-colors text-right"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                رقم الموبايل
              </span>
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 14))}
              placeholder="01xxxxxxxxx"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] transition-colors text-right"
              dir="ltr"
              style={{ textAlign: 'right' }}
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                التاريخ المفضل
                <span className="text-xs text-gray-400 font-normal">(اختياري)</span>
              </span>
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              min={todayIso}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] transition-colors text-right"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                ملاحظات
                <span className="text-xs text-gray-400 font-normal">(اختياري)</span>
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية تحب نعرفها"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F] transition-colors text-right resize-none"
            />
          </div>

          {/* Submit button — natively submits the form to wa.me */}
          <button
            type="submit"
            className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white py-4 px-6 rounded-xl font-semibold hover:bg-[#25D366]/90 transition-colors shadow-sm"
          >
            <MessageCircle className="w-5 h-5" />
            <span>تأكيد الحجز عبر واتساب</span>
          </button>
        </form>

        {/* Fallback link (in case form submission is blocked by an extension
            or unusual browser config). Pure <a href> with the same wa.me URL.
            User can long-press to copy the link if all else fails. */}
        <a
          href={fallbackUrl}
          className="block text-center text-xs text-gray-500 hover:text-[#1F5F3F] mb-6 underline"
        >
          مش بيفتح؟ اضغط هنا
        </a>

        {/* Alternate contact */}
        <a
          href="tel:01002229982"
          className="flex items-center justify-center gap-3 w-full bg-[#1F5F3F] text-white py-4 px-6 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 transition-colors shadow-sm mb-6 no-underline"
        >
          <Phone className="w-5 h-5" />
          <span>أو اتصل بنا — 01002229982</span>
        </a>

        {/* Location reminder */}
        <section className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">٧ شارع سليمان، مصر الجديدة</p>
              <p className="text-xs text-gray-600 mt-1">
                متفرع من عبد الحميد بدوي · بجوار Modern School
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  )
}
