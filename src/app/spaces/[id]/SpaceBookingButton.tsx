'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

interface PricingItem {
  type: string
  price: number
  period: string
  highlight: boolean
}

interface Props {
  spaceId: string
  pricing: PricingItem[]
}

export default function SpaceBookingButton({ spaceId, pricing }: Props) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<string>('')

  const handleBookNow = () => {
    // Meeting Room uses the real-booking flow with availability calendar +
    // payment (cash on arrival or InstaPay). Other spaces still use the
    // lightweight WhatsApp lead-capture form on /book.
    if (spaceId === 'meeting-room') {
      router.push('/reserve/meeting-room')
      return
    }

    const finalType =
      selectedType ||
      pricing.find((p) => p.highlight)?.type ||
      pricing[0]?.type ||
      ''

    const bookingData = {
      spaceId,
      pricingType: finalType,
    }

    router.push(`/book?space=${encodeURIComponent(JSON.stringify(bookingData))}`)
  }

  if (pricing.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        لا توجد خطط أسعار متاحة حالياً. تواصل معنا للاستفسار.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {pricing.map((p) => {
          const isSelected =
            selectedType === p.type || (selectedType === '' && p.highlight)
          return (
            <button
              key={p.type}
              onClick={() => setSelectedType(p.type)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                isSelected
                  ? 'border-[#1F5F3F] bg-[#1F5F3F]/5'
                  : 'border-gray-100 bg-white hover:border-[#1F5F3F]/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#1F5F3F]">
                    {formatPrice(p.price)}
                  </span>
                  {p.highlight && (
                    <span className="px-2 py-0.5 bg-[#B8860B] text-white text-xs rounded-full font-medium">
                      الأشهر
                    </span>
                  )}
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-[#1F5F3F] bg-[#1F5F3F]'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
              <span className="text-sm text-gray-600 block mt-1">{p.period}</span>
            </button>
          )
        })}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-50">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBookNow}
            className="w-full bg-[#1F5F3F] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1F5F3F]/90 transition-colors shadow-lg"
          >
            احجز الآن
          </button>
        </div>
      </div>
    </>
  )
}
