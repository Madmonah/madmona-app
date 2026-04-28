'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowRight, MessageCircle, Phone, MapPin, CheckCircle } from 'lucide-react'

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

interface BookingData {
  spaceId: SpaceId
  pricingType: string
}

function BookingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  let bookingData: BookingData | null = null
  try {
    const spaceParam = searchParams.get('space')
    if (spaceParam) {
      const parsed = JSON.parse(decodeURIComponent(spaceParam))
      if (parsed && typeof parsed === 'object' && parsed.spaceId) {
        bookingData = parsed as BookingData
      }
    }
  } catch (e) {
    // Invalid query — fall through to default
  }

  const spaceName = bookingData ? SPACE_NAMES[bookingData.spaceId] || 'مساحة عمل' : 'مساحة عمل'
  const pricingName = bookingData ? PRICING_TYPE_NAMES[bookingData.pricingType] || '' : ''

  const whatsappMessage = encodeURIComponent(
    `أهلاً يا مضمونة 👋\n\nحابب أحجز:\n• ${spaceName}${pricingName ? `\n• ${pricingName}` : ''}\n\nممكن نتواصل لتأكيد التفاصيل والموعد؟`
  )
  const whatsappUrl = `https://wa.me/201002229982?text=${whatsappMessage}`

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-[#FAFAF7] border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors"
            aria-label="رجوع"
          >
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">إكمال الحجز</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 pb-20">
        {/* Booking Summary */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-[#1F5F3F]" />
            <span className="text-xs text-gray-500 font-medium">ملخص حجزك</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{spaceName}</h2>
          {pricingName && (
            <p className="text-sm text-[#B8860B] font-medium mb-3">{pricingName}</p>
          )}
          <p className="text-sm text-gray-600 leading-relaxed">
            عشان نأكدلك حجزك، تواصل معانا مباشرة على واتساب أو اتصل بنا.
            هنرجعلك في خلال دقايق ونأكدلك التوقيت والتفاصيل.
          </p>
        </section>

        {/* CTA Buttons */}
        <section className="space-y-3 mb-8">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white py-4 px-6 rounded-xl font-semibold hover:bg-[#25D366]/90 transition-colors shadow-sm"
          >
            <MessageCircle className="w-5 h-5" />
            <span>تأكيد الحجز عبر واتساب</span>
          </a>

          <a
            href="tel:01002229982"
            className="flex items-center justify-center gap-3 w-full bg-[#1F5F3F] text-white py-4 px-6 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 transition-colors shadow-sm"
          >
            <Phone className="w-5 h-5" />
            <span>اتصل بنا — 01002229982</span>
          </a>
        </section>

        {/* Location reminder */}
        <section className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">٧ شارع سليمان، مصر الجديدة</p>
              <p className="text-xs text-gray-600 mt-1">متفرع من عبد الحميد بدوي · بجوار Modern School</p>
            </div>
          </div>
        </section>

        {/* Coming soon notice */}
        <div className="p-4 bg-[#B8860B]/10 border border-[#B8860B]/20 rounded-xl">
          <p className="text-xs text-gray-700 leading-relaxed text-center">
            🚧 نظام الحجز الأوتوماتيكي قريباً — حالياً بنأكد الحجوزات شخصياً عشان نضمن جودة الخدمة لكل عميل
          </p>
        </div>
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
