'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Clock, Users, Wifi, Coffee, Car, Shield, CheckCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

// Mock data for spaces - in real app, fetch from Supabase
const spacesData = {
  'indoor-coworking': {
    id: 'indoor-coworking',
    name: 'كوركينغ داخلي',
    description: 'مساحة عمل مشتركة مريحة ومجهزة بكل ما تحتاجه للإنتاجية',
    hero: '/images/indoor-hero.jpg',
    amenities: [
      { icon: Wifi, name: 'واي فاي عالي السرعة' },
      { icon: Coffee, name: 'قهوة ومشروبات مجانية' },
      { icon: Car, name: 'مواقف سيارات' },
      { icon: Shield, name: 'أمان ٢٤/٧' }
    ],
    pricing: [
      { type: 'hourly', price: 50, period: 'الساعة', highlight: false },
      { type: 'daily', price: 120, period: 'اليوم', highlight: true },
      { type: 'package', price: 900, period: '١٠ أيام', highlight: false },
      { type: 'monthly', price: 2000, period: 'الشهر', highlight: false }
    ],
    features: [
      'مكاتب مريحة ومقاعد مريحة',
      'إضاءة طبيعية ممتازة', 
      'مساحة هادئة للتركيز',
      'طابعات ومعدات مكتبية'
    ]
  },
  'outdoor-garden': {
    id: 'outdoor-garden',
    name: 'حديقة خارجية',
    description: 'اشتغل في الهواء الطلق وسط الخضرة والهدوء',
    hero: '/images/outdoor-hero.jpg',
    amenities: [
      { icon: Wifi, name: 'واي فاي قوي في الحديقة' },
      { icon: Coffee, name: 'كافيه أوتدور' },
      { icon: Car, name: 'مواقف مجانية' },
      { icon: Shield, name: 'حراسة مستمرة' }
    ],
    pricing: [
      { type: 'daily', price: 65, period: 'اليوم', highlight: true }
    ],
    features: [
      'جلسات مريحة وسط النباتات',
      'هواء نقي ومنظر طبيعي',
      'مساحة مفتوحة للإبداع',
      'إضاءة ليلية مميزة'
    ]
  },
  'private-office': {
    id: 'private-office',
    name: 'مكتب خاص',
    description: 'مكتبك الخاص بخصوصية تامة ومرونة كاملة',
    hero: '/images/private-hero.jpg',
    amenities: [
      { icon: Wifi, name: 'إنترنت مخصص عالي السرعة' },
      { icon: Users, name: 'مساحة تسع ٤ أشخاص' },
      { icon: Car, name: 'موقف مخصص' },
      { icon: Shield, name: 'دخول ٢٤/٧ بالكارت' }
    ],
    pricing: [
      { type: 'monthly', price: 12000, period: 'الشهر', highlight: true }
    ],
    features: [
      'مكتب مغلق بخصوصية كاملة',
      'تكييف منفصل قابل للتحكم',
      'خزانة مغلقة للأوراق المهمة',
      'مساحة استقبال صغيرة'
    ]
  },
  'meeting-room': {
    id: 'meeting-room',
    name: 'قاعة اجتماعات',
    description: 'قاعة مجهزة للاجتماعات والعروض التقديمية',
    hero: '/images/meeting-hero.jpg', 
    amenities: [
      { icon: Users, name: 'تسع حتى ٨ أشخاص' },
      { icon: Wifi, name: 'واي فاي مخصص' },
      { icon: Shield, name: 'عزل صوتي كامل' },
      { icon: Clock, name: 'حجز بالساعة' }
    ],
    pricing: [
      { type: 'hourly-4', price: 300, period: 'الساعة (٤ أشخاص)', highlight: false },
      { type: 'hourly-8', price: 500, period: 'الساعة (٨ أشخاص)', highlight: true }
    ],
    features: [
      'طاولة اجتماعات مريحة',
      'إضاءة طبيعية مع ستائر',
      'مساحة عرض للعروض التقديمية',
      'خصوصية وهدوء كامل'
    ]
  }
}

export default function SpaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [selectedPricing, setSelectedPricing] = useState<string>('')
  
  const spaceId = params.id as string
  const space = spacesData[spaceId as keyof typeof spacesData]

  // If space not found, redirect to home
  if (!space) {
    router.push('/')
    return null
  }

  const handleBookNow = () => {
    if (!selectedPricing) {
      // Auto-select highlighted pricing if none selected
      const highlighted = space.pricing.find(p => p.highlight)
      if (highlighted) {
        setSelectedPricing(highlighted.type)
      }
    }
    
    // Navigate to booking flow with space and pricing info
    const bookingData = {
      spaceId: space.id,
      pricingType: selectedPricing || space.pricing.find(p => p.highlight)?.type || space.pricing[0].type
    }
    
    router.push(`/book?space=${encodeURIComponent(JSON.stringify(bookingData))}`)
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-green-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-50 transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{space.name}</h1>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-64 bg-gradient-to-br from-primary/20 to-accent/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-3 mx-auto">
              <span className="text-2xl">{space.id === 'indoor-coworking' ? '💻' : space.id === 'outdoor-garden' ? '🌿' : space.id === 'private-office' ? '🏢' : '👥'}</span>
            </div>
            <h2 className="text-xl font-bold text-primary mb-1">{space.name}</h2>
            <p className="text-sm text-gray-600 px-8">{space.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-20">
        {/* Amenities */}
        <section className="py-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">المميزات</h3>
          <div className="grid grid-cols-2 gap-3">
            {space.amenities.map((amenity, index) => (
              <div key={index} className="flex items-center space-x-3 space-x-reverse p-3 bg-white rounded-xl border border-gray-100">
                <amenity.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{amenity.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">تفاصيل المساحة</h3>
          <div className="space-y-2">
            {space.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 space-x-reverse">
                <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="py-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">أسعار الاشتراك</h3>
          <div className="space-y-3">
            {space.pricing.map((pricing, index) => (
              <button
                key={pricing.type}
                onClick={() => setSelectedPricing(pricing.type)}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  selectedPricing === pricing.type || (selectedPricing === '' && pricing.highlight)
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-100 bg-white hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 space-x-reverse mb-1">
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(pricing.price)}
                      </span>
                      {pricing.highlight && (
                        <span className="px-2 py-0.5 bg-accent text-white text-xs rounded-full font-medium">
                          الأشهر
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{pricing.period}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPricing === pricing.type || (selectedPricing === '' && pricing.highlight)
                      ? 'border-primary bg-primary' 
                      : 'border-gray-300'
                  }`}>
                    {(selectedPricing === pricing.type || (selectedPricing === '' && pricing.highlight)) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Free Trial Banner */}
        <div className="my-6 p-4 bg-gradient-to-l from-accent/10 to-primary/5 rounded-xl border border-accent/20">
          <div className="flex items-center justify-center space-x-2 space-x-reverse">
            <span className="text-lg">🎉</span>
            <span className="text-sm font-bold text-gray-800">يومك الأول مجاناً!</span>
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBookNow}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg"
          >
            احجز الآن
          </button>
        </div>
      </div>
    </div>
  )
}
